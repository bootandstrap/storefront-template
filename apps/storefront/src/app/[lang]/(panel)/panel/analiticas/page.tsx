/**
 * Analytics Dashboard — Owner Panel (SOTA + Multi-Currency)
 *
 * SOTA features:
 * - Revenue KPI cards with per-currency breakdown
 * - Interactive Chart.js: revenue trend line + orders bar (dual-axis)
 * - Revenue-by-currency doughnut chart (multi-currency tenants)
 * - Top products board with revenue + units sold
 * - Conversion funnel with animated bars
 * - Real-time data from Medusa + Supabase analytics
 *
 * Full CurrencyEngine integration for multi-currency consistency.
 *
 * @module analytics-page
 */

import { withPanelGuard } from '@/lib/panel-guard'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getDashboardMetrics, getTopProducts } from '@/lib/medusa/admin-analytics'
import { resolveCurrencyContext, formatAmount } from '@/lib/currency-engine'
import { 
    SotaBentoGrid, 
    SotaBentoItem, 
    SotaGlassCard, 
    SotaMetric, 
    SotaFeatureGateWrapper 
} from '@/components/panel'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import AnalyticsCharts from './AnalyticsCharts'
import {
    Eye,
    ShoppingBag,
    ArrowRight,
    TrendingUp,
    BarChart3,
    DollarSign,
    ShoppingCart,
    Users,
    Award,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.analytics.title') }
}

const FUNNEL_ICONS: Record<string, React.ReactNode> = {
    page_view: <Eye className="w-4 h-4" />,
    product_view: <ShoppingBag className="w-4 h-4" />,
    add_to_cart: <ShoppingCart className="w-4 h-4" />,
    checkout_start: <ArrowRight className="w-4 h-4" />,
    order_placed: <TrendingUp className="w-4 h-4" />,
}

