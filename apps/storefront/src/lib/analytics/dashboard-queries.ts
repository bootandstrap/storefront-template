/**
 * @module analytics/dashboard-queries
 * @description Analytics dashboard query functions for the Owner Panel.
 *
 * All queries operate on the `analytics_events` Supabase table.
 * They use the admin client (service role) for unrestricted read access.
 *
 * Designed for:
 *   - Owner Panel dashboard KPIs
 *   - Conversion funnel visualization
 *   - Product performance ranking
 *   - Revenue timeline charts
 *   - SuperAdmin cross-tenant analytics
 *
 * @locked 🔴 PLATFORM — Part of analytics pipeline
 */

import { createAdminClient } from '@/lib/supabase/admin'

// ── Types ─────────────────────────────────────────────────────────────────

export interface ConversionFunnel {
    /** Total unique sessions */
    sessions: number
    /** Sessions with at least one page view */
    pageViews: number
    /** Sessions with at least one product view */
    productViews: number
    /** Sessions with at least one add-to-cart */
    addToCart: number
    /** Sessions with checkout started */
    checkoutStart: number
    /** Sessions with checkout completed (conversions) */
    checkoutComplete: number
    /** Conversion rate (checkoutComplete / sessions) */
    conversionRate: number
}

export interface TopProduct {
    productId: string
    productName: string
    views: number
    addToCart: number
    purchases: number
    conversionRate: number
}

export interface RevenuePoint {
    date: string
    revenue: number
    orderCount: number
    currency: string
}

export interface DashboardKPIs {
    /** Total visitors (unique sessions) in the period */
    visitors: number
    /** Total orders completed */
    orders: number
    /** Total revenue in cents */
    revenue: number
    /** Average order value in cents */
    averageOrderValue: number
    /** Conversion rate (orders / visitors) */
    conversionRate: number
    /** Period start date */
    periodStart: string
    /** Period end date */
    periodEnd: string
}

type Period = 'today' | '7d' | '30d' | '90d'

// ── Helpers ───────────────────────────────────────────────────────────────

function getPeriodDates(period: Period): { start: string; end: string } {
    const now = new Date()
    const end = now.toISOString()
    const startDate = new Date(now)

    switch (period) {
        case 'today':
            startDate.setHours(0, 0, 0, 0)
            break
        case '7d':
            startDate.setDate(startDate.getDate() - 7)
            break
        case '30d':
            startDate.setDate(startDate.getDate() - 30)
            break
        case '90d':
            startDate.setDate(startDate.getDate() - 90)
            break
    }

    return { start: startDate.toISOString(), end }
}

// ── Query Functions ───────────────────────────────────────────────────────

/**
 * Get dashboard KPIs for a tenant.
 */
export async function getDashboardKPIs(
    tenantId: string,
    period: Period = '30d'
): Promise<DashboardKPIs> {
    const supabase = createAdminClient()
    const { start, end } = getPeriodDates(period)

    // Fetch all events in the period
    const { data: events } = await supabase
        .from('analytics_events')
        .select('event_type, properties, session_id')
        .eq('tenant_id', tenantId)
        .gte('created_at', start)
        .lte('created_at', end)

    if (!events?.length) {
        return {
            visitors: 0, orders: 0, revenue: 0,
            averageOrderValue: 0, conversionRate: 0,
            periodStart: start, periodEnd: end,
        }
    }

    const sessions = new Set(events.map(e => e.session_id)).size
    const orderEvents = events.filter(e => e.event_type === 'checkout_complete')
    const orders = orderEvents.length
    const revenue = orderEvents.reduce((sum, e) => {
        const props = e.properties as Record<string, unknown>
        return sum + (Number(props?.total) || 0)
    }, 0)

    return {
        visitors: sessions,
        orders,
        revenue,
        averageOrderValue: orders > 0 ? Math.round(revenue / orders) : 0,
        conversionRate: sessions > 0 ? Number((orders / sessions * 100).toFixed(1)) : 0,
        periodStart: start,
        periodEnd: end,
    }
}

/**
 * Get the conversion funnel for a tenant.
 */
export async function getConversionFunnel(
    tenantId: string,
    period: Period = '30d'
): Promise<ConversionFunnel> {
    const supabase = createAdminClient()
    const { start, end } = getPeriodDates(period)

    const { data: events } = await supabase
        .from('analytics_events')
        .select('event_type, session_id')
        .eq('tenant_id', tenantId)
        .gte('created_at', start)
        .lte('created_at', end)

    if (!events?.length) {
        return {
            sessions: 0, pageViews: 0, productViews: 0,
            addToCart: 0, checkoutStart: 0, checkoutComplete: 0,
            conversionRate: 0,
        }
    }

    // Group by session, check which stages each session reached
    const sessionEvents = new Map<string, Set<string>>()
    for (const event of events) {
        if (!sessionEvents.has(event.session_id)) {
            sessionEvents.set(event.session_id, new Set())
        }
        sessionEvents.get(event.session_id)!.add(event.event_type)
    }

    const sessions = sessionEvents.size
    let pageViews = 0, productViews = 0, addToCart = 0, checkoutStart = 0, checkoutComplete = 0

    for (const types of sessionEvents.values()) {
        if (types.has('page_view')) pageViews++
        if (types.has('product_view')) productViews++
        if (types.has('add_to_cart')) addToCart++
        if (types.has('checkout_start')) checkoutStart++
        if (types.has('checkout_complete')) checkoutComplete++
    }

    return {
        sessions, pageViews, productViews, addToCart,
        checkoutStart, checkoutComplete,
        conversionRate: sessions > 0 ? Number((checkoutComplete / sessions * 100).toFixed(1)) : 0,
    }
}

