/**
 * Multi-currency system
 *
 * Currency resolution:
 * 1. `currency` cookie (set by header selector)
 * 2. config.default_currency from Supabase (Admin Panel)
 * 3. Fallback: 'usd'
 *
 * Price formatting uses Intl.NumberFormat for locale-aware display.
 *
 * Currency DATA is derived from @bootandstrap/shared — the SSOT for all apps.
 */

import type { Locale } from '.'
import {
    CURRENCIES as SHARED_CURRENCIES,
    CURRENCY_SYMBOL_MAP,
    CURRENCY_INTL_MAP,
    type CurrencyInfo,
} from '@bootandstrap/shared'

// Re-export the canonical type and data
export type { CurrencyInfo }

// ─── Supported currencies (re-exported from shared SSOT) ──────
export const SUPPORTED_CURRENCIES = SHARED_CURRENCIES

// ── Derived constants (use these instead of hardcoding) ───────
/** All valid currency codes — for server-side validation */
export const SUPPORTED_CURRENCY_CODES = SUPPORTED_CURRENCIES.map(c => c.code)

/** Total number of supported currencies — for plan limit capping */
export const SUPPORTED_CURRENCY_COUNT = SUPPORTED_CURRENCIES.length

/** Fast lookup map: code → CurrencyInfo — for UI components */
export const CURRENCY_MAP = Object.fromEntries(
    SUPPORTED_CURRENCIES.map(c => [c.code, c])
) as Record<string, CurrencyInfo>

export const DEFAULT_CURRENCY = 'eur'

/** Zero-decimal currencies — stored in whole units, not cents */
export const ZERO_DECIMAL_CURRENCIES = new Set([
    'cop', 'clp', 'jpy', 'krw', 'vnd', 'pyg', 'isk', 'ugx',
])

/** Check if a currency is zero-decimal (no cents/centavos) */
export function isZeroDecimal(code: string): boolean {
    return ZERO_DECIMAL_CURRENCIES.has(code.toLowerCase())
}

const CURRENCY_COOKIE = 'currency'

// ─── Locale → Intl locale mapping (derived from shared) ──────
const INTL_LOCALE_MAP: Record<string, string> = CURRENCY_INTL_MAP

// ─── Currency resolution (SERVER-ONLY at runtime) ─────────────
// Uses dynamic import of next/headers to avoid poisoning client bundles.
export async function getCurrency(defaultCurrency?: string): Promise<string> {
    // 1. Cookie (server-only — dynamically imported)
    try {
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const cookieCurrency = cookieStore.get(CURRENCY_COOKIE)?.value
        if (cookieCurrency && isValidCurrency(cookieCurrency)) {
            return cookieCurrency
        }
    } catch {
        // Not in server context — skip cookie resolution
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
    const code = currencyCode.toLowerCase()
    const intlLocale = locale
        ? localeToIntlLocale(locale, code)
        : INTL_LOCALE_MAP[code] ?? 'en-US'

    // Zero-decimal currencies: amount IS the display value (no /100)
    const isZero = ZERO_DECIMAL_CURRENCIES.has(code)
    const displayAmount = isZero ? amount : amount / 100

    return new Intl.NumberFormat(intlLocale, {
        style: 'currency',
        currency: code.toUpperCase(),
        minimumFractionDigits: 0,
        maximumFractionDigits: isZero ? 0 : 2,
    }).format(displayAmount)
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

// NOTE: setCurrencyCookie lives in './actions' (a 'use server' module).
// Import it directly from '@/lib/i18n/actions' — do NOT re-export here.
// Re-exporting a 'use server' module causes Turbopack to split this file
// into server/client chunks, breaking named exports like isZeroDecimal.
