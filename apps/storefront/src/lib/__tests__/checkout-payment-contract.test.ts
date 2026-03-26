/**
 * Checkout Payment Contract Tests
 *
 * Validates that the payment method system is correctly wired:
 * - getEnabledMethods respects feature flags and plan limits
 * - Payment method types are properly exported
 *
 * v0.1 Release Gate — must pass before professional development begins.
 */

import { describe, it, expect } from 'vitest'
import { getEnabledMethods, type PaymentMethod } from '../payment-methods'
import type { FeatureFlags, PlanLimits } from '../config'

// All payment flags ON
const allFlagsOn = {
    enable_whatsapp_checkout: true,
    enable_online_payments: true,
    enable_cash_on_delivery: true,
    enable_bank_transfer: true,
} as FeatureFlags

// Create partial flags
function flagsWith(overrides: Partial<FeatureFlags>): FeatureFlags {
    return { ...allFlagsOn, ...overrides } as FeatureFlags
}

describe('Checkout Payment Contract', () => {
    // ── getEnabledMethods returns methods ──

    it('returns all 4 payment methods when all flags are on', () => {
        const methods = getEnabledMethods(allFlagsOn)
        expect(methods).toHaveLength(4)
    })

    it('method objects have required properties', () => {
        const methods = getEnabledMethods(allFlagsOn)
        for (const m of methods) {
            expect(m.id).toBeTruthy()
            expect(m.label).toBeTruthy()
            expect(m.icon).toBeTruthy()
            expect(m.flag).toBeTruthy()
            expect(typeof m.priority).toBe('number')
        }
    })

    it('whatsapp method exists', () => {
        const methods = getEnabledMethods(allFlagsOn)
        expect(methods.find(m => m.id === 'whatsapp')).toBeDefined()
    })

    it('card method exists', () => {
        const methods = getEnabledMethods(allFlagsOn)
        expect(methods.find(m => m.id === 'card')).toBeDefined()
    })

    it('cod method exists', () => {
        const methods = getEnabledMethods(allFlagsOn)
        expect(methods.find(m => m.id === 'cod')).toBeDefined()
    })

    it('bank_transfer method exists', () => {
        const methods = getEnabledMethods(allFlagsOn)
        expect(methods.find(m => m.id === 'bank_transfer')).toBeDefined()
    })

    // ── Feature Flag Gating ──

    it('disabling a flag removes its method', () => {
        const methods = getEnabledMethods(
            flagsWith({ enable_whatsapp_checkout: false } as any)
        )
        expect(methods.find(m => m.id === 'whatsapp')).toBeUndefined()
        expect(methods.length).toBeLessThan(4)
    })

    it('disabling all payment flags returns empty', () => {
        const methods = getEnabledMethods(flagsWith({
            enable_whatsapp_checkout: false,
            enable_online_payments: false,
            enable_cash_on_delivery: false,
            enable_bank_transfer: false,
        } as any))
        expect(methods).toHaveLength(0)
    })

    // ── Plan Limits ──

    it('respects max_payment_methods limit', () => {
        const methods = getEnabledMethods(allFlagsOn, { max_payment_methods: 2 } as PlanLimits)
        expect(methods).toHaveLength(2)
    })

    it('returns all when max_payment_methods is 0 (unlimited)', () => {
        const methods = getEnabledMethods(allFlagsOn, { max_payment_methods: 0 } as PlanLimits)
        expect(methods).toHaveLength(4)
    })

    it('returns all when limits is null', () => {
        const methods = getEnabledMethods(allFlagsOn, null)
        expect(methods).toHaveLength(4)
    })

    // ── Priority ordering ──

    it('methods are sorted by priority (ascending)', () => {
        const methods = getEnabledMethods(allFlagsOn)
        for (let i = 1; i < methods.length; i++) {
            expect(methods[i].priority).toBeGreaterThanOrEqual(methods[i - 1].priority)
        }
    })

    // ── No Duplicate IDs ──

    it('all method IDs are unique', () => {
        const methods = getEnabledMethods(allFlagsOn)
        const ids = methods.map(m => m.id)
        expect(new Set(ids).size).toBe(ids.length)
    })
})
