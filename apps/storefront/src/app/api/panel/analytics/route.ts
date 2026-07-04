import { NextRequest, NextResponse } from 'next/server'
import { getDashboardKPIs, getRevenueTimeline, getTopProducts } from '@/lib/analytics/dashboard-queries'
import { withPanelGuard } from '@/lib/panel-guard'
import { toPanelErrorResponse } from '@/lib/panel-api-errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { withRateLimit, PANEL_GUARD } from '@/lib/security/api-rate-guard'
import { logger } from '@/lib/logger'

type AnalyticsPeriod = '7d' | '30d' | '90d'

function parsePeriod(value: string | null): AnalyticsPeriod {
    return value === '7d' || value === '90d' ? value : '30d'
}

export async function GET(req: NextRequest) {
    try {
        const rateLimitResult = await withRateLimit(req, PANEL_GUARD)
        if (rateLimitResult.limited) return rateLimitResult.response!

        const { tenantId } = await withPanelGuard()
        const period = parsePeriod(new URL(req.url).searchParams.get('period'))
        const [kpis, revenueTimeline, products, customers, storage] = await Promise.all([
            getDashboardKPIs(tenantId, period),
            getRevenueTimeline(tenantId, period),
            getTopProducts(tenantId, period),
            fetchCustomerCount(tenantId),
            fetchStorageUsage(tenantId),
        ])

        return NextResponse.json({
            period: {
                days: period === '7d' ? 7 : period === '90d' ? 90 : 30,
                since: kpis.periodStart,
            },
            revenue: {
                total: kpis.revenue,
                orderCount: kpis.orders,
                averageOrderValue: kpis.averageOrderValue,
            },
            orderTrend: revenueTimeline.map(({ date, orderCount }) => ({
                date,
                orders: orderCount,
            })),
            topProducts: products.map(({ productName, views }) => ({
                name: productName,
                views,
            })),
            customers,
            storage,
        })
    } catch (error) {
        logger.error('[analytics] Error:', error)
        return toPanelErrorResponse(error)
    }
}

async function fetchCustomerCount(tenantId: string) {
    const admin = createAdminClient()
    const { count: total } = await admin
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('event_type', 'customer_registered')

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const { count: thisMonth } = await admin
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('event_type', 'customer_registered')
        .gte('created_at', monthStart.toISOString())

    return { total: total || 0, thisMonth: thisMonth || 0 }
}

async function fetchStorageUsage(tenantId: string) {
    try {
        const { data } = await createAdminClient().rpc('get_tenant_storage_usage', {
            p_tenant_id: tenantId,
        })
        return data || null
    } catch {
        return null
    }
}
