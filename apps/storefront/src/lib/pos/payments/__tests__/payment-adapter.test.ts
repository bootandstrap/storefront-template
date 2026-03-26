/**
 * Payment Adapter Tests
 *
 * Tests for the unified payment adapter routing logic.
 * Mocks the Stripe Terminal and Twint handlers.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { charge, isTerminalState, getProcessingLabel } from '../payment-adapter'
import type { PaymentProcessingState } from '@/lib/pos/pos-config'

// ---------------------------------------------------------------------------
// Mock the lazy-loaded handlers
// ---------------------------------------------------------------------------

const mockProcessTerminal = vi.fn()
const mockProcessTwint = vi.fn()

vi.mock('../stripe-terminal', () => ({
    processTerminalPayment: (...args: unknown[]) => mockProcessTerminal(...args),
}))

vi.mock('../twint-payment', () => ({
    processTwintPayment: (...args: unknown[]) => mockProcessTwint(...args),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Payment Adapter — charge()', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('handles cash payments immediately (no Stripe)', async () => {
        const result = await charge({
            amount: 2500,
            currency: 'chf',
            method: 'cash',
        })

        expect(result.success).toBe(true)
        expect(mockProcessTerminal).not.toHaveBeenCalled()
        expect(mockProcessTwint).not.toHaveBeenCalled()
    })

    it('handles manual_card payments immediately (record-only)', async () => {
        const result = await charge({
            amount: 1500,
            currency: 'chf',
            method: 'manual_card',
        })

        expect(result.success).toBe(true)
        expect(mockProcessTerminal).not.toHaveBeenCalled()
        expect(mockProcessTwint).not.toHaveBeenCalled()
    })

    it('routes card_terminal to Stripe Terminal handler', async () => {
        mockProcessTerminal.mockResolvedValue({
            success: false,
            requires_action: 'present_card',
            action_data: {
                reader_display: 'CHF 25.00',
                payment_intent_id: 'pi_test_123',
            },
        })

        const result = await charge({
            amount: 2500,
            currency: 'chf',
            method: 'card_terminal',
            reader_id: 'tmr_test_reader',
            metadata: { source: 'pos' },
        })

        expect(mockProcessTerminal).toHaveBeenCalledWith({
            amount: 2500,
            currency: 'chf',
            reader_id: 'tmr_test_reader',
            metadata: expect.objectContaining({ source: 'pos' }),
        })
        expect(result.requires_action).toBe('present_card')
        expect(result.action_data?.payment_intent_id).toBe('pi_test_123')
    })

    it('requires reader_id for card_terminal', async () => {
        const result = await charge({
            amount: 2500,
            currency: 'chf',
            method: 'card_terminal',
            // no reader_id
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('reader')
        expect(mockProcessTerminal).not.toHaveBeenCalled()
    })

    it('routes twint to Twint handler', async () => {
        mockProcessTwint.mockResolvedValue({
            success: false,
            requires_action: 'scan_qr',
            action_data: {
                qr_url: 'https://stripe.com/twint/qr/abc',
                expires_at: '2026-03-21T18:00:00Z',
                payment_intent_id: 'pi_twint_456',
            },
        })

        const result = await charge({
            amount: 3000,
            currency: 'chf',
            method: 'twint',
        })

        expect(mockProcessTwint).toHaveBeenCalledWith({
            amount: 3000,
            currency: 'chf',
            metadata: expect.objectContaining({ source: 'pos' }),
        })
        expect(result.requires_action).toBe('scan_qr')
        expect(result.action_data?.qr_url).toContain('twint')
    })

    it('returns error for unknown payment method', async () => {
        const result = await charge({
            amount: 1000,
            currency: 'chf',
            method: 'bitcoin' as never,
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('Unknown')
    })
})

describe('Payment Adapter — State Helpers', () => {
    it('identifies terminal states correctly', () => {
        expect(isTerminalState({ status: 'idle' })).toBe(true)
        expect(isTerminalState({ status: 'succeeded', payment_intent_id: 'pi_x' })).toBe(true)
        expect(isTerminalState({ status: 'failed', error: 'err' })).toBe(true)
        expect(isTerminalState({ status: 'cancelled' })).toBe(true)

        expect(isTerminalState({ status: 'creating_intent' })).toBe(false)
        expect(isTerminalState({ status: 'awaiting_card', reader_display: '' })).toBe(false)
        expect(isTerminalState({ status: 'processing' })).toBe(false)
    })

    it('returns labels for all processing states', () => {
        const labels: Record<string, string> = {}

        const states: PaymentProcessingState[] = [
            { status: 'idle' },
            { status: 'creating_intent' },
            { status: 'awaiting_card', reader_display: '' },
            { status: 'awaiting_twint_scan', qr_url: '', expires_at: '', payment_intent_id: '' },
            { status: 'processing' },
            { status: 'succeeded', payment_intent_id: '' },
            { status: 'failed', error: 'Connection error' },
            { status: 'cancelled' },
        ]

        states.forEach(state => {
            const label = getProcessingLabel(state, labels)
            // Every state should return a string (may be empty for idle)
            expect(typeof label).toBe('string')
        })

        // Failed should show specific error
        const failedLabel = getProcessingLabel({ status: 'failed', error: 'Test error' }, labels)
        expect(failedLabel).toBe('Test error')
    })
})

describe('Payment Adapter — POS Config Types', () => {
    it('has 4 payment methods defined', async () => {
        const { PAYMENT_METHODS } = await import('@/lib/pos/pos-config')
        expect(PAYMENT_METHODS).toHaveLength(4)

        const keys = PAYMENT_METHODS.map(m => m.key)
        expect(keys).toContain('cash')
        expect(keys).toContain('card_terminal')
        expect(keys).toContain('twint')
        expect(keys).toContain('manual_card')
    })

    it('each payment method has minTier', async () => {
        const { PAYMENT_METHODS } = await import('@/lib/pos/pos-config')
        PAYMENT_METHODS.forEach(m => {
            expect(['basic', 'pro', 'enterprise']).toContain(m.minTier)
        })
    })

    it('cash and manual_card are basic tier', async () => {
        const { PAYMENT_METHODS } = await import('@/lib/pos/pos-config')
        const cash = PAYMENT_METHODS.find(m => m.key === 'cash')
        const manual = PAYMENT_METHODS.find(m => m.key === 'manual_card')
        expect(cash?.minTier).toBe('basic')
        expect(manual?.minTier).toBe('basic')
    })

    it('card_terminal is pro tier', async () => {
        const { PAYMENT_METHODS } = await import('@/lib/pos/pos-config')
        const terminal = PAYMENT_METHODS.find(m => m.key === 'card_terminal')
        expect(terminal?.minTier).toBe('pro')
    })

    it('twint is enterprise tier', async () => {
        const { PAYMENT_METHODS } = await import('@/lib/pos/pos-config')
        const twint = PAYMENT_METHODS.find(m => m.key === 'twint')
        expect(twint?.minTier).toBe('enterprise')
    })
})
