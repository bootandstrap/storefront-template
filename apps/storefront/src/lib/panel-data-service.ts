/**
 * Panel Data Service — Unified, cached data layer for all panel pages.
 *
 * SSOT for ALL panel metrics: products, orders, customers, revenue.
 * Uses React `cache()` to deduplicate within the same RSC request tree.
 *
 * Rules:
 *   - Counts (products, orders, categories, customers) → ALWAYS from Medusa
 *   - Admin count → Supabase profiles (limits layer, admins don't exist in Medusa)
 *   - Revenue → computed from Medusa orders, shared by all consumers
 *   - Config / governance → from getConfigForTenant()
 *
 * Consumers:
 *   - dashboard-context.ts (dashboard page)
 *   - ventas/data.ts (sales hub)
 *   - mi-tienda/data.ts (store hub)
 *   - layout.tsx (readiness, achievements)
 *
 * Zone: 🔴 LOCKED — This is THE data source for the panel. Do NOT create
 *                    parallel fetch paths. All panel metrics go through here.
 */

import { cache } from 'react'
import { getConfigForTenant } from '@/lib/config'
import type { AppConfig, StoreConfig, FeatureFlags, PlanLimits } from '@/lib/config'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import type { TenantMedusaScope } from '@/lib/medusa/admin-core'
import {
    getProductCount,
    getCategoryCount,
    getOrdersThisMonth,
    getCustomerCount,
    getRecentOrders,
    getAdminOrders,
    type AdminOrder,
    type AdminOrderFull,
} from '@/lib/medusa/admin'
import {
    resolveCurrencyContext,
    sumRevenueByCurrency,
    revenueByDayAndCurrency,
    formatAmount,
    type CurrencyRevenue,
    type CurrencyContext,
} from '@/lib/currency-engine'
import { getTopProducts, type TopProduct } from '@/lib/medusa/admin-analytics'
import { getLowStockItems, type LowStockItem } from '@/lib/medusa/admin-inventory'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RevenueData {
    primaryRevenue: CurrencyRevenue
    secondaryRevenues: CurrencyRevenue[]
    formattedRevenue: string
    revenueThisMonth: number
    /** POS revenue in primary currency */
    posPrimary: number
    /** Online revenue in primary currency */
    onlinePrimary: number
    hasPosOrders: boolean
    /** Revenue breakdown by day (for charts) */
    revenueByDay: ReturnType<typeof revenueByDayAndCurrency>
    /** Order count by day */
    ordersByDay: { date: string; orders: number }[]
    /** 7-day sparkline (legacy compat) */
    sparklineOrders: number[]
    currencyCtx: CurrencyContext
}

export interface PanelMetrics {
    // ── Governance ──
    appConfig: AppConfig
    storeConfig: StoreConfig
    featureFlags: FeatureFlags
    planLimits: PlanLimits
    tenantId: string

    // ── Counts (ALL from Medusa) ──
    productCount: number
    categoryCount: number
    ordersThisMonth: number
    /** From Medusa /admin/customers — commerce SSOT */
    customerCount: number
    /** From Supabase profiles — needed for max_admin_users limit */
    adminCount: number

    // ── Revenue ──
    revenue: RevenueData

    // ── Lists ──
    recentOrders: AdminOrder[]
    monthOrders: AdminOrderFull[]
    topProducts: TopProduct[]
    lowStockItems: LowStockItem[]
    pendingOrderCount: number
    lowStockCount: number

    // ── Medusa scope (for downstream queries) ──
    scope: TenantMedusaScope | null

