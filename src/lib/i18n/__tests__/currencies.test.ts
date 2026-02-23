/**
 * Tests for pure currency functions.
 * Note: getCurrency() uses `next/headers` cookies() so it cannot be tested in Vitest.
 * Only pure functions (no server-side dependencies) are tested here.
 */
import { describe, it, expect } from 'vitest'
import {
    isValidCurrency,
    getCurrencyInfo,
    getActiveCurrencies,
    SUPPORTED_CURRENCIES,
    DEFAULT_CURRENCY,
    formatPrice,
} from '../currencies'

describe('isValidCurrency', () => {
    it('accepts supported currencies', () => {
        expect(isValidCurrency('usd')).toBe(true)
        expect(isValidCurrency('eur')).toBe(true)
        expect(isValidCurrency('gbp')).toBe(true)
        expect(isValidCurrency('cop')).toBe(true)
        expect(isValidCurrency('mxn')).toBe(true)
    })

    it('accepts uppercase codes', () => {
        expect(isValidCurrency('USD')).toBe(true)
        expect(isValidCurrency('EUR')).toBe(true)
    })

    it('rejects unsupported currencies', () => {
        expect(isValidCurrency('btc')).toBe(false)
        expect(isValidCurrency('jpy')).toBe(false)
        expect(isValidCurrency('')).toBe(false)
    })
})

describe('getCurrencyInfo', () => {
    it('returns info for valid currency', () => {
        const eur = getCurrencyInfo('eur')
        expect(eur?.symbol).toBe('€')
        expect(eur?.name).toBe('Euro')
        expect(eur?.flag).toBe('🇪🇺')
    })

    it('returns undefined for invalid currency', () => {
        expect(getCurrencyInfo('btc')).toBeUndefined()
    })

    it('is case-insensitive', () => {
        expect(getCurrencyInfo('USD')?.code).toBe('usd')
    })
})

describe('getActiveCurrencies', () => {
    it('returns only default currency when no config', () => {
        const active = getActiveCurrencies(null)
        expect(active).toHaveLength(1)
        expect(active[0].code).toBe(DEFAULT_CURRENCY)
    })

    it('returns only default currency when active_currencies is empty', () => {
        const active = getActiveCurrencies({ active_currencies: [] })
        expect(active).toHaveLength(1)
        expect(active[0].code).toBe(DEFAULT_CURRENCY)
    })

    it('filters SUPPORTED_CURRENCIES by active list', () => {
        const active = getActiveCurrencies({ active_currencies: ['eur', 'gbp'] })
        expect(active).toHaveLength(2)
        expect(active.map((c) => c.code)).toEqual(['eur', 'gbp'])
    })

    it('ignores unsupported currencies in active list', () => {
        const active = getActiveCurrencies({ active_currencies: ['eur', 'btc'] })
        expect(active).toHaveLength(1)
        expect(active[0].code).toBe('eur')
    })
})

describe('formatPrice', () => {
    it('formats EUR with es locale', () => {
        const result = formatPrice(1299, 'eur', 'es')
        expect(result).toContain('12,99')
        expect(result).toContain('€')
    })

    it('formats USD with en locale', () => {
        const result = formatPrice(2500, 'usd', 'en')
        expect(result).toMatch(/\$25/)
    })

    it('formats COP with es locale', () => {
        const result = formatPrice(500000, 'cop', 'es')
        // COP 5,000 or similar
        expect(result).toContain('5')
    })

    it('formats zero amount', () => {
        const result = formatPrice(0, 'eur', 'de')
        expect(result).toContain('0')
    })

    it('uses fallback locale when none provided', () => {
        // Without locale, should still format correctly
        const result = formatPrice(999, 'usd')
        expect(result).toMatch(/\$|USD/)
    })
})

describe('SUPPORTED_CURRENCIES', () => {
    it('has at least 5 currencies', () => {
        expect(SUPPORTED_CURRENCIES.length).toBeGreaterThanOrEqual(5)
    })

    it('each currency has required fields', () => {
        for (const c of SUPPORTED_CURRENCIES) {
            expect(c.code).toBeTruthy()
            expect(c.symbol).toBeTruthy()
            expect(c.name).toBeTruthy()
            expect(c.flag).toBeTruthy()
        }
    })
})