export default async function AnalyticsPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { tenantId, appConfig } = await withPanelGuard()
    const { featureFlags, config: storeConfig, planLimits } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const isLocked = !featureFlags.enable_analytics
    const currencyCtx = resolveCurrencyContext(storeConfig, featureFlags)

    // ── Fetch analytics data ──────────────────────────────────────────
    let pageViews7d = 0
    let productViews = 0
    let funnelCounts: Record<string, number> = {}
    let dashboardMetrics: Awaited<ReturnType<typeof getDashboardMetrics>> | null = null
    let topProducts: Awaited<ReturnType<typeof getTopProducts>> = []

    if (!isLocked) {
        const cutoffMs = 7 * 24 * 60 * 60 * 1000
        const supabase = await createClient()
        const sevenDaysAgo = new Date(new Date().getTime() - cutoffMs).toISOString()

        // Parallel fetch: Supabase analytics + Medusa revenue + top products
        const scope = await getTenantMedusaScope(tenantId)

        const [pageViewsRes, topProductsRes, funnelRes, metrics, topProds] = await Promise.all([
            supabase
                .from('analytics_events')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('event_type', 'page_view')
                .gte('created_at', sevenDaysAgo),
            supabase
                .from('analytics_events')
                .select('properties')
                .eq('tenant_id', tenantId)
                .eq('event_type', 'product_view')
                .gte('created_at', sevenDaysAgo)
                .limit(50),
            supabase
                .from('analytics_events')
                .select('event_type')
                .eq('tenant_id', tenantId)
                .in('event_type', ['page_view', 'product_view', 'add_to_cart', 'checkout_start', 'order_placed'])
                .gte('created_at', sevenDaysAgo),
            getDashboardMetrics(scope, currencyCtx).catch(() => null),
            getTopProducts(5, scope, currencyCtx.primary).catch(() => []),
        ])

        pageViews7d = pageViewsRes.count ?? 0
        productViews = topProductsRes.data?.length ?? 0
        dashboardMetrics = metrics
        topProducts = topProds

        const funnelData = funnelRes.data ?? []
        for (const row of funnelData) {
            funnelCounts[row.event_type] = (funnelCounts[row.event_type] ?? 0) + 1
        }
    }

    const conversionRate = pageViews7d > 0
        ? ((funnelCounts['order_placed'] ?? 0) / pageViews7d * 100).toFixed(1)
        : '0.0'

    const funnelSteps = [
        { key: 'page_view', label: t('panel.analytics.pageViews'), count: funnelCounts['page_view'] ?? pageViews7d },
        { key: 'product_view', label: t('panel.analytics.productViews'), count: funnelCounts['product_view'] ?? productViews },
        { key: 'add_to_cart', label: t('panel.analytics.addToCart'), count: funnelCounts['add_to_cart'] ?? 0 },
        { key: 'checkout_start', label: t('panel.analytics.checkoutStart'), count: funnelCounts['checkout_start'] ?? 0 },
        { key: 'order_placed', label: t('panel.analytics.orderPlaced'), count: funnelCounts['order_placed'] ?? 0 },
    ]

    // Revenue KPIs
    const revMonth = dashboardMetrics?.revenue_this_month
    const revWeek = dashboardMetrics?.revenue_this_week
    const revToday = dashboardMetrics?.revenue_today

    return (
        <SotaFeatureGateWrapper flag="enable_analytics" isLocked={isLocked}>
            <div className="space-y-8 max-w-6xl">

                {/* ── Header ── */}
                <PanelPageHeader
                    title={t('panel.analytics.title')}
                    subtitle={t('panel.analytics.subtitle')}
                    icon={<BarChart3 className="w-5 h-5" />}
                />

                <SotaBentoGrid>
                    {/* ── Revenue KPI Cards ── */}
                    <SotaBentoItem colSpan={{ base: 12, lg: 4 }}>
                        <SotaGlassCard className="h-full" glowColor="emerald">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <DollarSign className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-tx-muted font-medium">{t('panel.analytics.revenueMonth') || 'Revenue this Month'}</p>
                                    <p className="text-xl font-bold font-display text-tx tabular-nums">
                                        {revMonth ? formatAmount(revMonth.totalBaseAmount, revMonth.primary.code, lang) : '—'}
                                    </p>
                                </div>
                            </div>
                            {/* Multi-currency breakdown */}
                            {revMonth && revMonth.isMulti && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {revMonth.all.filter(r => r.code !== currencyCtx.primary && r.amount > 0).map(r => (
                                        <span key={r.code} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sf-2/80 text-tx-sec border border-sf-3/30">
                                            +{formatAmount(r.amount, r.code, lang)}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-sf-3/20">
                                <div>
                                    <p className="text-[10px] text-tx-muted">{t('panel.stats.ordersMonth') || 'Orders'}</p>
                                    <p className="text-sm font-bold text-tx tabular-nums">{dashboardMetrics?.orders_this_month ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-tx-muted">AOV</p>
                                    <p className="text-sm font-bold text-tx tabular-nums">
                                        {revMonth ? formatAmount(revMonth.primary.avgOrderValue, revMonth.primary.code, lang) : '—'}
                                    </p>
                                </div>
                            </div>
                        </SotaGlassCard>
                    </SotaBentoItem>

                    <SotaBentoItem colSpan={{ base: 12, sm: 6, lg: 4 }}>
                        <SotaGlassCard className="h-full" glowColor="blue">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-tx-muted font-medium">{t('panel.analytics.revenueWeek') || 'This Week'}</p>
                                    <p className="text-xl font-bold font-display text-tx tabular-nums">
                                        {revWeek ? formatAmount(revWeek.totalBaseAmount, revWeek.primary.code, lang) : '—'}
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-tx-muted mt-auto">
                                {dashboardMetrics?.orders_this_week ?? 0} {t('panel.analytics.ordersThisWeek') || 'orders this week'}
                            </p>
                        </SotaGlassCard>
                    </SotaBentoItem>

                    <SotaBentoItem colSpan={{ base: 12, sm: 6, lg: 4 }}>
                        <SotaGlassCard className="h-full" glowColor="purple">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                    <ShoppingCart className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-tx-muted font-medium">{t('panel.analytics.revenueToday') || 'Today'}</p>
                                    <p className="text-xl font-bold font-display text-tx tabular-nums">
                                        {revToday ? formatAmount(revToday.totalBaseAmount, revToday.primary.code, lang) : '—'}
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-tx-muted mt-auto">
                                {dashboardMetrics?.orders_today ?? 0} {t('panel.analytics.ordersToday') || 'orders today'}
                            </p>
                        </SotaGlassCard>
                    </SotaBentoItem>

                    {/* ── Traffic Stats ── */}
                    <SotaBentoItem colSpan={{ base: 12, lg: 4 }}>
                        <SotaMetric
                            label={t('panel.analytics.pageViews7d')}
                            value={pageViews7d.toLocaleString()}
                            icon={<Eye className="w-5 h-5" />}
                            glowColor="blue"
                        />
                    </SotaBentoItem>
                    <SotaBentoItem colSpan={{ base: 12, lg: 4 }}>
                        <SotaMetric
                            label={t('panel.analytics.productViews7d')}
                            value={productViews.toLocaleString()}
                            icon={<ShoppingBag className="w-5 h-5" />}
                            glowColor="purple"
                        />
                    </SotaBentoItem>
                    <SotaBentoItem colSpan={{ base: 12, lg: 4 }}>
                        <SotaMetric
                            label={t('panel.analytics.conversionRate')}
                            value={`${conversionRate}%`}
                            icon={<TrendingUp className="w-5 h-5" />}
                            glowColor="emerald"
                        />
                    </SotaBentoItem>

                    {/* ── Interactive Charts ── */}
                    <SotaBentoItem colSpan={{ base: 12 }}>
                        <SotaGlassCard glowColor="blue">
                            <AnalyticsCharts
                                revenueByDay={dashboardMetrics?.revenue_by_day ?? []}
                                ordersByDay={dashboardMetrics?.orders_by_day ?? []}
                                currencyCtx={currencyCtx}
                                revenueMonth={revMonth ?? { primary: { code: currencyCtx.primary, amount: 0, orderCount: 0, avgOrderValue: 0, baseCode: currencyCtx.primary, baseAmount: 0 }, all: [], isMulti: false, totalBaseAmount: 0 }}
                                topProducts={topProducts}
                                lang={lang}
                                labels={{
                                    revenue: t('panel.stats.revenue') || 'Revenue',
                                    orders: t('panel.stats.ordersMonth') || 'Orders',
                                    chartTitle: t('panel.analytics.revenueTrend') || 'Revenue Trend',
                                    currencyBreakdown: t('panel.analytics.currencyBreakdown') || 'Currency Breakdown',
                                    topProducts: t('panel.analytics.topProducts') || 'Top Products',
                                }}
                            />
                        </SotaGlassCard>
                    </SotaBentoItem>

                    {/* ── Conversion Funnel ── */}
                    <SotaBentoItem colSpan={{ base: 12 }}>
                        <SotaGlassCard glowColor="brand">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-bold font-display text-tx">
                                    {t('panel.analytics.conversionFunnel')}
                                </h3>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-brand bg-brand-subtle px-3 py-1 rounded-full">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    <span>{conversionRate}% {t('panel.analytics.conversionRate')}</span>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {funnelSteps.map((step, i) => {
                                    const maxCount = Math.max(...funnelSteps.map(s => s.count), 1)
                                    const barWidth = Math.max((step.count / maxCount) * 100, 2)

                                    const prevCount = i > 0 ? funnelSteps[i - 1].count : null
                                    const dropOff = prevCount && prevCount > 0
                                        ? ((1 - step.count / prevCount) * 100).toFixed(0)
                                        : null

                                    return (
                                        <div key={step.key}>
                                            {/* Drop-off badge between steps */}
                                            {dropOff && (
                                                <div className="flex items-center gap-2 mb-3 pl-3">
                                                    <div className="w-px h-6 bg-sf-3" />
                                                    <span className="text-[10px] font-semibold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full ring-1 ring-red-500/20">
                                                        −{dropOff}%
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-5 group">
                                                <div className="w-10 h-10 rounded-xl bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm text-tx-muted flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform group-hover:text-brand">
                                                    {FUNNEL_ICONS[step.key] ?? <Eye className="w-5 h-5" />}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium text-tx-sec">
                                                            {step.label}
                                                        </span>
                                                        <span className="text-sm font-bold font-display text-tx tabular-nums">
                                                            {step.count.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="h-2.5 w-full bg-sf-2/50 rounded-full overflow-hidden inset-shadow-sm">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light transition-all duration-1000 ease-out"
                                                            style={{ width: `${barWidth}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </SotaGlassCard>
                    </SotaBentoItem>

                    {/* ── Top Products Board ── */}
                    {topProducts.length > 0 && (
                        <SotaBentoItem colSpan={{ base: 12 }}>
                            <SotaGlassCard glowColor="purple">
                                <div className="flex items-center gap-3 mb-6">
                                    <Award className="w-5 h-5 text-purple-500" />
                                    <h3 className="text-lg font-bold font-display text-tx">
                                        {t('panel.analytics.topProducts') || 'Top Products'}
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    {topProducts.map((product, idx) => {
                                        const maxRev = Math.max(...topProducts.map(p => p.revenue), 1)
                                        const barPct = Math.max((product.revenue / maxRev) * 100, 3)
                                        const medalColors = ['#f59e0b', '#94a3b8', '#cd7f32']
                                        
                                        return (
                                            <div key={product.product_id} className="flex items-center gap-4 group">
                                                {/* Rank badge */}
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-transform group-hover:scale-110"
                                                    style={{
                                                        backgroundColor: idx < 3 ? `${medalColors[idx]}15` : 'var(--color-surface-2)',
                                                        color: idx < 3 ? medalColors[idx] : 'var(--color-text-muted)',
                                                    }}
                                                >
                                                    {idx + 1}
                                                </div>

                                                {/* Thumbnail */}
                                                {product.thumbnail && (
                                                    <img
                                                        src={product.thumbnail}
                                                        alt={product.title}
                                                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-sf-3/30"
                                                    />
                                                )}

                                                {/* Info + bar */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-sm font-medium text-tx truncate">
                                                            {product.title}
                                                        </span>
                                                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                                            <span className="text-xs text-tx-muted tabular-nums">
                                                                {product.units_sold} ud.
                                                            </span>
                                                            <span className="text-sm font-bold text-tx tabular-nums">
                                                                {formatAmount(product.revenue, product.currency_code, lang)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-sf-2/50 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-400 transition-all duration-1000 ease-out"
                                                            style={{ width: `${barPct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </SotaGlassCard>
                        </SotaBentoItem>
                    )}
                </SotaBentoGrid>
            </div>
        </SotaFeatureGateWrapper>
    )
}
