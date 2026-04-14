/**
 * Medusa Admin API — Analytics Domain
 *
 * Functions for revenue analytics, top products, conversion metrics.
 * Used by the owner panel dashboard for business intelligence.
 *
 * Multi-currency aware: uses CurrencyEngine for per-currency grouping.
 * All revenue data returns per-currency breakdowns.
 *
 * @module admin-analytics
 */
import { adminFetch } from './admin-core'
import type { TenantMedusaScope } from './admin-core'
import {
    type CurrencyContext,
    type CurrencyRevenue,
    type CurrencyAwareOrder,
    sumRevenueByCurrency,
    revenueByDayAndCurrency,
    groupOrdersByCurrency,
} from '@/lib/currency-engine'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RevenueData {
    total_revenue: number
    order_count: number
    average_order_value: number
    currency_code: string
}

/** Multi-currency revenue — one entry per active currency */
export interface MultiCurrencyRevenue {
    /** Primary currency revenue (always the first entry) */
    primary: CurrencyRevenue
    /** All currencies including primary, sorted: primary first then by amount desc */
    all: CurrencyRevenue[]
    /** Whether there are orders in more than one currency */
    isMulti: boolean
    /** NEW: Unified total revenue converted to the primary currency */
    totalBaseAmount: number
}

export interface TopProduct {
    product_id: string
    title: string
    thumbnail: string | null
    units_sold: number
    revenue: number
    currency_code: string
}

export interface DashboardMetrics {
    revenue_today: MultiCurrencyRevenue
    revenue_this_week: MultiCurrencyRevenue
    revenue_this_month: MultiCurrencyRevenue
    orders_today: number
    orders_this_week: number
    orders_this_month: number
    new_customers_this_month: number
    /** Revenue grouped by day × currency (for charts) */
    revenue_by_day: { date: string; revenues: Record<string, number>; totalBaseRevenue: number; totalOrders: number }[]
    /** Orders count by day (for chart overlay) */
    orders_by_day: { date: string; orders: number }[]
}

// ---------------------------------------------------------------------------
// Internal: Fetch orders for time range
// ---------------------------------------------------------------------------

interface RawOrder {
    id: string
    total: number
    currency_code?: string
    created_at?: string
    region?: { currency_code?: string }
}

async function fetchOrdersForRange(
    startDate: Date,
    scope?: TenantMedusaScope | null,
    includeFields: string = 'total,currency_code,created_at'
): Promise<{ orders: RawOrder[]; count: number }> {
    // Fetch regular orders — exclude canceled from revenue
    const regularRes = await adminFetch<{
        orders: (RawOrder & { status?: string })[]
        count: number
    }>(
        `/admin/orders?limit=500&fields=${includeFields},status&created_at[gte]=${startDate.toISOString()}&order=-created_at`,
        {},
        scope
    )

    // Also fetch completed draft orders (POS sales) with v2 field expansion for currency
    // NOTE: Medusa v2 uses fields=*relation syntax instead of expand= (which is v1-only)
    const draftRes = await adminFetch<{
        draft_orders: (RawOrder & {
            status: string
            cart?: { total?: number; subtotal?: number; region?: { currency_code?: string } }
            summary?: { current_order_total?: number }
        })[]
    }>(
        `/admin/draft-orders?limit=500&fields=id,status,created_at,*cart,*cart.region&created_at[gte]=${startDate.toISOString()}`,
        {},
        scope
    )

    // Filter out canceled orders from revenue calculations
    const regularOrders = (regularRes.data?.orders ?? []).filter(
        o => (o as any).status !== 'canceled' && (o as any).status !== 'cancelled'
    )

    // Normalize draft orders to match the regular order shape
    // v2 draft orders: totals can be in cart.total, summary.current_order_total, or top-level total
    const completedDrafts = (draftRes.data?.draft_orders ?? [])
        .filter(d => d.status === 'completed')
        .map(d => ({
            id: d.id,
            total: d.cart?.total ?? d.summary?.current_order_total ?? d.total ?? 0,
            currency_code: d.cart?.region?.currency_code ?? d.currency_code ?? d.region?.currency_code,
            created_at: d.created_at,
        }))

    return {
        orders: [...regularOrders, ...completedDrafts],
        count: (regularRes.data?.count ?? 0) + completedDrafts.length,
    }
}

// ---------------------------------------------------------------------------
// Revenue Analytics — Multi-Currency Aware
// ---------------------------------------------------------------------------

function toMultiCurrencyRevenue(
    orders: CurrencyAwareOrder[],
    ctx: CurrencyContext
): MultiCurrencyRevenue {
    const all = sumRevenueByCurrency(orders, ctx)

    // Ensure at least one entry for the primary currency
    const primary = all.find(r => r.code === ctx.primary) ?? {
        code: ctx.primary,
        amount: 0,
        orderCount: 0,
        avgOrderValue: 0,
        baseCode: ctx.primary,
        baseAmount: 0
    }

    const totalBaseAmount = all.reduce((sum, r) => sum + r.baseAmount, 0)

    return {
        primary,
        all,
        isMulti: all.length > 1,
        totalBaseAmount,
    }
}

