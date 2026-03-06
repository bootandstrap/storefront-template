/**
 * Medusa Admin API — Analytics Domain
 *
 * Functions for revenue analytics, top products, conversion metrics.
 * Used by the owner panel dashboard for business intelligence.
 */
import { adminFetch } from './admin-core'
import type { TenantMedusaScope } from './admin-core'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RevenueData {
    total_revenue: number
    order_count: number
    average_order_value: number
    currency_code: string
}

export interface TopProduct {
    product_id: string
    title: string
    thumbnail: string | null
    units_sold: number
    revenue: number
}

export interface DashboardMetrics {
    revenue_today: number
    revenue_this_week: number
    revenue_this_month: number
    orders_today: number
    orders_this_week: number
    orders_this_month: number
    new_customers_this_month: number
    currency_code: string
}

// ---------------------------------------------------------------------------
// Revenue Analytics
// ---------------------------------------------------------------------------

/**
 * Calculate revenue metrics from orders.
 * Medusa doesn't have a built-in analytics endpoint, so we aggregate
 * from the orders list.
 */
export async function getRevenueMetrics(
    period: 'today' | 'week' | 'month' | 'year',
    scope?: TenantMedusaScope | null
): Promise<RevenueData> {
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

    const res = await adminFetch<{
        orders: { total: number; currency_code: string }[]
        count: number
    }>(
        `/admin/orders?limit=0&fields=total,currency_code&created_at[gte]=${startDate.toISOString()}`,
        {},
        scope
    )

    const orders = res.data?.orders ?? []
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0)

    return {
        total_revenue: totalRevenue,
        order_count: res.data?.count ?? 0,
        average_order_value: orders.length > 0 ? totalRevenue / orders.length : 0,
        currency_code: orders[0]?.currency_code || 'eur',
    }
}

/**
 * Get top selling products by aggregating order items.
 */
export async function getTopProducts(
    limit: number = 5,
    scope?: TenantMedusaScope | null
): Promise<TopProduct[]> {
    // Fetch recent orders with items
    const res = await adminFetch<{
        orders: {
            items: {
                product_id: string | null
                title: string
                thumbnail: string | null
                quantity: number
                total: number
            }[]
        }[]
    }>(
        '/admin/orders?limit=100&order=-created_at&fields=*items',
        {},
        scope
    )

    const orders = res.data?.orders ?? []

    // Aggregate by product_id
    const productMap = new Map<string, TopProduct>()
    for (const order of orders) {
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
 */
export async function getDashboardMetrics(
    scope?: TenantMedusaScope | null
): Promise<DashboardMetrics> {
    const [today, week, month] = await Promise.all([
        getRevenueMetrics('today', scope),
        getRevenueMetrics('week', scope),
        getRevenueMetrics('month', scope),
    ])

    // Customer count this month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const customerRes = await adminFetch<{ count: number }>(
        `/admin/customers?limit=0&fields=id&created_at[gte]=${startOfMonth.toISOString()}`,
        {},
        scope
    )

    return {
        revenue_today: today.total_revenue,
        revenue_this_week: week.total_revenue,
        revenue_this_month: month.total_revenue,
        orders_today: today.order_count,
        orders_this_week: week.order_count,
        orders_this_month: month.order_count,
        new_customers_this_month: customerRes.data?.count ?? 0,
        currency_code: month.currency_code,
    }
}
