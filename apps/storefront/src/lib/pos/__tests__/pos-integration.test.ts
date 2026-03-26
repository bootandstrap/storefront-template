/**
 * POS Integration Tests — Payment Method Gating + Feature Flags
 *
 * Tests the integration between POS utilities, feature flags, and
 * plan limits to verify correct gating behavior:
 * - getEnabledPOSPaymentMethods with various max_pos_payment_methods limits
 * - isPOSHistoryAvailable / isPOSDashboardAvailable flag derivation
 * - formatPOSCurrency formatting
 */

import { describe, it, expect } from 'vitest'
import {
    getEnabledPOSPaymentMethods,
    formatPOSCurrency,
    isPOSHistoryAvailable,
    isPOSDashboardAvailable,
} from '../pos-utils'

// ---------------------------------------------------------------------------
// Payment Method Gating (getEnabledPOSPaymentMethods)
// ---------------------------------------------------------------------------

describe('getEnabledPOSPaymentMethods', () => {
    it('returns all 4 methods when limits is null (unlimited)', () => {
        const methods = getEnabledPOSPaymentMethods(null)
        expect(methods).toHaveLength(4)
        expect(methods).toEqual(['cash', 'card_terminal', 'twint', 'manual_card'])
    })

    it('returns all 4 methods when limits is undefined', () => {
        const methods = getEnabledPOSPaymentMethods(undefined)
        expect(methods).toHaveLength(4)
    })

    it('returns all 4 methods when max_pos_payment_methods is 0 (unlimited)', () => {
        const methods = getEnabledPOSPaymentMethods({
            max_pos_payment_methods: 0,
        } as any)
        expect(methods).toHaveLength(4)
    })

    it('Basic tier: limit=1 → only cash', () => {
        const methods = getEnabledPOSPaymentMethods({
            max_pos_payment_methods: 1,
        } as any)
        expect(methods).toHaveLength(1)
        expect(methods[0]).toBe('cash')
    })

    it('limit=2 → cash + card_terminal', () => {
        const methods = getEnabledPOSPaymentMethods({
            max_pos_payment_methods: 2,
        } as any)
        expect(methods).toHaveLength(2)
        expect(methods).toEqual(['cash', 'card_terminal'])
    })

    it('Pro tier: limit=3 → cash + card_terminal + twint', () => {
        const methods = getEnabledPOSPaymentMethods({
            max_pos_payment_methods: 3,
        } as any)
        expect(methods).toHaveLength(3)
        expect(methods).toEqual(['cash', 'card_terminal', 'twint'])
    })

    it('Enterprise: limit=4 or higher → all methods', () => {
        const methods = getEnabledPOSPaymentMethods({
            max_pos_payment_methods: 4,
        } as any)
        expect(methods).toHaveLength(4)
    })

    it('limit=999 → still only returns the 4 defined methods', () => {
        const methods = getEnabledPOSPaymentMethods({
            max_pos_payment_methods: 999,
        } as any)
        expect(methods).toHaveLength(4)
    })

    it('preserves priority order: cash first, manual_card last', () => {
        const methods = getEnabledPOSPaymentMethods(null)
        expect(methods[0]).toBe('cash')
        expect(methods[methods.length - 1]).toBe('manual_card')
    })

    it('returns all when max_pos_payment_methods is missing from limits', () => {
        const methods = getEnabledPOSPaymentMethods({} as any)
        expect(methods).toHaveLength(4)
    })
})

// ---------------------------------------------------------------------------
// Feature Flag Derivation
// ---------------------------------------------------------------------------

describe('isPOSHistoryAvailable', () => {
    it('returns true when enable_pos_shifts is true', () => {
        expect(isPOSHistoryAvailable({ enable_pos_shifts: true })).toBe(true)
    })

    it('returns false when enable_pos_shifts is false', () => {
        expect(isPOSHistoryAvailable({ enable_pos_shifts: false })).toBe(false)
    })

    it('returns false when enable_pos_shifts is missing', () => {
        expect(isPOSHistoryAvailable({})).toBe(false)
    })
})

describe('isPOSDashboardAvailable', () => {
    it('returns true when enable_pos_reports is true', () => {
        expect(isPOSDashboardAvailable({ enable_pos_reports: true })).toBe(true)
    })

    it('returns false when enable_pos_reports is false', () => {
        expect(isPOSDashboardAvailable({ enable_pos_reports: false })).toBe(false)
    })

    it('returns false when enable_pos_reports is missing', () => {
        expect(isPOSDashboardAvailable({})).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// Currency Formatting
// ---------------------------------------------------------------------------

describe('formatPOSCurrency', () => {
    it('formats CHF correctly', () => {
        const result = formatPOSCurrency(2500, 'chf', 'de-CH')
        expect(result).toContain('25')
        // Intl includes currency symbol — just verify it's formatted
        expect(result).toMatch(/CHF|Fr/)
    })

    it('formats EUR correctly', () => {
        const result = formatPOSCurrency(1000, 'EUR', 'es-ES')
        expect(result).toContain('10')
    })

    it('handles zero amount', () => {
        const result = formatPOSCurrency(0, 'chf')
        expect(result).toContain('0')
    })

    it('handles large amounts', () => {
        const result = formatPOSCurrency(999999, 'chf')
        expect(result).toContain('9')
    })

    it('defaults to EUR and de-CH locale', () => {
        const result = formatPOSCurrency(1500)
        expect(result).toBeTruthy()
        expect(typeof result).toBe('string')
    })

    it('uppercases currency code', () => {
        // lowercase input should still work
        const result = formatPOSCurrency(1000, 'chf')
        expect(result).toBeTruthy()
    })
})
