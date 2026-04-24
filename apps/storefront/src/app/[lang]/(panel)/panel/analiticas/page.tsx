/**
 * Analíticas Page — RSC entry point for the analytics dashboard
 *
 * Wires real data from panel-data-service + admin-analytics to the
 * AnalyticsCharts client component. Supports 7d/30d/90d period switching.
 *
 * Feature-gated by `enable_analytics` (SEO module).
 * Uses ModuleShell for consistent module page structure.
 *
 * @module panel/analiticas/page
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getDashboardMetrics, getTopProducts } from '@/lib/medusa/admin-analytics'
import { resolveCurrencyContext, formatAmount } from '@/lib/currency-engine'
import { getProductCount, getCustomerCount } from '@/lib/medusa/admin-orders'
import ModuleShell from '@/components/panel/ModuleShell'
import { BarChart3 } from 'lucide-react'
import AnalyticsCharts from './AnalyticsCharts'

// ---------------------------------------------------------------------------
// Period support
// ---------------------------------------------------------------------------

type AnalyticsPeriod = '7d' | '30d' | '90d'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AnaliticasPage({
    params,
    searchParams,
}: {
    params: Promise<{ lang: string }>
    searchParams: Promise<{ period?: string }>
}) {
    const { lang } = await params
    const sp = await searchParams
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const { tenantId, appConfig } = await withPanelGuard()
    const { featureFlags, planLimits, config } = appConfig

    const isLocked = !featureFlags.enable_analytics
    const period = (['7d', '30d', '90d'].includes(sp.period || '') ? sp.period : '30d') as AnalyticsPeriod

    // Resolve tier info for ModuleShell
    const tierInfo = {
        currentTier: featureFlags.enable_seo_tools ? 'SEO Avanzado' : featureFlags.enable_analytics ? 'Analytics' : 'Free',
        moduleKey: 'seo',
        nextTierFeatures: isLocked ? [
            'Revenue trends & charts',
            'Top products analysis',
            'Period comparison (7d/30d/90d)',
            'Multi-currency breakdown',
        ] : undefined,
        nextTierName: isLocked ? 'SEO Standard' : undefined,
        nextTierPrice: isLocked ? 15 : undefined,
    }

    if (isLocked) {
        return (
            <ModuleShell
                icon={<BarChart3 className="w-5 h-5" />}
                title={t('panel.analytics.title') || 'Analíticas'}
                subtitle={t('panel.analytics.subtitle') || 'Estadísticas y rendimiento de tu tienda'}
                isLocked={true}
                gateFlag="enable_analytics"
                tierInfo={tierInfo}
                lang={lang}
            >
                {null}
            </ModuleShell>
        )
    }

    // Fetch all data in parallel
    const scope = await getTenantMedusaScope(tenantId)
    const currencyCtx = resolveCurrencyContext(config, featureFlags)

    const [metrics, topProducts, productCount, customerCount] = await Promise.all([
        getDashboardMetrics(scope, currencyCtx),
        getTopProducts(10, scope, currencyCtx.primary),
        getProductCount(scope),
        getCustomerCount(scope),
    ])

    // Build KPI summary cards data
    const kpis = {
        revenueMonth: formatAmount(metrics.revenue_this_month.primary.amount, currencyCtx.primary, lang),
        ordersMonth: metrics.orders_this_month,
        avgOrderValue: formatAmount(metrics.revenue_this_month.primary.avgOrderValue, currencyCtx.primary, lang),
        newCustomers: metrics.new_customers_this_month,
        totalProducts: productCount,
        totalCustomers: customerCount,
        ordersToday: metrics.orders_today,
        ordersWeek: metrics.orders_this_week,
    }

    const labels = {
        revenue: t('panel.stats.revenue') || 'Ingresos',
        orders: t('panel.stats.ordersMonth') || 'Pedidos',
        chartTitle: t('panel.analytics.chartTitle') || 'Tendencia de ingresos',
        currencyBreakdown: t('panel.analytics.currencyBreakdown') || 'Desglose por moneda',
        topProducts: t('panel.analytics.topProducts') || 'Productos más vendidos',
        period7d: t('panel.analytics.period7d') || '7 días',
        period30d: t('panel.analytics.period30d') || '30 días',
        period90d: t('panel.analytics.period90d') || '90 días',
        avgOrder: t('panel.analytics.avgOrder') || 'Ticket medio',
        newCustomers: t('panel.analytics.newCustomers') || 'Nuevos clientes',
        today: t('panel.analytics.today') || 'Hoy',
        thisWeek: t('panel.analytics.thisWeek') || 'Esta semana',
        thisMonth: t('panel.analytics.thisMonth') || 'Este mes',
        products: t('panel.stats.products') || 'Productos',
        customers: t('panel.stats.customers') || 'Clientes',
    }

    return (
        <ModuleShell
            icon={<BarChart3 className="w-5 h-5" />}
            title={labels.revenue + ' & ' + labels.orders}
            subtitle={t('panel.analytics.subtitle') || 'Estadísticas y rendimiento de tu tienda'}
            isLocked={false}
            gateFlag="enable_analytics"
            tierInfo={tierInfo}
            lang={lang}
        >
            {/* ── Period Selector ────────────────── */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-sf-sec border border-brd-pri w-fit">
                {(['7d', '30d', '90d'] as const).map(p => (
                    <a
                        key={p}
                        href={`/${lang}/panel/analiticas?period=${p}`}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            period === p
                                ? 'bg-brand text-white shadow-sm'
                                : 'text-tx-sec hover:text-tx-pri'
                        }`}
                    >
                        {p === '7d' ? labels.period7d : p === '30d' ? labels.period30d : labels.period90d}
                    </a>
                ))}
            </div>

            {/* ── KPI Summary Cards ─────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KPICard label={labels.revenue} value={kpis.revenueMonth} subtitle={labels.thisMonth} color="emerald" />
                <KPICard label={labels.orders} value={String(kpis.ordersMonth)} subtitle={labels.thisMonth} color="blue" />
                <KPICard label={labels.avgOrder} value={kpis.avgOrderValue} subtitle={labels.thisMonth} color="purple" />
                <KPICard label={labels.newCustomers} value={String(kpis.newCustomers)} subtitle={labels.thisMonth} color="amber" />
            </div>

            {/* ── Quick Stats Row ──────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <QuickStat label={labels.today} value={String(kpis.ordersToday)} suffix={labels.orders.toLowerCase()} />
                <QuickStat label={labels.thisWeek} value={String(kpis.ordersWeek)} suffix={labels.orders.toLowerCase()} />
                <QuickStat label={labels.products} value={String(kpis.totalProducts)} />
                <QuickStat label={labels.customers} value={String(kpis.totalCustomers)} />
            </div>

            {/* ── Charts ─────────────────────────── */}
            <AnalyticsCharts
                revenueByDay={metrics.revenue_by_day}
                ordersByDay={metrics.orders_by_day}
                currencyCtx={currencyCtx}
                revenueMonth={metrics.revenue_this_month}
                topProducts={topProducts}
                lang={lang}
                labels={{
                    revenue: labels.revenue,
                    orders: labels.orders,
                    chartTitle: labels.chartTitle,
                    currencyBreakdown: labels.currencyBreakdown,
                    topProducts: labels.topProducts,
                }}
            />
        </ModuleShell>
    )
}

// ── Sub-components ──────────────────────────────────────────────────────

function KPICard({ label, value, subtitle, color }: {
    label: string; value: string; subtitle: string; color: 'emerald' | 'blue' | 'purple' | 'amber'
}) {
    const colorMap = {
        emerald: 'from-emerald-500/15 to-emerald-500/5 border-emerald-500/20',
        blue: 'from-blue-500/15 to-blue-500/5 border-blue-500/20',
        purple: 'from-purple-500/15 to-purple-500/5 border-purple-500/20',
        amber: 'from-amber-500/15 to-amber-500/5 border-amber-500/20',
    }

    return (
        <div className={`rounded-2xl border bg-gradient-to-br ${colorMap[color]} p-4`}>
            <p className="text-2xl font-bold text-tx-pri">{value}</p>
            <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-tx-sec font-medium">{label}</p>
                <p className="text-[10px] text-tx-ter">{subtitle}</p>
            </div>
        </div>
    )
}

function QuickStat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
    return (
        <div className="sota-glass-card !py-3 !px-4">
            <p className="text-xs text-tx-sec font-medium mb-1">{label}</p>
            <p className="text-lg font-bold text-tx-pri">
                {value} {suffix && <span className="text-xs font-normal text-tx-ter">{suffix}</span>}
            </p>
        </div>
    )
}
