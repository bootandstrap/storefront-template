/**
 * GovernanceStrip — Compact governance summary in a single slim line.
 *
 * Replaces the large GovernanceStatusBar (194 LOC).
 * Shows: Health score | Active modules count | Limit status | Tenant status
 * All in one compact row that doesn't dominate the dashboard.
 */

import Link from 'next/link'
import { SotaBentoItem, SotaGlassCard } from '@/components/panel'
import { getLimitSeverity } from '@/lib/limits'
import type { DashboardContext } from '../_lib/dashboard-context'

interface Props {
    ctx: DashboardContext
}

export default function GovernanceStrip({ ctx }: Props) {
    const {
        lang, t, appConfig, gamification, moduleInfoList,
        realMeters, extendedMeters,
    } = ctx
    const { readiness, activeModuleCount } = gamification
    const totalModules = moduleInfoList.length

    // Limits approaching capacity
    const allMeters = [...realMeters, ...extendedMeters]
    const warningCount = allMeters.filter(m => {
        const severity = getLimitSeverity(m.result)
        return severity === 'warning' || severity === 'critical'
    }).length

    const healthColor = readiness.score >= 80
        ? '#22c55e' : readiness.score >= 40
            ? '#f59e0b' : '#ef4444'

    const tenantStatus = appConfig.tenantStatus
    const statusLabel = tenantStatus === 'maintenance_free'
        ? (t('panel.governance.trial') || 'Trial')
        : tenantStatus === 'active'
            ? (t('panel.governance.active') || 'Active')
            : String(tenantStatus)

    return (
        <SotaBentoItem colSpan={{ base: 12 }}>
            <SotaGlassCard className="!py-2.5 !px-4">
                <div className="flex items-center gap-5 flex-wrap text-xs">
                    {/* Health */}
                    <Link
                        href={`/${lang}/panel/ajustes`}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: healthColor, boxShadow: `0 0 6px ${healthColor}40` }}
                        />
                        <span className="font-bold text-tx tabular-nums">
                            {readiness.score}%
                        </span>
                        <span className="text-tx-muted font-medium">
                            {t('storeHealth.title')}
                        </span>
                        {/* Next action hint — explains WHY the score is low */}
                        {readiness.nextAction && readiness.score < 100 && (
                            <span className="text-tx-ter font-medium hidden md:inline truncate max-w-[200px]">
                                — {readiness.nextAction.emoji} {t(readiness.nextAction.labelKey) || readiness.nextAction.labelKey}
                            </span>
                        )}
                    </Link>

                    <span className="w-px h-4 bg-sf-3/20" />

                    {/* Modules */}
                    <Link
                        href={`/${lang}/panel/modulos`}
                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                    >
                        <span className="font-bold text-tx tabular-nums">
                            {activeModuleCount}/{totalModules}
                        </span>
                        <span className="text-tx-muted font-medium">
                            {t('panel.governance.modules') || 'modules'}
                        </span>
                    </Link>

                    <span className="w-px h-4 bg-sf-3/20" />

                    {/* Limits */}
                    <div className="flex items-center gap-1.5">
                        {warningCount > 0 ? (
                            <>
                                <span className="text-amber-600 font-bold">⚠ {warningCount}</span>
                                <span className="text-amber-600/70 font-medium">
                                    {t('panel.governance.limitAlerts') || 'limit alerts'}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="text-emerald-600 font-bold">✓</span>
                                <span className="text-emerald-600/70 font-medium">
                                    {t('panel.governance.allClear') || 'All clear'}
                                </span>
                            </>
                        )}
                    </div>

                    <span className="w-px h-4 bg-sf-3/20 hidden sm:block" />

                    {/* Status */}
                    <div className="flex items-center gap-1.5 hidden sm:flex">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            tenantStatus === 'active' ? 'bg-emerald-500' :
                            tenantStatus === 'maintenance_free' ? 'bg-blue-500' :
                            'bg-amber-500'
                        }`} />
                        <span className="font-semibold text-tx capitalize">
                            {statusLabel}
                        </span>
                    </div>
                </div>
            </SotaGlassCard>
        </SotaBentoItem>
    )
}
