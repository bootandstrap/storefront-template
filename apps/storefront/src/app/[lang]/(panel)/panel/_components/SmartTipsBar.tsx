/**
 * SmartTipsBar — Contextual dismissable tip banners
 *
 * Extracted from dashboard monolith. Shows up to 2 smart tips
 * based on current store state. Renders nothing if no tips match.
 */

import { SotaBentoItem, SmartTip } from '@/components/panel'
import type { DashboardContext } from '../_lib/dashboard-context'

interface SmartTipsBarProps {
    ctx: DashboardContext
}

export default function SmartTipsBar({ ctx }: SmartTipsBarProps) {
    const { lang, t, gamification } = ctx
    const { smartTips } = gamification

    if (smartTips.length === 0) return null

    return (
        <SotaBentoItem colSpan={{ base: 12 }}>
            <div className="space-y-2">
                {smartTips.map(tip => (
                    <SmartTip
                        key={tip.id}
                        tipId={tip.id}
                        emoji={tip.emoji}
                        message={t(tip.messageKey)}
                        actionLabel={t(tip.actionKey)}
                        actionHref={tip.actionHref}
                        lang={lang}
                    />
                ))}
            </div>
        </SotaBentoItem>
    )
}
