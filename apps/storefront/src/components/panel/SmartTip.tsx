'use client'

/**
 * SmartTip — Contextual suggestion banner shown on panel pages
 *
 * Dual persistence: localStorage (instant, offline-safe) + server action (durable).
 * On mount, checks localStorage first — if dismissed there, never renders.
 * On dismiss, writes localStorage immediately, then fires server action in background.
 */

import { useState, useTransition } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { dismissTipAction } from '@/app/[lang]/(panel)/panel/actions'

interface SmartTipProps {
  tipId: string
  emoji: string
  message: string
  actionLabel: string
  actionHref: string
  lang: string
}

/** Check if a tip was dismissed in localStorage (instant, offline-safe) */
function isTipDismissedLocally(tipId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(`dismissed-tip-${tipId}`) === '1'
  } catch {
    return false
  }
}

export default function SmartTip({ tipId, emoji, message, actionLabel, actionHref, lang }: SmartTipProps) {
  const [dismissed, setDismissed] = useState(() => isTipDismissedLocally(tipId))
  const [isPending, startTransition] = useTransition()

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    // Dual persistence: localStorage first (instant), then server action (durable)
    try { localStorage.setItem(`dismissed-tip-${tipId}`, '1') } catch { /* quota exceeded — ignore */ }
    startTransition(() => {
      dismissTipAction(tipId).catch(err => {
        console.warn('[SmartTip] Failed to persist dismiss:', err)
      })
    })
  }

  return (
    <div className="smart-tip" style={{ opacity: isPending ? 0.6 : 1 }}>
      <button
        type="button"
        onClick={handleDismiss}
        className="smart-tip-dismiss"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <span className="text-xl flex-shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-tx font-medium leading-snug">
            {message}
          </p>
          <a
            href={`/${lang}${actionHref}`}
            className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-brand hover:text-brand-light transition-colors"
          >
            {actionLabel}
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