/**
 * Get top products by views/purchases.
 */
export async function getTopProducts(
    tenantId: string,
    period: Period = '30d',
    limit = 10
): Promise<TopProduct[]> {
    const supabase = createAdminClient()
    const { start, end } = getPeriodDates(period)

    const { data: events } = await supabase
        .from('analytics_events')
        .select('event_type, properties')
        .eq('tenant_id', tenantId)
        .in('event_type', ['product_view', 'add_to_cart', 'checkout_complete'])
        .gte('created_at', start)
        .lte('created_at', end)

    if (!events?.length) return []

    // Aggregate by product
    const products = new Map<string, { name: string; views: number; adds: number; purchases: number }>()

    for (const event of events) {
        const props = event.properties as Record<string, unknown>
        const productId = String(props?.product_id ?? '')
        if (!productId) continue

        if (!products.has(productId)) {
            products.set(productId, {
                name: String(props?.product_name ?? productId),
                views: 0, adds: 0, purchases: 0,
            })
        }

        const p = products.get(productId)!
        switch (event.event_type) {
            case 'product_view': p.views++; break
            case 'add_to_cart': p.adds++; break
            case 'checkout_complete': p.purchases++; break
        }
    }

    return Array.from(products.entries())
        .map(([id, data]) => ({
            productId: id,
            productName: data.name,
            views: data.views,
            addToCart: data.adds,
            purchases: data.purchases,
            conversionRate: data.views > 0 ? Number((data.purchases / data.views * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, limit)
}

/**
 * Get revenue timeline for charts.
 */
export async function getRevenueTimeline(
    tenantId: string,
    period: Period = '30d',
    granularity: 'day' | 'week' = 'day'
): Promise<RevenuePoint[]> {
    const supabase = createAdminClient()
    const { start, end } = getPeriodDates(period)

    const { data: events } = await supabase
        .from('analytics_events')
        .select('properties, created_at')
        .eq('tenant_id', tenantId)
        .eq('event_type', 'checkout_complete')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true })

    if (!events?.length) return []

    // Group by date
    const buckets = new Map<string, { revenue: number; count: number }>()

    for (const event of events) {
        const date = new Date(event.created_at as string)
        let bucketKey: string

        if (granularity === 'day') {
            bucketKey = date.toISOString().split('T')[0]
        } else {
            // Week: use Monday as bucket key
            const day = date.getDay()
            const diff = date.getDate() - day + (day === 0 ? -6 : 1)
            date.setDate(diff)
            bucketKey = date.toISOString().split('T')[0]
        }

        if (!buckets.has(bucketKey)) {
            buckets.set(bucketKey, { revenue: 0, count: 0 })
        }

        const props = event.properties as Record<string, unknown>
        const bucket = buckets.get(bucketKey)!
        bucket.revenue += Number(props?.total ?? 0)
        bucket.count++
    }

    return Array.from(buckets.entries()).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orderCount: data.count,
        currency: 'CHF',
    }))
}

/**
 * Get visitor count for a tenant.
 */
export async function getVisitorCount(
    tenantId: string,
    period: Period = '30d'
): Promise<{ total: number; unique: number }> {
    const supabase = createAdminClient()
    const { start, end } = getPeriodDates(period)

    const { data: events } = await supabase
        .from('analytics_events')
        .select('session_id')
        .eq('tenant_id', tenantId)
        .eq('event_type', 'page_view')
        .gte('created_at', start)
        .lte('created_at', end)

    if (!events?.length) return { total: 0, unique: 0 }

    const uniqueSessions = new Set(events.map(e => e.session_id))
    return { total: events.length, unique: uniqueSessions.size }
}

/**
 * Get module usage stats (for SuperAdmin dashboard).
 */
export async function getModuleUsage(
    tenantId: string,
    period: Period = '30d'
): Promise<Array<{ moduleKey: string; interactions: number; lastUsed: string | null }>> {
    const supabase = createAdminClient()
    const { start, end } = getPeriodDates(period)

    const { data: events } = await supabase
        .from('analytics_events')
        .select('properties, created_at')
        .eq('tenant_id', tenantId)
        .eq('event_type', 'module_interaction')
        .gte('created_at', start)
        .lte('created_at', end)

    if (!events?.length) return []

    const modules = new Map<string, { count: number; lastUsed: string }>()

    for (const event of events) {
        const props = event.properties as Record<string, unknown>
        const moduleKey = String(props?.module_key ?? 'unknown')

        if (!modules.has(moduleKey)) {
            modules.set(moduleKey, { count: 0, lastUsed: event.created_at as string })
        }
        const m = modules.get(moduleKey)!
        m.count++
        if ((event.created_at as string) > m.lastUsed) m.lastUsed = event.created_at as string
    }

    return Array.from(modules.entries())
        .map(([key, data]) => ({
            moduleKey: key,
            interactions: data.count,
            lastUsed: data.lastUsed,
        }))
        .sort((a, b) => b.interactions - a.interactions)
}
