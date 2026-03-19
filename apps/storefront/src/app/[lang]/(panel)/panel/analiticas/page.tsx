/**
 * Analytics Dashboard — Owner Panel
 *
 * Displays page views, top products, and conversion funnel.
 * Data from analytics_events table (filtered by tenant_id).
 * Gated by enable_analytics feature flag.
 */

import { withPanelGuard } from '@/lib/panel-guard'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import FeatureGate from '@/components/ui/FeatureGate'
import {
    Eye,
    ShoppingBag,
    ArrowRight,
    TrendingUp,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.analytics.title') }
}

// Funnel step icons
const FUNNEL_ICONS: Record<string, React.ReactNode> = {
    page_view: <Eye className="w-4 h-4" />,
    product_view: <ShoppingBag className="w-4 h-4" />,
    add_to_cart: <ShoppingBag className="w-4 h-4" />,
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
    const { featureFlags } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!featureFlags.enable_analytics) {
        return <FeatureGate flag="enable_analytics" lang={lang} />
    }

    const cutoffMs = 7 * 24 * 60 * 60 * 1000
    const supabase = await createClient()
    const sevenDaysAgo = new Date(new Date().getTime() - cutoffMs).toISOString()

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

    const funnelData = funnelRes.data ?? []
    const funnelCounts: Record<string, number> = {}
    for (const row of funnelData) {
        funnelCounts[row.event_type] = (funnelCounts[row.event_type] ?? 0) + 1
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

    return (
        <div className="space-y-6 max-w-4xl">

            {/* ── Header ─────────────────────────────────────── */}
            <div>
                <h1 className="text-2xl font-bold font-display text-text-primary">
                    {t('panel.analytics.title')}
                </h1>
                <p className="text-text-muted mt-1">
                    {t('panel.analytics.subtitle')}
                </p>
            </div>

            {/* ── Summary Stats ─────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-surface-0 border border-surface-2 rounded-xl p-5">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                        {t('panel.analytics.pageViews7d')}
                    </p>
                    <p className="text-3xl font-bold font-display text-text-primary">
                        {pageViews7d.toLocaleString()}
                    </p>
                    <p className="text-xs text-text-muted mt-1.5">
                        {t('panel.analytics.period')}
                    </p>
                </div>

                <div className="bg-surface-0 border border-surface-2 rounded-xl p-5">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                        {t('panel.analytics.productViews7d')}
                    </p>
                    <p className="text-3xl font-bold font-display text-text-primary">
                        {productViews.toLocaleString()}
                    </p>
                    <p className="text-xs text-text-muted mt-1.5">
                        {t('panel.analytics.period')}
                    </p>
                </div>

                <div className="bg-surface-0 border border-surface-2 rounded-xl p-5">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                        {t('panel.analytics.conversionRate')}
                    </p>
                    <p className="text-3xl font-bold font-display text-primary">
                        {conversionRate}%
                    </p>
                    <p className="text-xs text-text-muted mt-1.5">
                        {t('panel.analytics.period')}
                    </p>
                </div>
            </div>

            {/* ── Conversion Funnel ────────────────────────── */}
            <div className="bg-surface-0 border border-surface-2 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-text-primary mb-6">
                    {t('panel.analytics.conversionFunnel')}
                </h3>

                <div className="space-y-5">
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
                                    <div className="flex items-center gap-2 mb-2 pl-2">
                                        <div className="w-px h-4 bg-surface-3" />
                                        <span className="text-[10px] font-semibold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                                            −{dropOff}%
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-surface-1 border border-surface-2 text-text-muted flex items-center justify-center flex-shrink-0">
                                        {FUNNEL_ICONS[step.key] ?? <Eye className="w-4 h-4" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm text-text-secondary">
                                                {step.label}
                                            </span>
                                            <span className="text-sm font-semibold font-display text-text-primary tabular-nums">
                                                {step.count.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                                                style={{ width: `${barWidth}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="mt-6 pt-5 border-t border-surface-2 flex items-center justify-between">
                    <span className="text-xs text-text-muted">
                        {t('panel.analytics.period')}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>{conversionRate}% {t('panel.analytics.conversionRate')}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
