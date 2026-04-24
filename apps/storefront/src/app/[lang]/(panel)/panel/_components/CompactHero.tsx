/**
 * CompactHero — Slim welcome bar with essential actions.
 *
 * Single-line layout: Greeting + Date | Store Link + Health Dot
 * Replaces the large DashboardHero banner.
 */

import { ExternalLink } from 'lucide-react'
import { SotaBentoItem, SotaGlassCard } from '@/components/panel'
import type { DashboardContext } from '../_lib/dashboard-context'

interface Props {
    ctx: DashboardContext
}

export default function CompactHero({ ctx }: Props) {
    const { storeConfig, lang, t, gamification } = ctx
    const { readiness } = gamification

    const now = new Date()
    const hour = now.getHours()
    const greeting = hour < 12
        ? (t('panel.greeting.morning') || 'Buenos días')
        : hour < 18
            ? (t('panel.greeting.afternoon') || 'Buenas tardes')
            : (t('panel.greeting.evening') || 'Buenas noches')

    const dateStr = now.toLocaleDateString(lang, {
        weekday: 'long', day: 'numeric', month: 'long',
    })

    const healthColor = readiness.score >= 80
        ? '#22c55e' : readiness.score >= 40
            ? '#f59e0b' : '#ef4444'

    return (
        <SotaBentoItem colSpan={{ base: 12 }}>
            <SotaGlassCard className="!py-3 !px-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    {/* Left: Greeting + date */}
                    <div className="flex items-center gap-3 min-w-0">
                        <h1 className="text-lg font-bold text-tx tracking-tight truncate">
                            {greeting}
                        </h1>
                        <span className="hidden sm:inline text-xs text-tx-muted font-medium capitalize">
                            {dateStr}
                        </span>
                        {storeConfig.onboarding_completed && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sf-1 border border-sf-2">
                                <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: healthColor, boxShadow: `0 0 8px ${healthColor}50` }}
                                />
                                <span className="text-[10px] font-semibold text-tx-sec tabular-nums">
                                    {readiness.score}%
                                </span>
                            </span>
                        )}
                    </div>

                    {/* Right: Quick links */}
                    <div className="flex items-center gap-2">
                        <a
                            href={`/${lang}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sf-1 border border-sf-2 text-tx-sec text-xs font-semibold hover:bg-sf-2/50 transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {t('panel.dashboard.viewStorefront') || 'Storefront'}
                        </a>
                    </div>
                </div>
            </SotaGlassCard>
        </SotaBentoItem>
    )
}
