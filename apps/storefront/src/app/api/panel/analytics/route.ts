import { NextRequest, NextResponse } from 'next/server'
import { withPanelGuard } from '@/lib/panel-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { withRateLimit, PANEL_GUARD } from '@/lib/security/api-rate-guard'
import { logger } from '@/lib/logger'

/**
 * GET /api/panel/analytics
 *
 * Returns dashboard analytics for the authenticated tenant.
 * Rate limited via platform-wide API rate guard.
 */
export async function GET(req: NextRequest) {
    try {
        const rateLimitResult = await withRateLimit(req, PANEL_GUARD)
        if (rateLimitResult.limited) return rateLimitResult.response!

        const { tenantId } = await withPanelGuard()
        const admin = createAdminClient()
        const { searchParams } = new URL(req.url)
        const period = searchParams.get('period') || '30d'

        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

        // Fetch in parallel
        const [revenueData, orderTrend, topProducts, customerCount, storageUsage] =
            await Promise.allSettled([
                fetchRevenue(admin, tenantId, since),
                fetchOrderTrend(admin, tenantId, since),
                fetchTopProducts(admin, tenantId, since),
                fetchCustomerCount(admin, tenantId),
                fetchStorageUsage(admin, tenantId),
            ])

        return NextResponse.json({
            period: { days, since },
            revenue: revenueData.status === 'fulfilled' ? revenueData.value : null,
            orderTrend: orderTrend.status === 'fulfilled' ? orderTrend.value : [],
            topProducts: topProducts.status === 'fulfilled' ? topProducts.value : [],
            customers: customerCount.status === 'fulfilled' ? customerCount.value : null,
            storage: storageUsage.status === 'fulfilled' ? storageUsage.value : null,
        })
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        logger.error('[analytics] Error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

// ── Data fetchers ─────────────────────────────────────────────────────

async function fetchRevenue(admin: ReturnType<typeof createAdminClient>, tenantId: string, since: string) {
    // Analytics events with type 'order_completed' contain revenue data
    const { data } = await (admin as any)
        .from('analytics_events')
        .select('metadata')
        .eq('tenant_id', tenantId)
        .eq('event_type', 'order_completed')
        .gte('created_at', since)

    let total = 0
    let orderCount = 0
    if (data) {
        for (const row of data) {
            const amount = (row.metadata as Record<string, unknown>)?.total
            if (typeof amount === 'number') total += amount
            orderCount++
        }
    }

    return {
        total: Math.round(total * 100) / 100,
        orderCount,
        averageOrderValue: orderCount > 0 ? Math.round((total / orderCount) * 100) / 100 : 0,
    }
}

async function fetchOrderTrend(admin: ReturnType<typeof createAdminClient>, tenantId: string, since: string) {
    const { data } = await (admin as any)
        .from('analytics_events')
        .select('created_at')
        .eq('tenant_id', tenantId)
        .eq('event_type', 'order_completed')
        .gte('created_at', since)
        .order('created_at', { ascending: true })

    if (!data?.length) return []

    // Group by date
    const byDate = new Map<string, number>()
    for (const row of data) {
        const date = new Date(row.created_at as string).toISOString().split('T')[0]
        byDate.set(date, (byDate.get(date) || 0) + 1)
    }

    return Array.from(byDate.entries()).map(([date, count]) => ({ date, orders: count }))
}

async function fetchTopProducts(admin: ReturnType<typeof createAdminClient>, tenantId: string, since: string) {
    const { data } = await (admin as any)
        .from('analytics_events')
        .select('metadata')
        .eq('tenant_id', tenantId)
        .eq('event_type', 'product_viewed')
        .gte('created_at', since)

    if (!data?.length) return []

    // Count product views
    const productViews = new Map<string, { name: string; views: number }>()
    for (const row of data) {
        const meta = row.metadata as Record<string, unknown>
        const id = meta?.product_id as string
        const name = (meta?.product_title as string) || id
        if (!id) continue
        const entry = productViews.get(id) || { name, views: 0 }
        entry.views++
        productViews.set(id, entry)
    }

    return Array.from(productViews.values())
        .sort((a, b) => b.views - a.views)
        .slice(0, 10)
}

async function fetchCustomerCount(admin: ReturnType<typeof createAdminClient>, tenantId: string) {
    const { count: total } = await (admin as any)
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('event_type', 'customer_registered')

    // This month
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const { count: thisMonth } = await (admin as any)
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('event_type', 'customer_registered')
        .gte('created_at', monthStart.toISOString())

    return { total: total || 0, thisMonth: thisMonth || 0 }
}

async function fetchStorageUsage(admin: ReturnType<typeof createAdminClient>, tenantId: string) {
    try {
        const { data } = await (admin as any).rpc('get_tenant_storage_usage', {
            p_tenant_id: tenantId,
        })
        return data || null
    } catch {
        return null
    }
}
