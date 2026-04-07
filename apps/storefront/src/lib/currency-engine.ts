/**
 * CurrencyEngine — Unified Multi-Currency System
 *
 * Single source of truth for currency context across all subsystems:
 * Dashboard, POS, Analytics, Orders, and Storefront.
 *
 * Design principle: "Resolve Once, Use Everywhere"
 * Zero overhead for single-currency tenants (majority case).
 *
 * Governance:
 * - i18n Basic tier: max_currencies=1, enable_multi_currency=false
 * - i18n Pro tier:   max_currencies=5, enable_multi_currency=true
 *
 * @module currency-engine
 * @locked 🟡 YELLOW — shared infrastructure, modify with care
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CurrencyContext {
    /** Primary operating currency (config.default_currency) */
    primary: string
    /** All active currencies (may be just [primary] for single-currency tenants) */
    active: string[]
    /** True when tenant has multi-currency enabled AND has >1 active currency */
    isMulti: boolean
}

export interface CurrencyRevenue {
    /** Currency code (lowercase) */
    code: string
    /** Total amount in minor units (cents) */
    amount: number
    /** Number of orders in this currency */
    orderCount: number
    /** Average order value in minor units */
    avgOrderValue: number
    /** NEW: Common base currency code (usually the tenant's primary currency) */
    baseCode: string
    /** NEW: Equivalent amount in the base currency (converted via FX rate) */
    baseAmount: number
}

/** Minimal order shape for currency grouping */
export interface CurrencyAwareOrder {
    total?: number
    currency_code?: string
    created_at?: string
}

// ---------------------------------------------------------------------------
// Static Exchange Rates (Mock FX engine)
// ---------------------------------------------------------------------------

/**
 * Static reference to base EUR = 1.0.
 * This serves as the fallback engine for multi-currency unification
 * before a live FX API integration is built.
 */
export const STATIC_EXCHANGE_RATES: Record<string, number> = {
    eur: 1.00,
    usd: 1.08,
    gbp: 0.85,
    chf: 0.98,
    sek: 11.50,
    dkk: 7.45,
    nok: 11.75,
    pln: 4.30,
    czk: 25.30,
    huf: 395.00,
    ron: 4.97,
    mxn: 17.80,
    cop: 4180.00,
    clp: 1045.00,
    ars: 980.00,
    pen: 3.75,
    brl: 5.30,
    uyu: 38.50,
    crc: 512.00,
    dop: 59.00,
    gtq: 7.80,
    bob: 6.90,
}

/**
 * Converts an amount from one currency to another using the static rates.
 */
export function convertAmount(amount: number, fromCode: string, toCode: string): number {
    const from = fromCode.toLowerCase()
    const to = toCode.toLowerCase()
    if (from === to) return amount
    
    // Fallback to 1.0 if not found, prevents Division by Zero and massive scaling bugs
    const rateFrom = STATIC_EXCHANGE_RATES[from] || 1.0
    const rateTo = STATIC_EXCHANGE_RATES[to] || 1.0
    
    // Convert to EUR base, then to target currency
    const amountInBase = amount / rateFrom
    const finalAmount = amountInBase * rateTo
    
    return Math.round(finalAmount)
}

// ---------------------------------------------------------------------------
// Currency Context Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the tenant's currency context from config and feature flags.
 *
 * This is THE function every subsystem should call to answer:
 * "What currency/currencies does this tenant operate in?"
 *
 * @param config - Tenant config (from Supabase `config` table)
 * @param featureFlags - Tenant feature flags (from governance engine)
 */
export function resolveCurrencyContext(
    config: {
        default_currency?: string
        active_currencies?: string[] | string | null
    },
    featureFlags?: { enable_multi_currency?: boolean }
): CurrencyContext {
    const primary = (config.default_currency || 'eur').toLowerCase()

    // Parse active_currencies — may be array, JSON string, or null
    let active: string[] = [primary]
    const raw = config.active_currencies
    if (Array.isArray(raw) && raw.length > 0) {
        active = raw.map(c => c.toLowerCase())
    } else if (typeof raw === 'string' && raw.length > 0) {
        try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed) && parsed.length > 0) {
                active = parsed.map((c: string) => c.toLowerCase())
            }
        } catch {
            // Not JSON — treat as single currency
            active = [raw.toLowerCase()]
        }
    }

    // Ensure primary is always in the active list
    if (!active.includes(primary)) {
        active = [primary, ...active]
    }

    const isMulti = (featureFlags?.enable_multi_currency ?? false) && active.length > 1

    return { primary, active, isMulti }
}

// ---------------------------------------------------------------------------
// Revenue Grouping & Aggregation
// ---------------------------------------------------------------------------

/**
 * Group orders by their currency_code.
 *
 * For single-currency tenants, returns a Map with one entry.
 * For multi-currency, returns one entry per currency.
 */
export function groupOrdersByCurrency<T extends CurrencyAwareOrder>(
    orders: T[],
    fallbackCurrency: string = 'eur'
): Map<string, T[]> {
    const groups = new Map<string, T[]>()
    for (const order of orders) {
        const code = (order.currency_code || fallbackCurrency).toLowerCase()
        const list = groups.get(code) || []
        list.push(order)
        groups.set(code, list)
    }
    return groups
}

