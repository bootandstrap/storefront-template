/**
 * Analytics Dashboard — Owner Panel
 *
 * Displays page views, top products, and conversion funnel.
 * Data from analytics_events table (filtered by tenant_id).
 * Gated by enable_analytics feature flag in the sidebar
 * (page still renders but shows "enable analytics" message if disabled).
 */

import { getConfig, getRequiredTenantId } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import FeatureGate from '@/components/ui/FeatureGate'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.analytics.title') }
}

export default async function AnalyticsPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { featureFlags } = await getConfig()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!featureFlags.enable_analytics) {
        return <FeatureGate flag="enable_analytics" lang={lang} />
    }

    // Compute cutoff date outside of render-time constraints
    const cutoffMs = 7 * 24 * 60 * 60 * 1000
    // Fetch analytics data
    const supabase = await createClient()
    const sevenDaysAgo = new Date(new Date().getTime() - cutoffMs).toISOString()

    const tenantId = getRequiredTenantId()
    const [pageViewsRes, topProductsRes, funnelRes] = await Promise.all([
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
    ])

    const pageViews7d = pageViewsRes.count ?? 0
    const productViews = topProductsRes.data?.length ?? 0

    // Build funnel counts from real analytics data
    const funnelData = funnelRes.data ?? []
    const funnelCounts: Record<string, number> = {}
    for (const row of funnelData) {
        funnelCounts[row.event_type] = (funnelCounts[row.event_type] ?? 0) + 1
    }

    const funnelSteps = [
        { label: t('panel.analytics.pageViews'), count: funnelCounts['page_view'] ?? pageViews7d, emoji: '👁️' },
        { label: t('panel.analytics.productViews'), count: funnelCounts['product_view'] ?? productViews, emoji: '🛍️' },
        { label: t('panel.analytics.addToCart'), count: funnelCounts['add_to_cart'] ?? 0, emoji: '🛒' },
        { label: t('panel.analytics.checkoutStart'), count: funnelCounts['checkout_start'] ?? 0, emoji: '💳' },
        { label: t('panel.analytics.orderPlaced'), count: funnelCounts['order_placed'] ?? 0, emoji: '✅' },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-display text-text-primary">
                    {t('panel.analytics.title')}
                </h1>
                <p className="text-text-muted mt-1">
                    {t('panel.analytics.subtitle')}
                </p>
            </div>

            {/* Stats overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold font-display text-text-primary">{pageViews7d}</p>
                    <p className="text-sm text-text-muted mt-1">{t('panel.analytics.pageViews7d')}</p>
                </div>
                <div className="glass rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold font-display text-text-primary">{productViews}</p>
                    <p className="text-sm text-text-muted mt-1">{t('panel.analytics.productViews7d')}</p>
                </div>
                <div className="glass rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold font-display text-text-primary">
                        {pageViews7d > 0
                            ? `${((funnelCounts['order_placed'] ?? 0) / pageViews7d * 100).toFixed(1)}%`
                            : '0.0%'}
                    </p>
                    <p className="text-sm text-text-muted mt-1">{t('panel.analytics.conversionRate')}</p>
                </div>
            </div>

            {/* Conversion funnel */}
            <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-bold font-display text-text-primary mb-4">
                    {t('panel.analytics.conversionFunnel')}
                </h3>
                <div className="space-y-3">
                    {funnelSteps.map((step, i) => {
                        const maxCount = Math.max(...funnelSteps.map((s) => s.count), 1)
                        const width = Math.max((step.count / maxCount) * 100, 5)
                        return (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-lg w-8 text-center">{step.emoji}</span>
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-text-secondary">{step.label}</span>
                                        <span className="font-medium text-text-primary">{step.count}</span>
                                    </div>
                                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all duration-500"
                                            style={{ width: `${width}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
