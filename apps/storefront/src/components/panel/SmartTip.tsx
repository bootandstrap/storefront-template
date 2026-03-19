'use client'

/**
 * SmartTip — Contextual suggestion banner shown on panel pages
 *
 * Dismissible, persists via server action. Shows emoji, message, and action link.
 */

import { useState, useTransition } from 'react'
import { ArrowRight, X } from 'lucide-react'
import type { SmartTipDef } from '@/lib/smart-tips'
import { dismissTipAction } from '@/app/[lang]/(panel)/panel/actions'

interface SmartTipProps {
  tip: SmartTipDef
  t: (key: string) => string
  lang: string
}

export default function SmartTip({ tip, t, lang }: SmartTipProps) {
  const [dismissed, setDismissed] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    startTransition(() => {
      dismissTipAction(tip.id).catch(err => {
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
        <span className="text-xl flex-shrink-0">{tip.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary font-medium leading-snug">
            {t(tip.messageKey)}
          </p>
          <a
            href={`/${lang}${tip.actionHref}`}
            className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-primary hover:text-primary-light transition-colors"
          >
            {t(tip.actionKey)}
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
