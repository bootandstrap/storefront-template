/**
 * Capacidad — Traffic & Hosting Capacity + Backup Vault — Owner Panel
 *
 * Server component: loads traffic config, plan limits, backup governance.
 * Feature gate: enable_traffic_expansion must be true.
 * Vault tab: gated by enable_backups flag.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import FeatureGate from '@/components/ui/FeatureGate'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Gauge } from 'lucide-react'
import { getRequestCount, isRateLimitEnabled } from '@/lib/rate-limit'
import CapacidadShell from './CapacidadShell'

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
    const { tenantId, appConfig } = await withPanelGuard()
    const { config, featureFlags, planLimits } = appConfig

    // Gate: enable_traffic_expansion must be true
    if (!featureFlags.enable_traffic_expansion) {
        return <FeatureGate flag="enable_traffic_expansion" lang={lang} />
    }

    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // Fetch real traffic counter from Upstash Redis (graceful fallback to 0)
    let requestsToday = 0
    if (isRateLimitEnabled()) {
        try {
            requestsToday = await getRequestCount(tenantId)
        } catch {
            // fail-open: show 0 if Upstash is unreachable
        }
    }

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.capacidad.title') || 'Capacidad'}
                subtitle={t('panel.capacidad.subtitle') || 'Traffic & hosting capacity'}
                icon={<Gauge className="w-5 h-5" />}
            />
            <CapacidadShell
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
                    requestsToday,
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
                // Vault tab props
                vaultEnabled={!!featureFlags.enable_backups}
                vaultProps={{
                    storageLimitMb: planLimits.storage_limit_mb ?? 250,
                    enableBackups: !!featureFlags.enable_backups,
                    enableManualBackup: !!featureFlags.enable_manual_backup,
                    maxBackups: planLimits.max_backups ?? 6,
                    backupFrequencyHours: planLimits.backup_frequency_hours ?? 168,
                    labels: {
                        title: t('panel.vault.title') || 'Backup Vault',
                        subtitle: t('panel.vault.subtitle') || 'Storage & backups',
                        storage: t('panel.vault.storage') || 'Storage',
                        images: t('panel.vault.images') || 'images',
                        backups: t('panel.vault.backups') || 'backups',
                        used: t('panel.vault.used') || 'used',
                        limit: t('panel.vault.limit') || 'limit',
                        backupHistory: t('panel.vault.backupHistory') || 'Backup History',
                        noBackups: t('panel.vault.noBackups') || 'No backups yet',
                        noBackupsDesc: t('panel.vault.noBackupsDesc') || 'Backups will be created automatically',
                        createBackup: t('panel.vault.createBackup') || 'Create Backup',
                        creatingBackup: t('panel.vault.creatingBackup') || 'Creating...',
                        download: t('panel.vault.download') || 'Download',
                        lastBackup: t('panel.vault.lastBackup') || 'Last backup',
                        nextBackup: t('panel.vault.nextBackup') || 'Next',
                        full: t('panel.vault.full') || 'Full backup',
                        incremental: t('panel.vault.incremental') || 'Incremental',
                        backupSuccess: t('panel.vault.backupSuccess') || 'Backup created successfully',
                        backupError: t('panel.vault.backupError') || 'Backup failed',
                        size: t('panel.vault.size') || 'Size',
                        date: t('panel.vault.date') || 'Date',
                    },
                }}
            />
        </div>
    )
}

