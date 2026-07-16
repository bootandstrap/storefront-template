import type { CheckoutCountry } from './steps/CheckoutAddressStep'

const COUNTRY_BY_DIAL_PREFIX: Record<string, string> = {
    '1': 'us',
    '33': 'fr',
    '34': 'es',
    '39': 'it',
    '41': 'ch',
    '43': 'at',
    '49': 'de',
    '57': 'co',
    '351': 'pt',
}

function normalizeCountryCode(value: string | undefined): string | null {
    const normalized = value?.trim().toLowerCase()
    return normalized ? normalized : null
}

function normalizeDialPrefix(value: string | undefined): string | null {
    const normalized = value?.replace(/[^\d]/g, '')
    return normalized ? normalized : null
}

export function resolveInitialCheckoutCountryCode(
    countries: CheckoutCountry[],
    defaultCountryPrefix?: string,
): string {
    const normalizedCountries = countries
        .map(country => normalizeCountryCode(country.iso_2))
        .filter((country): country is string => Boolean(country))

    const preferredCountry = COUNTRY_BY_DIAL_PREFIX[normalizeDialPrefix(defaultCountryPrefix) ?? '']
    if (preferredCountry && normalizedCountries.includes(preferredCountry)) {
        return preferredCountry
    }

    return normalizedCountries[0] ?? 'us'
}
