'use client'

/**
 * SubscriptionPill — Compact plan indicator for the owner panel topbar
 *
 * Shows the tenant's active plan as a stylish pill badge.
 * If no plan, shows "Free" with a subtle upgrade hint.
 *
 * @module SubscriptionPill
 * @locked 🟢 GREEN — display-only component
 */

import { Crown, Sparkles } from 'lucide-react'

interface Props {
    planName?: string
    className?: string
}

const planStyles: Record<string, { bg: string; text: string; icon: typeof Crown }> = {
    enterprise: {
        bg: 'bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-900/30 dark:to-purple-900/30',
        text: 'text-violet-700 dark:text-violet-400',
        icon: Crown,
    },
    growth: {
        bg: 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-900/30 dark:to-orange-900/30',
        text: 'text-amber-700 dark:text-amber-400',
        icon: Crown,
    },
    starter: {
        bg: 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-900/30 dark:to-teal-900/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        icon: Sparkles,
    },
    free: {
        bg: 'bg-sf-1',
        text: 'text-tx-muted',
        icon: Sparkles,
    },
}

function getPlanStyle(name?: string) {
    if (!name) return planStyles.free
    const lower = name.toLowerCase()
    if (lower.includes('enterprise')) return planStyles.enterprise
    if (lower.includes('growth')) return planStyles.growth
    if (lower.includes('starter')) return planStyles.starter
    // Default for custom plan names
    return {
        bg: 'bg-brand-subtle',
        text: 'text-brand',
        icon: Crown,
    }
}

export default function SubscriptionPill({ planName, className = '' }: Props) {
    const style = getPlanStyle(planName)
    const Icon = style.icon
    const displayName = planName || 'Free'

    return (
        <span
            className={`
                inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                text-xs font-semibold tracking-wide
                ring-1 ring-black/5 dark:ring-white/10
                ${style.bg} ${style.text}
                transition-all duration-200 hover:ring-black/10 dark:hover:ring-white/20
                ${className}
            `.trim()}
            title={`Plan: ${displayName}`}
        >
            <Icon className="w-3 h-3" />
            {displayName}
        </span>
    )
}
