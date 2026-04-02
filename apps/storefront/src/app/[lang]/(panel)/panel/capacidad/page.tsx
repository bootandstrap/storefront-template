/**
 * Capacidad — Traffic & Hosting Capacity — Owner Panel
 *
 * Server component: loads traffic config and plan limits.
 * Feature gate: enable_traffic_expansion must be true.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import FeatureGate from '@/components/ui/FeatureGate'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Gauge } from 'lucide-react'
import CapacidadClient from './CapacidadClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.capacidad.title') || 'Capacidad' }
}

export default async function CapacidadPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { appConfig } = await withPanelGuard()
    const { config, featureFlags, planLimits } = appConfig

    // Gate: enable_traffic_expansion must be true
    if (!featureFlags.enable_traffic_expansion) {
        return <FeatureGate flag="enable_traffic_expansion" lang={lang} />
    }

    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.capacidad.title') || 'Capacidad'}
                subtitle={t('panel.capacidad.subtitle') || 'Traffic & hosting capacity'}
                icon={<Gauge className="w-5 h-5" />}
            />
            <CapacidadClient
            lang={lang}
            businessName={config.business_name || ''}
            capacityConfig={{
                traffic_alert_email: (config as unknown as Record<string, unknown>).traffic_alert_email ?? '',
                capacity_warning_threshold_pct: (config as unknown as Record<string, unknown>).capacity_warning_threshold_pct ?? 80,
                capacity_critical_threshold_pct: (config as unknown as Record<string, unknown>).capacity_critical_threshold_pct ?? 95,
                capacity_auto_upgrade_interest: (config as unknown as Record<string, unknown>).capacity_auto_upgrade_interest ?? false,
            }}
            featureFlags={{
                trafficExpansion: featureFlags.enable_traffic_expansion,
                trafficAnalytics: featureFlags.enable_traffic_analytics,
                trafficAutoscale: featureFlags.enable_traffic_autoscale,
            }}
            limits={{
                maxRequestsDay: planLimits.max_requests_day,
            }}
            labels={{
                title: t('panel.capacidad.title') || 'Capacidad',
                subtitle: t('panel.capacidad.subtitle') || 'Traffic & hosting capacity',
                dailyTraffic: t('panel.capacidad.dailyTraffic') || 'Daily Traffic',
                requestsToday: t('panel.capacidad.requestsToday') || 'Requests today',
                maxRequestsDay: t('panel.capacidad.maxRequestsDay') || 'Daily limit',
                expansion: t('panel.capacidad.expansion') || 'Traffic Expansion',
                expansionDesc: t('panel.capacidad.expansionDesc') || 'Increase your daily request capacity to handle traffic spikes.',
                analytics: t('panel.capacidad.analytics') || 'Traffic Analytics',
                analyticsDesc: t('panel.capacidad.analyticsDesc') || 'Detailed traffic analytics and visitor insights.',
                autoscale: t('panel.capacidad.autoscale') || 'Auto-Scale',
                autoscaleDesc: t('panel.capacidad.autoscaleDesc') || 'Automatically scale resources during traffic peaks.',
                active: t('common.active') || 'Active',
                inactive: t('common.inactive') || 'Inactive',
                comingSoon: t('common.comingSoon') || 'Coming Soon',
                upgradeModule: t('featureGate.upgradeModule') || 'Upgrade',
            }}
            />
        </div>
    )
}
