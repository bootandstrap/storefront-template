'use client'

/**
 * CelebrationToast — Achievement unlock notification with confetti burst
 *
 * Shows when an owner unlocks a new milestone. Animated entry from right,
 * emoji shake, confetti particles, auto-dismiss after 5s.
 */

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CelebrationItem {
  id: string
  emoji: string
  title: string
  description: string
}

interface CelebrationToastProps {
  items: CelebrationItem[]
  onDismiss: (id: string) => void
  /** i18n label for "Achievement Unlocked!" */
  unlockLabel?: string
}

// ---------------------------------------------------------------------------
// Confetti burst particles
// ---------------------------------------------------------------------------

const CONFETTI_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4']

function ConfettiBurst() {
  const particles = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i / 12) * 360
    const distance = 30 + Math.random() * 50
    const x = Math.cos((angle * Math.PI) / 180) * distance
    const y = Math.sin((angle * Math.PI) / 180) * distance * -1
    const rotation = Math.random() * 720 - 360
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]

    return (
      <div
        key={i}
        className="confetti-particle"
        style={{
          backgroundColor: color,
          '--confetti-x': `${x}px`,
          '--confetti-y': `${y}px`,
          '--confetti-r': `${rotation}deg`,
          animationDelay: `${i * 30}ms`,
          left: '50%',
          top: '50%',
        } as React.CSSProperties}
      />
    )
  })

  return <div className="absolute inset-0 pointer-events-none overflow-hidden">{particles}</div>
}

// ---------------------------------------------------------------------------
// Single Toast
// ---------------------------------------------------------------------------

function SingleToast({
  item,
  onDismiss,
  index,
  unlockLabel,
}: {
  item: CelebrationItem
  onDismiss: () => void
  index: number
  unlockLabel?: string
}) {
  const [exiting, setExiting] = useState(false)

  // Auto-dismiss after 5s
  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(onDismiss, 300)
    }, 5000 + index * 800) // Stagger auto-dismiss for multiple toasts

    return () => clearTimeout(timer)
  }, [onDismiss, index])

  const handleClose = useCallback(() => {
    setExiting(true)
    setTimeout(onDismiss, 300)
  }, [onDismiss])

  return (
    <div
      className={`
        relative flex items-start gap-3 p-4 rounded-xl
        bg-sf-1 border border-brand shadow-lg shadow-brand-soft
        max-w-sm w-full
        ${exiting ? 'animate-slide-out-right' : 'celebrate-toast-enter'}
      `}
      style={{ animationDelay: `${index * 200}ms` }}
    >
      <ConfettiBurst />

      {/* Emoji with shake */}
      <div className="celebrate-emoji text-3xl flex-shrink-0 relative z-10">
        {item.emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="text-xs font-semibold text-brand uppercase tracking-wider mb-0.5">
          🏆 {unlockLabel || 'Achievement Unlocked!'}
        </div>
        <h4 className="text-sm font-bold text-tx truncate">
          {item.title}
        </h4>
        <p className="text-xs text-tx-muted mt-0.5 line-clamp-2">
          {item.description}
        </p>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        className="flex-shrink-0 text-tx-faint hover:text-tx-muted transition-colors relative z-10"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar countdown */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sf-3 rounded-b-xl overflow-hidden">
        <div
          className="h-full bg-brand-emphasis toast-progress-bar"
          style={{ animationDuration: `${5 + index * 0.8}s` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toast Stack
// ---------------------------------------------------------------------------

export default function CelebrationToast({ items, onDismiss, unlockLabel }: CelebrationToastProps) {
  if (items.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-3">
      {items.map((item, index) => (
        <SingleToast
          key={item.id}
          item={item}
          index={index}
          onDismiss={() => onDismiss(item.id)}
          unlockLabel={unlockLabel}
        />
      ))}
    </div>
  )
}
