'use client'

/**
 * SetupProgress — Persistent collapsible setup checklist for the dashboard
 *
 * Replaces the old one-shot PanelChecklist. Key differences:
 * - Collapse/expand instead of permanent skip
 * - Groups checks by category (Setup · Content · Sales · Growth)
 * - Shows module upsell badges for gated features
 * - Auto-celebrates on 100% then auto-collapses
 *
 * Data: ReadinessCheck[] from store-readiness.ts (server → props)
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    ChevronDown,
    ChevronUp,
    Check,
    ArrowRight,
    Sparkles,
    Plug,
} from 'lucide-react'
import type { ReadinessCheck } from '@/lib/store-readiness'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SetupProgressLabels {
    title: string
    subtitle: string
    collapsed: string        // "{{count}} steps remaining"
    complete: string         // "All set! 🎉"
    expand: string
    collapse: string
    unlockWith: string       // "Unlock with {{module}}"
    categories: {
        setup: string
        content: string
        sales: string
        growth: string
    }
}

interface SetupProgressProps {
    checks: ReadinessCheck[]
    labels: SetupProgressLabels
    lang: string
    /** Pre-resolved check labels keyed by check.id */
    checkLabels: Record<string, string>
    /** Module upsell info: checkId → { moduleName, href } */
    moduleUpsells?: Record<string, { moduleName: string; href: string }>
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLLAPSE_KEY = 'bns_setup_collapsed'

const CATEGORY_ORDER = ['setup', 'content', 'sales', 'growth'] as const

const CATEGORY_EMOJI: Record<string, string> = {
    setup: '⚙️',
    content: '📝',
    sales: '💰',
    growth: '📈',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SetupProgress({
    checks,
    labels,
    lang,
    checkLabels,
    moduleUpsells,
}: SetupProgressProps) {
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false
        try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
    })
    const [celebrating, setCelebrating] = useState(false)

    const completedCount = checks.filter(c => c.done).length
    const totalCount = checks.length
    const allDone = completedCount === totalCount && totalCount > 0
    const remaining = totalCount - completedCount
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

    // Celebrate on 100%, then auto-collapse after animation
    useEffect(() => {
        if (allDone && !collapsed) {
            setCelebrating(true)
            const timer = setTimeout(() => {
                setCelebrating(false)
                setCollapsed(true)
                try { localStorage.setItem(COLLAPSE_KEY, '1') } catch { /* noop */ }
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [allDone, collapsed])

    const toggleCollapse = useCallback(() => {
        setCollapsed(prev => {
            const next = !prev
            try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* noop */ }
            return next
        })
    }, [])

    // Don't render if all done and collapsed
    if (allDone && collapsed) return null

    // Group checks by category
    const grouped = CATEGORY_ORDER
        .map(cat => ({
            key: cat,
            emoji: CATEGORY_EMOJI[cat],
            label: labels.categories[cat],
            checks: checks.filter(c => c.category === cat),
        }))
        .filter(g => g.checks.length > 0)

    // Score color
    const getColor = (p: number) => {
        if (p >= 80) return '#10b981'
        if (p >= 40) return '#3b82f6'
        return '#f59e0b'
    }

    const color = getColor(progress)

    // ── Collapsed state: thin progress bar ──
    if (collapsed && !allDone) {
        return (
            <button
                type="button"
                onClick={toggleCollapse}
                className="w-full glass rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/30 transition-all group"
            >
                {/* Mini progress ring */}
                <div className="relative w-8 h-8 flex-shrink-0">
                    <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" className="text-surface-3" strokeWidth="3" />
                        <circle
                            cx="16" cy="16" r="12"
                            fill="none"
                            stroke={color}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${(progress / 100) * 75.4} 75.4`}
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color }}>
                        {completedCount}/{totalCount}
                    </span>
                </div>

                {/* Label */}
                <span className="text-sm text-text-secondary font-medium flex-1 text-left">
                    {labels.collapsed.replace('{{count}}', String(remaining))}
                </span>

                {/* Expand hint */}
                <ChevronDown className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
            </button>
        )
    }

    // ── Celebration overlay ──
    if (celebrating) {
        return (
            <div className="glass rounded-2xl p-6 border border-green-500/30 shadow-lg shadow-green-500/10 animate-fade-in text-center">
                <p className="text-4xl mb-2">🎉</p>
                <p className="text-lg font-bold text-text-primary">{labels.complete}</p>
                <div className="flex justify-center gap-1 mt-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full animate-confetti"
                            style={{
                                backgroundColor: ['#22c55e', '#6366f1', '#f59e0b', '#ec4899'][i % 4],
                                animationDelay: `${i * 100}ms`,
                            }}
                        />
                    ))}
                </div>
            </div>
        )
    }

    // ── Expanded state: full checklist ──
    return (
        <div className="glass rounded-2xl p-5 border border-primary/15">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
                {/* Progress ring */}
                <div className="relative w-12 h-12 flex-shrink-0">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" className="text-surface-3" strokeWidth="3" />
                        <circle
                            cx="24" cy="24" r="20"
                            fill="none"
                            stroke={color}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${(progress / 100) * 125.66} 125.66`}
                            className="transition-all duration-700"
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
                        {Math.round(progress)}%
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold text-text-primary">{labels.title}</h3>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{labels.subtitle}</p>
                </div>

                {/* Collapse button */}
                <button
                    type="button"
                    onClick={toggleCollapse}
                    className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded-lg hover:bg-surface-2/60 flex items-center gap-1"
                >
                    {labels.collapse}
                    <ChevronUp className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Grouped checklist */}
            <div className="space-y-4">
                {grouped.map(group => (
                    <div key={group.key}>
                        <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-1.5 flex items-center gap-1.5">
                            <span>{group.emoji}</span> {group.label}
                        </p>
                        <div className="space-y-1">
                            {group.checks.map(check => {
                                const upsell = moduleUpsells?.[check.id]
                                return (
                                    <Link
                                        key={check.id}
                                        href={upsell ? upsell.href : check.actionHref}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all group ${
                                            check.done
                                                ? 'bg-green-500/5 text-text-secondary'
                                                : 'bg-surface-2/30 hover:bg-primary/5 text-text-primary'
                                        }`}
                                    >
                                        {check.done ? (
                                            <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                                                <Check className="w-3 h-3 text-green-500" />
                                            </div>
                                        ) : (
                                            <div className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ borderColor: 'var(--color-surface-3)' }} />
                                        )}
                                        <span className="text-sm flex-shrink-0">{check.emoji}</span>
                                        <span className={`text-sm flex-1 ${check.done ? 'line-through opacity-60' : 'font-medium'}`}>
                                            {checkLabels[check.id] ?? check.labelKey}
                                        </span>
                                        {/* Module upsell badge */}
                                        {!check.done && upsell && (
                                            <span className="inline-flex items-center gap-1 text-[10px] text-primary/80 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                                                <Plug className="w-3 h-3" />
                                                {labels.unlockWith.replace('{{module}}', upsell.moduleName)}
                                            </span>
                                        )}
                                        {!check.done && !upsell && (
                                            <ArrowRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