/**
 * Calculate revenue metrics from orders.
 * Returns per-currency breakdowns using the CurrencyEngine.
 */
export async function getRevenueMetrics(
    period: 'today' | 'week' | 'month' | 'year',
    scope: TenantMedusaScope | null | undefined,
    currencyCtx: CurrencyContext
): Promise<MultiCurrencyRevenue> {
    const now = new Date()
    let startDate: Date

    switch (period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
        case 'week':
            startDate = new Date(now)
            startDate.setDate(now.getDate() - 7)
            break
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            break
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1)
            break
    }

    const { orders } = await fetchOrdersForRange(startDate, scope)
    return toMultiCurrencyRevenue(orders, currencyCtx)
}

/**
 * Get top selling products by aggregating order items.
 * Groups by product_id and includes currency_code for each product's primary currency.
 */
export async function getTopProducts(
    limit: number = 5,
    scope?: TenantMedusaScope | null,
    primaryCurrency: string = 'eur'
): Promise<TopProduct[]> {
    const res = await adminFetch<{
        orders: {
            currency_code?: string
            items: {
                product_id: string | null
                title: string
                thumbnail: string | null
                quantity: number
                total: number
            }[]
        }[]
    }>(
        '/admin/orders?limit=100&order=-created_at&fields=currency_code,*items',
        {},
        scope
    )

    const orders = res.data?.orders ?? []

    // Aggregate by product_id — track per currency too
    const productMap = new Map<string, TopProduct>()
    for (const order of orders) {
        const orderCurrency = order.currency_code || primaryCurrency
        for (const item of order.items ?? []) {
            if (!item.product_id) continue
            const existing = productMap.get(item.product_id)
            if (existing) {
                existing.units_sold += item.quantity
                existing.revenue += item.total
            } else {
                productMap.set(item.product_id, {
                    product_id: item.product_id,
                    title: item.title,
                    thumbnail: item.thumbnail,
                    units_sold: item.quantity,
                    revenue: item.total,
                    currency_code: orderCurrency,
                })
            }
        }
    }

    return Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit)
}

/**
 * Get full dashboard metrics in a single call.
 * Uses CurrencyEngine for multi-currency grouping.
 */
export async function getDashboardMetrics(
    scope: TenantMedusaScope | null | undefined,
    currencyCtx: CurrencyContext
): Promise<DashboardMetrics> {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - 7)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Fetch the widest range (month) and derive day/week from it
    const { orders } = await fetchOrdersForRange(startOfMonth, scope, 'total,currency_code,created_at')

    const todayStr = startOfDay.toISOString()
    const weekStr = startOfWeek.toISOString()

    const todayOrders = orders.filter(o => o.created_at && o.created_at >= todayStr)
    const weekOrders = orders.filter(o => o.created_at && o.created_at >= weekStr)

    // Currency-grouped revenue for each period
    const revenueToday = toMultiCurrencyRevenue(todayOrders, currencyCtx)
    const revenueWeek = toMultiCurrencyRevenue(weekOrders, currencyCtx)
    const revenueMonth = toMultiCurrencyRevenue(orders, currencyCtx)

    // Revenue by day × currency for charts
    const revByDay = revenueByDayAndCurrency(orders, currencyCtx, 7)

    // Orders count by day for chart overlay
    const ordersByDay: { date: string; orders: number }[] = []
    for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        ordersByDay.push({
            date: dateStr,
            orders: orders.filter(o => o.created_at?.startsWith(dateStr)).length,
        })
    }

    // New customers
    const customerRes = await adminFetch<{ count: number }>(
        `/admin/customers?limit=0&fields=id&created_at[gte]=${startOfMonth.toISOString()}`,
        {},
        scope
    )

    return {
        revenue_today: revenueToday,
        revenue_this_week: revenueWeek,
        revenue_this_month: revenueMonth,
        orders_today: todayOrders.length,
        orders_this_week: weekOrders.length,
        orders_this_month: orders.length,
        new_customers_this_month: customerRes.data?.count ?? 0,
        revenue_by_day: revByDay,
        orders_by_day: ordersByDay,
    }
}

// ---------------------------------------------------------------------------
// Backward compat: legacy single-currency getRevenueMetrics shape
// ---------------------------------------------------------------------------

export async function getRevenueMetricsLegacy(
    period: 'today' | 'week' | 'month' | 'year',
    scope?: TenantMedusaScope | null,
    defaultCurrency: string = 'eur'
): Promise<RevenueData> {
    const ctx: CurrencyContext = { primary: defaultCurrency, active: [defaultCurrency], isMulti: false }
    const multi = await getRevenueMetrics(period, scope, ctx)
    return {
        total_revenue: multi.primary.amount,
        order_count: multi.primary.orderCount,
        average_order_value: multi.primary.avgOrderValue,
        currency_code: multi.primary.code,
    }
}