/**
 * Calculate revenue totals grouped by currency.
 *
 * Returns an array sorted by: primary currency first, then by amount desc.
 *
 * @param orders - Orders with total + currency_code
 * @param ctx - Currency context (for ordering results)
 */
export function sumRevenueByCurrency(
    orders: CurrencyAwareOrder[],
    ctx: CurrencyContext
): CurrencyRevenue[] {
    const groups = groupOrdersByCurrency(orders, ctx.primary)
    const results: CurrencyRevenue[] = []

    for (const [code, groupOrders] of groups) {
        const amount = groupOrders.reduce((sum, o) => sum + (o.total ?? 0), 0)
        const orderCount = groupOrders.length
        results.push({
            code,
            amount,
            orderCount,
            avgOrderValue: orderCount > 0 ? Math.round(amount / orderCount) : 0,
            baseCode: ctx.primary,
            baseAmount: convertAmount(amount, code, ctx.primary),
        })
    }

    // Sort: primary currency first, then by amount descending
    results.sort((a, b) => {
        if (a.code === ctx.primary) return -1
        if (b.code === ctx.primary) return 1
        return b.amount - a.amount
    })

    return results
}

/**
 * Get revenue for a specific day grouped by currency.
 * Used by dashboard charts for per-day-per-currency data points.
 */
export function revenueByDayAndCurrency(
    orders: CurrencyAwareOrder[],
    ctx: CurrencyContext,
    days: number = 7
): { date: string; revenues: Record<string, number>; totalBaseRevenue: number; totalOrders: number }[] {
    const result: { date: string; revenues: Record<string, number>; totalBaseRevenue: number; totalOrders: number }[] = []

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]

        const dayOrders = orders.filter(o => o.created_at?.startsWith(dateStr))
        const revenues: Record<string, number> = {}

        let totalBaseRevenue = 0
        for (const code of ctx.active) {
            const sumForCode = dayOrders
                .filter(o => (o.currency_code || ctx.primary).toLowerCase() === code)
                .reduce((sum, o) => sum + (o.total ?? 0), 0)
            revenues[code] = sumForCode
            totalBaseRevenue += convertAmount(sumForCode, code, ctx.primary)
        }

        result.push({
            date: dateStr,
            revenues,
            totalBaseRevenue,
            totalOrders: dayOrders.length,
        })
    }

    return result
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Locale map for Intl.NumberFormat — same as currencies.ts */
const INTL_LOCALE: Record<string, string> = {
    usd: 'en-US', eur: 'de-DE', gbp: 'en-GB', chf: 'de-CH',
    sek: 'sv-SE', dkk: 'da-DK', nok: 'nb-NO', pln: 'pl-PL',
    czk: 'cs-CZ', huf: 'hu-HU', ron: 'ro-RO', mxn: 'es-MX',
    cop: 'es-CO', clp: 'es-CL', ars: 'es-AR', pen: 'es-PE',
    brl: 'pt-BR', uyu: 'es-UY', crc: 'es-CR', dop: 'es-DO',
    gtq: 'es-GT', bob: 'es-BO',
}

/**
 * Safe currency formatter — handles undefined/null gracefully.
 *
 * @param amount - Amount in minor units (cents)
 * @param currencyCode - Currency code (e.g., 'eur', 'chf')
 * @param locale - Optional i18n locale override (e.g., 'es', 'en')
 */
export function formatAmount(
    amount: number | undefined | null,
    currencyCode: string | undefined | null,
    locale?: string
): string {
    const safeAmount = amount ?? 0
    const safeCode = (currencyCode || 'eur').toLowerCase()
    const intlLocale = locale
        ? (INTL_LOCALE[safeCode] || locale)
        : (INTL_LOCALE[safeCode] || 'en-US')

    try {
        return new Intl.NumberFormat(intlLocale, {
            style: 'currency',
            currency: safeCode.toUpperCase(),
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(safeAmount / 100)
    } catch {
        // Fallback for unknown currency codes
        return `${(safeAmount / 100).toFixed(2)} ${safeCode.toUpperCase()}`
    }
}

/**
 * Get the currency symbol for display (e.g., €, $, CHF).
 */
export function getCurrencySymbol(code: string): string {
    const formatted = formatAmount(0, code)
    // Extract symbol: remove the number part
    return formatted.replace(/[\d.,\s]/g, '').trim() || code.toUpperCase()
}

/**
 * Currency display colors for charts — consistent palette per currency.
 */
export const CURRENCY_CHART_COLORS: Record<string, { bg: string; border: string; label: string }> = {
    eur: { bg: 'rgba(99, 102, 241, 0.15)', border: '#6366f1', label: '€ EUR' },
    chf: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', label: 'CHF' },
    usd: { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', label: '$ USD' },
    gbp: { bg: 'rgba(168, 85, 247, 0.15)', border: '#a855f7', label: '£ GBP' },
    // Fallback for any other currency
    _default: { bg: 'rgba(107, 114, 128, 0.15)', border: '#6b7280', label: '' },
}

export function getCurrencyChartColor(code: string) {
    return CURRENCY_CHART_COLORS[code.toLowerCase()] || {
        ...CURRENCY_CHART_COLORS._default,
        label: code.toUpperCase(),
    }
}
