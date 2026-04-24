/**
 * Capacidad — Traffic & Hosting Capacity + Backup Vault — Owner Panel
 *
 * Server component: loads traffic config, plan limits, backup governance.
 * Feature gate: enable_traffic_expansion must be true.
 * Vault tab: gated by enable_backups flag.
 * SOTA 2026: ModuleShell wrapper with 3-tier awareness + usage meter.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import ModuleShell from '@/components/panel/ModuleShell'
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

    const isLocked = !featureFlags.enable_traffic_expansion
    const maxRequestsDay = planLimits.max_requests_day ?? 25000

    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const tierInfo = {
        currentTier: featureFlags.enable_traffic_autoscale
            ? 'Enterprise'
            : featureFlags.enable_traffic_analytics
                ? 'Pro'
                : isLocked ? 'Free' : 'Básico',
        moduleKey: 'capacidad',
        nextTierFeatures: isLocked ? [
            t('panel.capacidad.feat.expansion') || '25.000 req/día',
            t('panel.capacidad.feat.gauge') || 'Medidor de tráfico en tiempo real',
            t('panel.capacidad.feat.alerts') || 'Alertas de capacidad',
        ] : !featureFlags.enable_traffic_analytics ? [
            t('panel.capacidad.feat.analytics') || 'Analíticas de tráfico detalladas',
            t('panel.capacidad.feat.100k') || '100.000 req/día',
        ] : !featureFlags.enable_traffic_autoscale ? [
            t('panel.capacidad.feat.autoscale') || 'Auto-escalado automático',
            t('panel.capacidad.feat.unlimited') || 'Capacidad ilimitada',
        ] : undefined,
        nextTierName: isLocked ? 'Capacidad Básico' : !featureFlags.enable_traffic_analytics ? 'Capacidad Pro' : !featureFlags.enable_traffic_autoscale ? 'Capacidad Enterprise' : undefined,
        nextTierPrice: isLocked ? 10 : !featureFlags.enable_traffic_analytics ? 25 : !featureFlags.enable_traffic_autoscale ? 50 : undefined,
    }

    // Fetch real traffic counter from Upstash Redis
    let requestsToday = 0
    if (!isLocked && isRateLimitEnabled()) {
        try {
            requestsToday = await getRequestCount(tenantId)
        } catch {
            // fail-open: show 0 if Upstash is unreachable
        }
    }

    return (
        <ModuleShell
            icon={<Gauge className="w-5 h-5" />}
            title={t('panel.capacidad.title') || 'Capacidad'}
            subtitle={t('panel.capacidad.subtitle') || 'Tráfico y capacidad de hosting'}
            isLocked={isLocked}
            gateFlag="enable_traffic_expansion"
            tierInfo={tierInfo}
            usageMeter={!isLocked ? {
                current: requestsToday,
                max: maxRequestsDay,
                label: t('panel.capacidad.reqDay') || 'req/día',
            } : undefined}
            lang={lang}
        >
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
                    maxRequestsDay,
                    requestsToday,
                }}
                labels={{
                    title: t('panel.capacidad.title') || 'Capacidad',
                    subtitle: t('panel.capacidad.subtitle') || 'Tráfico y capacidad de hosting',
                    dailyTraffic: t('panel.capacidad.dailyTraffic') || 'Tráfico diario',
                    requestsToday: t('panel.capacidad.requestsToday') || 'Solicitudes hoy',
                    maxRequestsDay: t('panel.capacidad.maxRequestsDay') || 'Límite diario',
                    expansion: t('panel.capacidad.expansion') || 'Expansión de tráfico',
                    expansionDesc: t('panel.capacidad.expansionDesc') || 'Aumenta tu capacidad para picos de tráfico.',
                    analytics: t('panel.capacidad.analytics') || 'Analíticas de tráfico',
                    analyticsDesc: t('panel.capacidad.analyticsDesc') || 'Estadísticas detalladas de visitantes.',
                    autoscale: t('panel.capacidad.autoscale') || 'Auto-escalado',
                    autoscaleDesc: t('panel.capacidad.autoscaleDesc') || 'Escala recursos automáticamente en picos.',
                    active: t('common.active') || 'Activo',
                    inactive: t('common.inactive') || 'Inactivo',
                    comingSoon: t('common.comingSoon') || 'Próximamente',
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
        </ModuleShell>
    )
}