    // ── Status ──
    medusaDegraded: boolean
    fetchedAt: string
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function computeRevenue(
    monthOrders: AdminOrderFull[],
    storeConfig: StoreConfig,
    featureFlags: FeatureFlags,
    lang: string,
    chartDays: number = 30,
): RevenueData {
    const currencyCtx = resolveCurrencyContext(storeConfig, featureFlags)
    const revenueOrders = monthOrders.filter(
        o => o.status !== 'canceled' && o.status !== 'cancelled'
    )

    // Revenue breakdown
    const revenueBreakdown = sumRevenueByCurrency(revenueOrders, currencyCtx)
    const primaryRevenue = revenueBreakdown.find(r => r.code === currencyCtx.primary) ?? {
        code: currencyCtx.primary, amount: 0, orderCount: 0, avgOrderValue: 0,
        baseCode: currencyCtx.primary, baseAmount: 0,
    }
    const secondaryRevenues = revenueBreakdown.filter(
        r => r.code !== currencyCtx.primary && r.amount > 0
    )
    const formattedRevenue = formatAmount(primaryRevenue.amount, primaryRevenue.code, lang)
    const revenueThisMonth = primaryRevenue.amount

    // POS vs Online split
    const posOrders = revenueOrders.filter(o => {
        const metadata = o.metadata as Record<string, unknown> | null
        const source = metadata?.source
        return source === 'pos' || source === 'pos-kiosk'
    })
    const onlineOrders = revenueOrders.filter(o => {
        const metadata = o.metadata as Record<string, unknown> | null
        const source = metadata?.source
        return source !== 'pos' && source !== 'pos-kiosk'
    })
    const posRevenueBreakdown = sumRevenueByCurrency(posOrders, currencyCtx)
    const onlineRevenueBreakdown = sumRevenueByCurrency(onlineOrders, currencyCtx)
    const posPrimary = posRevenueBreakdown.find(r => r.code === currencyCtx.primary)?.amount ?? 0
    const onlinePrimary = onlineRevenueBreakdown.find(r => r.code === currencyCtx.primary)?.amount ?? 0
    const hasPosOrders = posOrders.length > 0

    // Chart data — N days
    const revenueByDay = revenueByDayAndCurrency(revenueOrders, currencyCtx, chartDays)
    const ordersByDay: { date: string; orders: number }[] = []
    for (let i = chartDays - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const count = monthOrders.filter(o => o.created_at?.startsWith(dateStr)).length
        ordersByDay.push({ date: dateStr, orders: count })
    }

    // 7-day sparkline (legacy compat for KPI cards)
    const sparklineOrders = new Array(7).fill(0) as number[]
    for (const order of monthOrders) {
        if (order.created_at) {
            const day = new Date(order.created_at).getDay()
            sparklineOrders[day]++
        }
    }

    return {
        primaryRevenue,
        secondaryRevenues,
        formattedRevenue,
        revenueThisMonth,
        posPrimary,
        onlinePrimary,
        hasPosOrders,
        revenueByDay,
        ordersByDay,
        sparklineOrders,
        currencyCtx,
    }
}

// ---------------------------------------------------------------------------
// Main Entry Point — React cache() ensures one fetch per RSC request tree
// ---------------------------------------------------------------------------

/**
 * Get all panel metrics for a tenant.
 * Cached per RSC request — safe to call from dashboard, layout, and sub-pages.
 */
export const getPanelMetrics = cache(async (
    tenantId: string,
    lang: string = 'es',
): Promise<PanelMetrics> => {
    const appConfig = await getConfigForTenant(tenantId)
    const { planLimits, config: storeConfig, featureFlags } = appConfig

    // ── Medusa data (graceful degradation) ──
    let productCount = 0
    let categoryCount = 0
    let ordersThisMonth = 0
    let customerCount = 0
    let adminCount = 0
    let recentOrders: AdminOrder[] = []
    let monthOrders: AdminOrderFull[] = []
    let topProducts: TopProduct[] = []
    let lowStockItems: LowStockItem[] = []
    let medusaDegraded = false
    let scope: TenantMedusaScope | null = null

    try {
        scope = await getTenantMedusaScope(tenantId)

        const [pc, cc, otm, custCount, ro, monthOrdersRes] = await Promise.all([
            getProductCount(scope),
            getCategoryCount(scope),
            getOrdersThisMonth(scope),
            getCustomerCount(scope),  // ← FROM MEDUSA, not Supabase
            getRecentOrders(5, scope),
            getAdminOrders({ limit: 500, status: 'all' }, scope),
        ])

        productCount = pc
        categoryCount = cc
        ordersThisMonth = otm
        customerCount = custCount
        recentOrders = ro
        monthOrders = monthOrdersRes.orders

        // Non-blocking secondary data
        try {
            const [tp, ls] = await Promise.all([
                getTopProducts(5, scope, storeConfig.default_currency ?? 'eur'),
                getLowStockItems(
                    (storeConfig as Record<string, unknown>).low_stock_threshold as number ?? 5,
                    scope,
                ),
            ])
            topProducts = tp
            lowStockItems = ls
        } catch { /* gracefully degrade */ }
    } catch (err) {
        logger.error(
            '[PanelDataService] Medusa fetch failed:',
            err instanceof Error ? err.message : err,
        )
        medusaDegraded = true
    }

    // ── Admin count (always from Supabase — admins don't exist in Medusa) ──
    try {
        const supabase = await createClient()
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .in('role', ['owner', 'super_admin'])
        adminCount = count ?? 0
    } catch { /* degrade */ }

    // ── Revenue computation (30-day chart) ──
    const revenue = computeRevenue(monthOrders, storeConfig, featureFlags, lang, 30)

    // ── Derived counts ──
    const pendingOrderCount = monthOrders.filter(o => o.status === 'pending').length
    const lowStockCount = lowStockItems.length

    return {
        appConfig,
        storeConfig,
        featureFlags,
        planLimits,
        tenantId,
        productCount,
        categoryCount,
        ordersThisMonth,
        customerCount,
        adminCount,
        revenue,
        recentOrders,
        monthOrders,
        topProducts,
        lowStockItems,
        pendingOrderCount,
        lowStockCount,
        scope,
        medusaDegraded,
        fetchedAt: new Date().toISOString(),
    }
})
