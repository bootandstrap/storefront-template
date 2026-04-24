'use client'

/**
 * ResourceBadge — Visual usage indicator for plan limits
 *
 * Shows a compact badge like "5/10" or "8/10 ⚠️" with severity-based
 * coloring. Intended for page headers and inline counters.
 *
 * Features:
 *   - Auto-severity: ok (green) / warning (amber) / critical (red)
 *   - Optional micro progress bar
 *   - Tooltip with full context
 *   - Compact and inline-friendly
 *
 * @module ResourceBadge
 * @locked 🟢 GREEN — utility component
 */

import type { LimitCheckResult } from '@/lib/limits'
import { getLimitSeverity } from '@/lib/limits'

interface Props {
    /** The limit check result from checkLimit() */
    limitResult: LimitCheckResult
    /** Optional label prefix, e.g. "Products" → "Products 5/10" */
    label?: string
    /** Show a micro progress bar underneath */
    showProgress?: boolean
    /** Additional CSS classes */
    className?: string
}

const severityConfig = {
    ok: {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-700 dark:text-emerald-400',
        bar: 'bg-emerald-500',
        ring: 'ring-emerald-200 dark:ring-emerald-800',
    },
    warning: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-700 dark:text-amber-400',
        bar: 'bg-amber-500',
        ring: 'ring-amber-200 dark:ring-amber-800',
    },
    critical: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-700 dark:text-red-400',
        bar: 'bg-red-500',
        ring: 'ring-red-200 dark:ring-red-800',
    },
} as const

export default function ResourceBadge({ limitResult, label, showProgress = false, className = '' }: Props) {
    const severity = getLimitSeverity(limitResult)
    const config = severityConfig[severity]
    const pct = Math.min(100, limitResult.percentage)

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${config.bg} ${config.text} ${config.ring} ${className}`}
            title={`${limitResult.current} / ${limitResult.limit}${label ? ` ${label}` : ''} (${limitResult.remaining} remaining)`}
        >
            {label && <span className="opacity-80">{label}</span>}
            <span className="tabular-nums">{limitResult.current}/{limitResult.limit}</span>
            {severity === 'warning' && <span aria-hidden>⚠️</span>}
            {severity === 'critical' && <span aria-hidden>🔴</span>}
            {showProgress && (
                <span className="inline-flex w-10 h-1.5 rounded-full bg-sf-2 overflow-hidden ml-0.5">
                    <span
                        className={`h-full rounded-full transition-all duration-500 ${config.bar}`}
                        style={{ width: `${pct}%` }}
                    />
                </span>
            )}
        </span>
    )
}
