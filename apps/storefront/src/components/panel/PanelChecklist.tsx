'use client'

/**
 * PanelChecklist — Setup checklist powered by the Store Readiness Engine
 *
 * Reads from StoreReadinessResult.checks (passed via props from dashboard server component).
 * Skip action persists to both localStorage and DB via skipChecklistAction().
 * Shows celebration animation on 100% completion.
 *
 * Data flow:
 *   store-readiness.ts → dashboard page.tsx (server) → PanelChecklist (client)
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Circle } from 'lucide-react'
import { skipChecklistAction } from '@/app/[lang]/(panel)/panel/actions'
import type { ReadinessCheck } from '@/lib/store-readiness'

export const PANEL_CHECKLIST_SKIPPED_KEY = 'panel_checklist_skipped'

type StorageReader = Pick<Storage, 'getItem'>

export function isChecklistSkipped(storage?: StorageReader | null): boolean {
    try {
        return storage?.getItem(PANEL_CHECKLIST_SKIPPED_KEY) === '1'
    } catch {
        return false
    }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PanelChecklistProps {
    /** Readiness checks from store-readiness engine */
    checks: ReadinessCheck[]
    /** Whether checklist was skipped (from DB config.checklist_skipped) */
    dbSkipped: boolean
    title: string
    subtitle: string
    skipLabel: string
    allDoneLabel?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PanelChecklist({
    checks,
    dbSkipped,
    title,
    subtitle,
    skipLabel,
    allDoneLabel,
}: PanelChecklistProps) {
    const [hidden, setHidden] = useState(() => {
        if (dbSkipped) return true
        if (typeof window === 'undefined') return false
        return isChecklistSkipped(window.localStorage)
    })
    const [celebrating, setCelebrating] = useState(false)

    const completedCount = checks.filter(c => c.done).length
    const allDone = completedCount === checks.length && checks.length > 0
    const progress = checks.length > 0 ? (completedCount / checks.length) * 100 : 0

    // Celebration on 100%
    useEffect(() => {
        if (allDone && !hidden) {
            setCelebrating(true)
            const timer = setTimeout(() => setCelebrating(false), 3000)
            return () => clearTimeout(timer)
        }
    }, [allDone, hidden])

    if (hidden || checks.length === 0) return null

    const handleSkip = async () => {
        // Dual persistence: localStorage + DB
        try {
            window.localStorage.setItem(PANEL_CHECKLIST_SKIPPED_KEY, '1')
        } catch { /* noop */ }
        setHidden(true)

        // Fire-and-forget DB persistence
        try {
            await skipChecklistAction()
        } catch (err) {
            console.warn('[PanelChecklist] DB skip failed (non-blocking):', err)
        }
    }

    return (
        <div className={`glass rounded-2xl p-6 border transition-all duration-700 ${
            celebrating
                ? 'border-green-500/40 shadow-lg shadow-green-500/10'
                : 'border-brand-soft'
        }`}>
            {/* Celebration overlay */}
            {celebrating && (
                <div className="text-center py-4 animate-fade-in">
                    <p className="text-4xl mb-2">🎉</p>
                    <p className="text-lg font-bold text-tx">
                        {allDoneLabel || 'All done! Your store is fully set up!'}
                    </p>
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
            )}

            {!celebrating && (
                <>
                    <div className="flex items-center gap-4 mb-5">
                        <div className="relative w-14 h-14 flex-shrink-0">
                            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                                <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" className="text-sf-3" strokeWidth="4" />
                                <circle
                                    cx="28"
                                    cy="28"
                                    r="24"
                                    fill="none"
                                    stroke="currentColor"
                                    className="text-brand transition-all duration-700"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray={`${progress * 1.508} 150.8`}
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-tx">
                                {completedCount}/{checks.length}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold font-display text-tx">
                                {title}
                            </h2>
                            <p className="text-sm text-tx-muted">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {checks.map((check) => (
                            <Link
                                key={check.id}
                                href={check.actionHref}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${check.done
                                    ? 'bg-green-500/5 text-tx-sec'
                                    : 'bg-glass hover:bg-brand-subtle text-tx'
                                    }`}
                            >
                                {check.done ? (
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                ) : (
                                    <Circle className="w-5 h-5 text-tx-faint flex-shrink-0" />
                                )}
                                <span className="text-sm mr-1">{check.emoji}</span>
                                <span className={`text-sm font-medium flex-1 ${check.done ? 'line-through opacity-60' : ''}`}>
                                    {check.labelKey}
                                </span>
                                {!check.done && <ArrowRight className="w-4 h-4 text-tx-muted" />}
                            </Link>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={handleSkip}
                            className="text-xs text-tx-muted hover:text-tx-sec transition-colors px-3 py-1.5 rounded-lg hover:bg-glass"
                        >
                            {skipLabel}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
