import { describe, it, expect } from 'vitest'
import { getPrice, formatPrice, getFormattedPrice } from '../price'
import type { MedusaVariant } from '../client'

describe('getPrice', () => {
    it('returns null for undefined variant', () => {
        expect(getPrice(undefined)).toBeNull()
        expect(getPrice(null)).toBeNull()
    })

    it('prefers calculated_price over raw prices', () => {
        const variant: MedusaVariant = {
            id: 'v1',
            title: 'Default',
            sku: null,
            calculated_price: { calculated_amount: 999, currency_code: 'eur' },
            prices: [{ amount: 1299, currency_code: 'eur' }],
            options: [],
        }
        const result = getPrice(variant)
        expect(result).toEqual({ amount: 999, currency: 'eur' })
    })

    it('falls back to first raw price when no calculated_price', () => {
        const variant: MedusaVariant = {
            id: 'v2',
            title: 'Default',
            sku: null,
            prices: [
                { amount: 500, currency_code: 'usd' },
                { amount: 450, currency_code: 'eur' },
            ],
            options: [],
        }
        const result = getPrice(variant)
        expect(result).toEqual({ amount: 500, currency: 'usd' })
    })

    it('returns null when variant has no prices', () => {
        const variant: MedusaVariant = {
            id: 'v3',
            title: 'Default',
            sku: null,
            prices: [],
            options: [],
        }
        expect(getPrice(variant)).toBeNull()
    })
})

describe('formatPrice', () => {
    it('formats EUR prices correctly', () => {
        const result = formatPrice(1299, 'eur', 'es-ES')
        expect(result).toContain('12,99')
        expect(result).toContain('€')
    })

    it('formats USD prices correctly', () => {
        const result = formatPrice(2500, 'usd', 'en-US')
        // $25 or $25.00
        expect(result).toMatch(/\$25/)
    })

    it('formats zero amount', () => {
        const result = formatPrice(0, 'eur', 'es-ES')
        expect(result).toContain('0')
    })

    it('handles large amounts', () => {
        const result = formatPrice(999900, 'usd', 'en-US')
        expect(result).toMatch(/9,999|9\.999/)
    })
})

describe('getFormattedPrice', () => {
    it('returns null for null variant', () => {
        expect(getFormattedPrice(null)).toBeNull()
    })

    it('returns formatted price string for valid variant', () => {
        const variant: MedusaVariant = {
            id: 'v1',
            title: 'Default',
            sku: null,
            prices: [{ amount: 350, currency_code: 'eur' }],
            options: [],
        }
        const result = getFormattedPrice(variant, 'es-ES')
        expect(result).toContain('3,5')
        expect(result).toContain('€')
    })
})
