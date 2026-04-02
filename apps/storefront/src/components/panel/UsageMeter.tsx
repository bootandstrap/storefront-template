'use client'

/**
 * UsageMeter — Premium radial arc gauge for plan limit visualization
 *
 * Renders a semi-circular SVG arc with animated fill based on usage percentage.
 * Color transitions from green → amber → red as limits approach.
 * Includes upgrade CTA when usage exceeds warning threshold.
 *
 * @module UsageMeter
 */

import type { LimitCheckResult } from '@/lib/limits'
import { getLimitSeverity } from '@/lib/limits'
import { useEffect, useState } from 'react'

interface UsageMeterProps {
    label: string
    result: LimitCheckResult
    unit?: string
    /** Show compact inline bar instead of radial arc */
    variant?: 'radial' | 'bar'
    /** Optional upgrade link for when usage is high */
    upgradeHref?: string
    upgradeLabel?: string
}

// ---------------------------------------------------------------------------
// SVG Arc Helpers
// ---------------------------------------------------------------------------

const ARC_RADIUS = 40
const ARC_STROKE = 7
const ARC_CENTER = 50
// Semi-circle arc from 180° to 0° (bottom-left to bottom-right)
const ARC_START_ANGLE = Math.PI      // 180°
const ARC_END_ANGLE = 0             // 0°
const ARC_LENGTH = Math.PI * ARC_RADIUS // half-circumference

function describeArc(percentage: number): string {
    const clampedPct = Math.min(Math.max(percentage, 0), 100)
    const angle = ARC_START_ANGLE - (clampedPct / 100) * Math.PI
    const x = ARC_CENTER + ARC_RADIUS * Math.cos(angle)
    const y = ARC_CENTER - ARC_RADIUS * Math.sin(angle)
    const startX = ARC_CENTER + ARC_RADIUS * Math.cos(ARC_START_ANGLE)
    const startY = ARC_CENTER - ARC_RADIUS * Math.sin(ARC_START_ANGLE)
    const largeArc = clampedPct > 50 ? 1 : 0

    return `M ${startX} ${startY} A ${ARC_RADIUS} ${ARC_RADIUS} 0 ${largeArc} 1 ${x} ${y}`
}

// ---------------------------------------------------------------------------
// Color System
// ---------------------------------------------------------------------------

const SEVERITY_COLORS = {
    ok: {
        stroke: '#22c55e',          // green-500
        glow: 'rgba(34, 197, 94, 0.15)',
        text: 'text-green-600',
        bg: 'bg-green-500/10',
        gradient: 'from-green-500/20 to-green-500/5',
    },
    warning: {
        stroke: '#f59e0b',          // amber-500
        glow: 'rgba(245, 158, 11, 0.2)',
        text: 'text-amber-600',
        bg: 'bg-amber-500/10',
        gradient: 'from-amber-500/20 to-amber-500/5',
    },
    critical: {
        stroke: '#ef4444',          // red-500
        glow: 'rgba(239, 68, 68, 0.25)',
        text: 'text-red-600',
        bg: 'bg-red-500/10',
        gradient: 'from-red-500/20 to-red-500/5',
    },
} as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UsageMeter({
    label,
    result,
    unit = '',
    variant = 'radial',
    upgradeHref,
    upgradeLabel,
}: UsageMeterProps) {
    const severity = getLimitSeverity(result)
    const colors = SEVERITY_COLORS[severity]
    const [animatedPct, setAnimatedPct] = useState(0)

    // Animate on mount
    useEffect(() => {
        const timeout = setTimeout(() => {
            setAnimatedPct(Math.min(result.percentage, 100))
        }, 100)
        return () => clearTimeout(timeout)
    }, [result.percentage])

    // ── Bar variant (compact inline) ──
    if (variant === 'bar') {
        return (
            <div className={`glass rounded-xl p-4 transition-all duration-300 ${severity === 'critical' ? 'ring-1 ring-red-500/20' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-tx-sec">{label}</span>
                    <span className={`text-sm font-bold ${colors.text}`}>
                        {result.current}{unit} / {result.limit}{unit}
                    </span>
                </div>
                <div className="h-2 bg-sf-2 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                            width: `${animatedPct}%`,
                            backgroundColor: colors.stroke,
                        }}
                    />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-tx-muted">
                        {result.remaining} {unit} remaining
                    </span>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${colors.text}`}>
                            {result.percentage}%
                        </span>
                        {severity !== 'ok' && upgradeHref && upgradeLabel && (
                            <a
                                href={upgradeHref}
                                className="text-[10px] font-semibold text-brand hover:underline"
                            >
                                {upgradeLabel} →
                            </a>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // ── Radial variant (premium arc gauge) ──
    return (
        <div
            className={`glass rounded-2xl p-4 transition-all duration-300 relative overflow-hidden ${
                severity === 'critical' ? 'ring-1 ring-red-500/20 usage-critical' : ''
            }`}
        >
            {/* Subtle gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-b ${colors.gradient} pointer-events-none`} />

            <div className="relative z-10 flex flex-col items-center">
                {/* SVG Arc Gauge */}
                <div className="relative w-[100px] h-[58px]">
                    <svg
                        viewBox="0 0 100 58"
                        className="w-full h-full"
                        style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
                    >
                        {/* Background arc */}
                        <path
                            d={describeArc(100)}
                            fill="none"
                            stroke="currentColor"
                            className="text-sf-2"
                            strokeWidth={ARC_STROKE}
                            strokeLinecap="round"
                        />
                        {/* Filled arc */}
                        <path
                            d={describeArc(animatedPct)}
                            fill="none"
                            stroke={colors.stroke}
                            strokeWidth={ARC_STROKE}
                            strokeLinecap="round"
                            style={{
                                transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                        />
                    </svg>

                    {/* Center value */}
                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
                        <span className={`text-lg font-bold leading-none ${colors.text}`}>
                            {result.percentage}%
                        </span>
                    </div>
                </div>

                {/* Label */}
                <span className="text-xs font-medium text-tx-sec mt-1.5 text-center leading-tight">
                    {label}
                </span>

                {/* Count */}
                <span className="text-[11px] text-tx-muted mt-0.5">
                    {result.current}{unit} / {result.limit}{unit}
                </span>

                {/* Upgrade CTA */}
                {severity !== 'ok' && upgradeHref && upgradeLabel && (
                    <a
                        href={upgradeHref}
                        className={`mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity`}
                    >
                        {upgradeLabel} →
                    </a>
                )}
            </div>
        </div>
    )
}
