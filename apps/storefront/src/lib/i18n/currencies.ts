/**
 * Multi-currency system
 *
 * Currency resolution:
 * 1. `currency` cookie (set by header selector)
 * 2. config.default_currency from Supabase (Admin Panel)
 * 3. Fallback: 'usd'
 *
 * Price formatting uses Intl.NumberFormat for locale-aware display.
 */

import { cookies } from 'next/headers'
import type { Locale } from '.'

// ─── Types ────────────────────────────────────────────────────
export interface CurrencyInfo {
    code: string
    symbol: string
    name: string
    flag: string
}

// ─── Supported currencies ─────────────────────────────────────
// Filtered at runtime by getActiveCurrencies() — admin config controls which are shown.
export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
    // ── Global ──
    { code: 'usd', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'eur', symbol: '€', name: 'Euro', flag: '🇪🇺' },
    { code: 'gbp', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
    { code: 'chf', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
    // ── Scandinavia ──
    { code: 'sek', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪' },
    { code: 'dkk', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰' },
    { code: 'nok', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴' },
    // ── Eastern Europe ──
    { code: 'pln', symbol: 'zł', name: 'Polish Zloty', flag: '🇵🇱' },
    { code: 'czk', symbol: 'Kč', name: 'Czech Koruna', flag: '🇨🇿' },
    { code: 'huf', symbol: 'Ft', name: 'Hungarian Forint', flag: '🇭🇺' },
    { code: 'ron', symbol: 'lei', name: 'Romanian Leu', flag: '🇷🇴' },
    // ── Latin America ──
    { code: 'mxn', symbol: '$', name: 'Peso Mexicano', flag: '🇲🇽' },
    { code: 'cop', symbol: '$', name: 'Peso Colombiano', flag: '🇨🇴' },
    { code: 'clp', symbol: '$', name: 'Peso Chileno', flag: '🇨🇱' },
    { code: 'ars', symbol: '$', name: 'Peso Argentino', flag: '🇦🇷' },
    { code: 'pen', symbol: 'S/', name: 'Sol Peruano', flag: '🇵🇪' },
    { code: 'brl', symbol: 'R$', name: 'Real Brasileiro', flag: '🇧🇷' },
    { code: 'uyu', symbol: '$U', name: 'Peso Uruguayo', flag: '🇺🇾' },
    { code: 'crc', symbol: '₡', name: 'Colón Costarricense', flag: '🇨🇷' },
    { code: 'dop', symbol: 'RD$', name: 'Peso Dominicano', flag: '🇩🇴' },
    { code: 'gtq', symbol: 'Q', name: 'Quetzal Guatemalteco', flag: '🇬🇹' },
    { code: 'bob', symbol: 'Bs', name: 'Boliviano', flag: '🇧🇴' },
]

export const DEFAULT_CURRENCY = 'usd'

const CURRENCY_COOKIE = 'currency'

// ─── Locale → Intl locale mapping ─────────────────────────────
// Used by formatPrice() when no i18n locale is available.
const INTL_LOCALE_MAP: Record<string, string> = {
    usd: 'en-US',
    eur: 'de-DE',
    gbp: 'en-GB',
    chf: 'de-CH',
    sek: 'sv-SE',
    dkk: 'da-DK',
    nok: 'nb-NO',
    pln: 'pl-PL',
    czk: 'cs-CZ',
    huf: 'hu-HU',
    ron: 'ro-RO',
    mxn: 'es-MX',
    cop: 'es-CO',
    clp: 'es-CL',
    ars: 'es-AR',
    pen: 'es-PE',
    brl: 'pt-BR',
    uyu: 'es-UY',
    crc: 'es-CR',
    dop: 'es-DO',
    gtq: 'es-GT',
    bob: 'es-BO',
}

// ─── Currency resolution ──────────────────────────────────────
export async function getCurrency(defaultCurrency?: string): Promise<string> {
    // 1. Cookie
    const cookieStore = await cookies()
    const cookieCurrency = cookieStore.get(CURRENCY_COOKIE)?.value
    if (cookieCurrency && isValidCurrency(cookieCurrency)) {
        return cookieCurrency
    }

    // 2. Config default
    if (defaultCurrency && isValidCurrency(defaultCurrency)) {
        return defaultCurrency
    }

    // 3. Fallback
    return DEFAULT_CURRENCY
}

export function isValidCurrency(code: string): boolean {
    return SUPPORTED_CURRENCIES.some((c) => c.code === code.toLowerCase())
}

export function getCurrencyInfo(code: string): CurrencyInfo | undefined {
    return SUPPORTED_CURRENCIES.find((c) => c.code === code.toLowerCase())
}

/**
 * Get active currencies filtered by admin config.
 */
export function getActiveCurrencies(config?: Record<string, unknown> | null): CurrencyInfo[] {
    const active = config?.active_currencies as string[] | undefined
    if (!active || !Array.isArray(active) || active.length === 0) {
        return SUPPORTED_CURRENCIES.filter((c) => c.code === DEFAULT_CURRENCY)
    }
    return SUPPORTED_CURRENCIES.filter((c) => active.includes(c.code))
}

// ─── Price formatting ─────────────────────────────────────────

/**
 * Format a price amount (in minor units, e.g., cents) to a currency string.
 *
 * @param amount - Price in minor units (cents)
 * @param currencyCode - Currency code (e.g., 'usd', 'eur')
 * @param locale - Optional i18n locale for number formatting
 */
export function formatPrice(amount: number, currencyCode: string, locale?: Locale): string {
    const intlLocale = locale
        ? localeToIntlLocale(locale, currencyCode)
        : INTL_LOCALE_MAP[currencyCode.toLowerCase()] ?? 'en-US'

    return new Intl.NumberFormat(intlLocale, {
        style: 'currency',
        currency: currencyCode.toUpperCase(),
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount / 100)
}

/**
 * Map our i18n locale + currency to an Intl locale string.
 */
function localeToIntlLocale(locale: Locale, currencyCode: string): string {
    const map: Record<Locale, string> = {
        en: 'en-US',
        es: 'es-ES',
        de: 'de-DE',
        fr: 'fr-FR',
        it: 'it-IT',
    }
    // Use the specific currency locale where it matters
    const currencyLocale = INTL_LOCALE_MAP[currencyCode.toLowerCase()]
    if (currencyLocale) return currencyLocale
    return map[locale] ?? 'en-US'
}

/**
 * Server Action: set currency cookie.
 * Re-exported from actions.ts (separate file to avoid next/headers in client bundles).
 */
export { setCurrencyCookie } from './actions'
