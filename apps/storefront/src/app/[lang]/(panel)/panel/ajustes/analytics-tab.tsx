/**
 * Analytics Tab Content — Thin RSC wrapper for the Ajustes hub.
 *
 * Fetches dashboard metrics from Medusa and passes them to AnalyticsCharts.
 * Also renders the Supabase-based AnalyticsDashboard for event analytics.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfigForTenant } from '@/lib/config'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { resolveCurrencyContext } from '@/lib/currency-engine'
import { getDashboardMetrics, getTopProducts } from '@/lib/medusa/admin-analytics'
import AnalyticsCharts from '../analiticas/AnalyticsCharts'
import AnalyticsDashboard from '@/components/panel/AnalyticsDashboard'

export default async function AnalyticsTabContent({
    lang,
    tenantId,
}: {
    lang: string
    tenantId: string
}) {
    const { config, featureFlags } = await getConfigForTenant(tenantId)
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const currencyCtx = resolveCurrencyContext(config, featureFlags)

    const scope = await getTenantMedusaScope(tenantId)
    const [metrics, topProducts] = await Promise.all([
        getDashboardMetrics(scope, currencyCtx),
        getTopProducts(5, scope, currencyCtx.primary),
    ])

    const labels = {
        revenue: t('panel.analytics.revenue') || 'Revenue',
        orders: t('panel.analytics.orders') || 'Orders',
        chartTitle: t('panel.analytics.chartTitle') || 'Revenue & Orders',
        currencyBreakdown: t('panel.analytics.currencyBreakdown') || 'Currency Breakdown',
        topProducts: t('panel.analytics.topProducts') || 'Top Products',
    }

    return (
        <div className="space-y-8">
            {/* Medusa-based revenue/order charts */}
            <AnalyticsCharts
                revenueByDay={metrics.revenue_by_day}
                ordersByDay={metrics.orders_by_day}
                currencyCtx={currencyCtx}
                revenueMonth={metrics.revenue_this_month}
                topProducts={topProducts}
                lang={lang}
                labels={labels}
            />

            {/* Supabase-based event analytics (customer growth, product views, storage) */}
            <AnalyticsDashboard
                lang={lang}
                currency={currencyCtx.primary.toUpperCase()}
            />
        </div>
    )
}
