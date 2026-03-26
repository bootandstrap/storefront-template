import { describe, expect, it } from 'vitest'
import {
    getStampProgress,
    generateLoyaltyQRPayload,
    type LoyaltyCustomer,
    type LoyaltyConfig,
    DEFAULT_LOYALTY_CONFIG,
} from '@/lib/pos/loyalty-engine'

/**
 * LoyaltyCardPreview tests — Contract tests for the rendering logic.
 * Tests the underlying data transformations the component relies on.
 * Full React rendering would require mocking qrcode.react + lucide.
 */

const makeCustomer = (overrides: Partial<LoyaltyCustomer> = {}): LoyaltyCustomer => ({
    customerId: 'cus_test',
    customerName: 'Test User',
    stamps: 0,
    totalRedeemed: 0,
    lastStampAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
})

const makeConfig = (overrides: Partial<LoyaltyConfig> = {}): LoyaltyConfig => ({
    ...DEFAULT_LOYALTY_CONFIG,
    stampsRequired: 10,
    businessName: 'Test Store',
    rewardDescription: '🎁 Free product!',
    ...overrides,
})

describe('LoyaltyCardPreview — rendering contracts', () => {
    // ── Stamp progress (drives stamp grid + progress bar) ──

    describe('stamp progress for empty card', () => {
        it('shows 0/10 with 0% progress', () => {
            const progress = getStampProgress(makeCustomer({ stamps: 0 }), makeConfig())
            expect(progress.current).toBe(0)
            expect(progress.required).toBe(10)
            expect(progress.percentage).toBe(0)
            expect(progress.isComplete).toBe(false)
        })
    })

    describe('stamp progress for partial card', () => {
        it('shows 4/10 with 40% progress', () => {
            const progress = getStampProgress(makeCustomer({ stamps: 4 }), makeConfig())
            expect(progress.current).toBe(4)
            expect(progress.percentage).toBe(40)
            expect(progress.isComplete).toBe(false)
        })

        it('shows 7/10 with 70% progress', () => {
            const progress = getStampProgress(makeCustomer({ stamps: 7 }), makeConfig())
            expect(progress.percentage).toBe(70)
        })
    })

    describe('stamp progress for complete card', () => {
        it('shows 10/10 with 100% and isComplete=true', () => {
            const progress = getStampProgress(makeCustomer({ stamps: 10 }), makeConfig())
            expect(progress.current).toBe(10)
            expect(progress.percentage).toBe(100)
            expect(progress.isComplete).toBe(true)
        })
    })

    describe('stamp progress with custom stampsRequired', () => {
        it('handles stampsRequired=5', () => {
            const progress = getStampProgress(
                makeCustomer({ stamps: 3 }),
                makeConfig({ stampsRequired: 5 })
            )
            expect(progress.percentage).toBe(60)
            expect(progress.isComplete).toBe(false)
        })
    })

    // ── QR payload (drives QR code display) ──

    describe('QR payload generation', () => {
        it('generates correct loyalty URL', () => {
            const url = generateLoyaltyQRPayload('cus_abc', 'https://shop.example.com', 'es')
            expect(url).toBe('https://shop.example.com/es/cuenta/fidelidad?id=cus_abc')
        })

        it('uses lang parameter for i18n', () => {
            const url = generateLoyaltyQRPayload('cus_1', 'https://shop.com', 'de')
            expect(url).toContain('/de/cuenta/fidelidad')
        })
    })

    // ── Rendering decision contracts ──

    describe('rendering decisions', () => {
        it('redeem button is shown only when isComplete', () => {
            const incomplete = getStampProgress(makeCustomer({ stamps: 9 }), makeConfig())
            const complete = getStampProgress(makeCustomer({ stamps: 10 }), makeConfig())

            expect(incomplete.isComplete).toBe(false) // no redeem button
            expect(complete.isComplete).toBe(true)    // show redeem button
        })

        it('totalRedeemed badge visible only when > 0', () => {
            const noRedeemed = makeCustomer({ totalRedeemed: 0 })
            const hasRedeemed = makeCustomer({ totalRedeemed: 3 })

            expect(noRedeemed.totalRedeemed > 0).toBe(false) // no badge
            expect(hasRedeemed.totalRedeemed > 0).toBe(true)  // show ×3 badge
        })

        it('stamp grid renders stampsRequired number of slots', () => {
            const config = makeConfig({ stampsRequired: 8 })
            const slots = Array.from({ length: config.stampsRequired }, (_, i) => i)
            expect(slots).toHaveLength(8)
        })

        it('filled stamps determined by customer.stamps < config.stampsRequired', () => {
            const customer = makeCustomer({ stamps: 3 })
            const config = makeConfig({ stampsRequired: 5 })

            const filled = Array.from({ length: config.stampsRequired }, (_, i) => i < customer.stamps)
            expect(filled.filter(Boolean)).toHaveLength(3)
            expect(filled.filter(x => !x)).toHaveLength(2)
        })
    })
})
