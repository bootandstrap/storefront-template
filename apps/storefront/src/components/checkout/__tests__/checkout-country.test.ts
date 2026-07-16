import { describe, expect, it } from 'vitest'

import { resolveInitialCheckoutCountryCode } from '../checkout-country'

const countries = [
    { iso_2: 'at', display_name: 'Austria' },
    { iso_2: 'co', display_name: 'Colombia' },
    { iso_2: 'es', display_name: 'Spain' },
]

describe('resolveInitialCheckoutCountryCode', () => {
    it('prefers the tenant country prefix over the first Medusa country', () => {
        expect(resolveInitialCheckoutCountryCode(countries, '+57')).toBe('co')
    })

    it('normalizes prefixes and country codes', () => {
        expect(resolveInitialCheckoutCountryCode([
            { iso_2: 'ES', display_name: 'Spain' },
        ], '34')).toBe('es')
    })

    it('falls back to the first country when the prefix is unknown', () => {
        expect(resolveInitialCheckoutCountryCode(countries, '+999')).toBe('at')
    })

    it('falls back to us when Medusa has no countries', () => {
        expect(resolveInitialCheckoutCountryCode([], '+57')).toBe('us')
    })
})
