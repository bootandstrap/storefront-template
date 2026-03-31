'use client'

/**
 * StoreHealthCard — Animated circular progress ring showing store readiness score
 *
 * Displays: score (0-100), level badge, next action suggestion, checklist breakdown.
 * Labels are pre-resolved on the server to avoid passing functions to client components.
 */

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp, ArrowRight, Check, RotateCcw, Globe } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { StoreReadinessResult, ReadinessCheck, StoreLevel } from '@/lib/store-readiness'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoreHealthLabels {
  title: string
  completed: string
  expand: string
  collapse: string
  levelLabels: Record<StoreLevel, string>
  /** Pre-resolved check labels, keyed by check.id */
  checkLabels: Record<string, string>
  /** Pre-resolved next action label (if any) */
  nextActionLabel?: string
  /** Labels for quick-action footer buttons */
  replayTourLabel?: string
  languageLabel?: string
}

interface StoreHealthCardProps {
  readiness: StoreReadinessResult
  labels: StoreHealthLabels
  compact?: boolean
  lang: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEVEL_CONFIG: Record<StoreLevel, { emoji: string; cssClass: string }> = {
  setup:    { emoji: '🔧', cssClass: 'level-badge-setup' },
  growing:  { emoji: '🌱', cssClass: 'level-badge-growing' },
  thriving: { emoji: '🌟', cssClass: 'level-badge-thriving' },
}

const RING_RADIUS = 40
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StoreHealthCard({
  readiness,
  labels,
  compact = false,
  lang,
}: StoreHealthCardProps) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const router = useRouter()

  const handleReplayTour = useCallback(() => {
    try {
      localStorage.removeItem('bns-tour-done')
    } catch { /* noop */ }
    router.refresh()
  }, [router])

  // Animate score on mount
  useEffect(() => {
    const target = readiness.score
    const duration = 1000
    const start = performance.now()

    function animate(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [readiness.score])

  const levelConf = LEVEL_CONFIG[readiness.level]
  const strokeDasharray = `${(animatedScore / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`

  // Score color gradient
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981' // green
    if (score >= 40) return '#3b82f6' // blue
    return '#f59e0b' // amber
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--color-surface-0)',
        border: '1px solid var(--color-surface-2)',
      }}
    >
      <div className="flex items-center gap-5">
        {/* Animated Ring */}
        <div className="relative flex-shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96">
            {/* Background ring */}
            <circle
              cx="48" cy="48" r={RING_RADIUS}
              fill="none"
              stroke="var(--color-surface-2)"
              strokeWidth="6"
            />
            {/* Progress ring */}
            <circle
              cx="48" cy="48" r={RING_RADIUS}
              fill="none"
              stroke={getScoreColor(readiness.score)}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset="0"
              className="health-ring"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '48px 48px',
                filter: `drop-shadow(0 0 6px ${getScoreColor(readiness.score)}40)`,
              }}
            />
          </svg>
          {/* Score number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-2xl font-bold animate-score-count"
              style={{ color: getScoreColor(readiness.score) }}
            >
              {animatedScore}
            </span>
            <span className="text-[10px] text-tx-muted font-medium">/ 100</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-sm font-bold text-tx">
              {labels.title}
            </h3>
            <span className={`level-badge ${levelConf.cssClass}`}>
              {levelConf.emoji} {labels.levelLabels[readiness.level]}
            </span>
          </div>

          <p className="text-xs text-tx-muted mb-2">
            {readiness.completedCount}/{readiness.totalCount} {labels.completed}
          </p>

          {/* Next action suggestion */}
          {readiness.nextAction && labels.nextActionLabel && (
            <a
              href={readiness.nextAction.actionHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-light transition-colors"
            >
              {readiness.nextAction.emoji} {labels.nextActionLabel}
              <ArrowRight className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Expand/collapse for checklist */}
      {!compact && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 mt-3 pt-3 text-xs text-tx-muted hover:text-tx-sec transition-colors"
            style={{ borderTop: '1px solid var(--color-surface-2)' }}
          >
            {expanded ? labels.collapse : labels.expand}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 animate-fade-in">
              {readiness.checks.map((check: ReadinessCheck) => (
                <a
                  key={check.id}
                  href={check.actionHref}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sf-1 transition-colors group"
                >
                  {check.done ? (
                    <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-green-500" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                      style={{ borderColor: 'var(--color-surface-3)' }}
                    />
                  )}
                  <span className="text-lg flex-shrink-0">{check.emoji}</span>
                  <span className={`text-xs flex-1 ${check.done ? 'text-tx-muted line-through' : 'text-tx font-medium'}`}>
                    {labels.checkLabels[check.id] ?? check.labelKey}
                  </span>
                  {!check.done && (
                    <ArrowRight className="w-3.5 h-3.5 text-tx-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </a>
              ))}
            </div>
          )}

          {/* Quick-access footer: Replay Tour + Language */}
          {(labels.replayTourLabel || labels.languageLabel) && (
            <div
              className="flex items-center justify-center gap-3 mt-3 pt-3"
              style={{ borderTop: '1px solid var(--color-surface-2)' }}
            >
              {labels.replayTourLabel && (
                <button
                  type="button"
                  onClick={handleReplayTour}
                  className="inline-flex items-center gap-1.5 text-[11px] text-tx-muted hover:text-brand transition-colors px-2 py-1 rounded-lg hover:bg-brand-subtle"
                >
                  <RotateCcw className="w-3 h-3" />
                  {labels.replayTourLabel}
                </button>
              )}
              {labels.languageLabel && (
                <a
                  href={`/${lang}/panel/tienda`}
                  className="inline-flex items-center gap-1.5 text-[11px] text-tx-muted hover:text-brand transition-colors px-2 py-1 rounded-lg hover:bg-brand-subtle"
                >
                  <Globe className="w-3 h-3" />
                  {labels.languageLabel}
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
