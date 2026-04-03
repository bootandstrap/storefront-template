/**
 * Analytics Dashboard — Owner Panel (SOTA rewrite)
 *
 * SOTA upgrades:
 * - Raw `bg-sf-0 border` → `glass rounded-2xl`
 * - No PanelPageHeader → PanelPageHeader with icon + badge
 * - Inline h1/p header → PanelPageHeader
 * - Consistent glass pattern for funnel card
 * - StatCard for summary metrics
 *
 * NOTE: Server component — no framer-motion. Uses CSS transitions for bar widths.
 */

import { withPanelGuard } from '@/lib/panel-guard'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { 
    SotaBentoGrid, 
    SotaBentoItem, 
    SotaGlassCard, 
    SotaMetric, 
    SotaFeatureGateWrapper 
} from '@/components/panel'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import {
    Eye,
    ShoppingBag,
    ArrowRight,
    TrendingUp,
    BarChart3,
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

    const isLocked = !featureFlags.enable_analytics

    let pageViews7d = 12450
    let productViews = 342
    let funnelCounts: Record<string, number> = {
        page_view: 12450,
        product_view: 3420,
        add_to_cart: 852,
        checkout_start: 421,
        order_placed: 215
    }

    if (!isLocked) {
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

        pageViews7d = pageViewsRes.count ?? 0
        productViews = topProductsRes.data?.length ?? 0

        const funnelData = funnelRes.data ?? []
        funnelCounts = {}
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

    return (
        <SotaFeatureGateWrapper flag="enable_analytics" isLocked={isLocked}>
            <div className="space-y-8 max-w-5xl">

                {/* ── Header ── */}
                <PanelPageHeader
                    title={t('panel.analytics.title')}
                    subtitle={t('panel.analytics.subtitle')}
                    icon={<BarChart3 className="w-5 h-5" />}
                />

                <SotaBentoGrid>
                    {/* ── Summary Stats ── */}
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
                </SotaBentoGrid>
            </div>
        </SotaFeatureGateWrapper>
    )
}
