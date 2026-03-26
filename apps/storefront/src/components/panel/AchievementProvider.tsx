'use client'

/**
 * AchievementProvider — React context for tracking and celebrating achievements
 *
 * v3 (2026-03-22): Bulletproof dedup using localStorage as sole source of truth.
 *
 * How it works:
 * 1. Server evaluates which achievements are unlocked → sends as props
 * 2. On client mount (useEffect), reads localStorage for already-celebrated IDs
 * 3. Writes new IDs to localStorage BEFORE triggering state update
 * 4. Even if the component remounts immediately after, the next useEffect
 *    reads the updated localStorage and finds zero new achievements
 * 5. DB persist via saveAchievementsAction is best-effort backup
 *
 * Why useEffect and not useState initializer?
 * - useState initializer runs on BOTH server and client during SSR
 * - On server, localStorage doesn't exist → returns []
 * - React hydrates with [] and never re-runs the initializer
 * - useEffect is client-only, runs after hydration, perfect for this
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import CelebrationToast, { type CelebrationItem } from './CelebrationToast'
import { saveAchievementsAction } from '@/app/[lang]/(panel)/panel/actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AchievementContextValue {
  unlockedIds: string[]
  hasNewUnlocks: boolean
}

interface AchievementProviderProps {
  children: ReactNode
  currentlyUnlocked: string[]
  previouslyStored: string[]
  newAchievementIds?: string[]
  achievementLabels: Record<string, string>
  unlockLabel?: string
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AchievementContext = createContext<AchievementContextValue>({
  unlockedIds: [],
  hasNewUnlocks: false,
})

export function useAchievements() {
  return useContext(AchievementContext)
}

// ---------------------------------------------------------------------------
// localStorage — sole dedup layer (survives reloads, remounts, HMR)
// ---------------------------------------------------------------------------

const LS_KEY = 'bns_celebrated_achievements'

function readCelebrated(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return new Set(parsed)
    }
  } catch { /* corrupted — treat as empty */ }
  return new Set()
}

function writeCelebrated(ids: string[]) {
  try {
    const current = readCelebrated()
    for (const id of ids) current.add(id)
    localStorage.setItem(LS_KEY, JSON.stringify([...current]))
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Emoji mapping
// ---------------------------------------------------------------------------

const EMOJI: Record<string, string> = {
  first_product: '📦', brand_identity: '🎨', connected: '📞',
  go_live: '🚀', tour_complete: '🎓', first_sale: '💰',
  sales_streak: '🔥', revenue_milestone: '💎', shipping_ready: '🚚',
  product_master: '🏆', catalog_pro: '📚', module_explorer: '🔌',
  power_user: '⚡', fully_setup: '🌟', store_master: '👑',
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export default function AchievementProvider({
  children,
  currentlyUnlocked,
  previouslyStored,
  newAchievementIds,
  achievementLabels,
  unlockLabel,
}: AchievementProviderProps) {
  const [celebrations, setCelebrations] = useState<CelebrationItem[]>([])
  const [hasNewUnlocks, setHasNewUnlocks] = useState(false)

  useEffect(() => {
    // ── Step 1: Read what localStorage already knows about ──
    const alreadySeen = readCelebrated()

    // ── Step 2: Determine candidates from server props ──
    const serverStored = new Set(previouslyStored)
    const candidates = newAchievementIds
      ?? currentlyUnlocked.filter(id => !serverStored.has(id))

    // ── Step 3: Filter against localStorage (the REAL dedup) ──
    const fresh = candidates.filter(id => !alreadySeen.has(id))
    if (fresh.length === 0) return

    // ── Step 4: Write to localStorage FIRST (before state update) ──
    // This is critical: even if React tears down and remounts this
    // component in the same tick, the next useEffect will read the
    // updated localStorage and find zero fresh achievements.
    writeCelebrated(fresh)

    // ── Step 5: Now it's safe to trigger the celebration UI ──
    setHasNewUnlocks(true)
    setCelebrations(
      fresh.map(id => ({
        id,
        emoji: EMOJI[id] || '🏆',
        title: achievementLabels[`achievement.${id}.title`] || id,
        description: achievementLabels[`achievement.${id}.desc`] || '',
      }))
    )

    // ── Step 6: Best-effort DB persist (fire-and-forget) ──
    saveAchievementsAction(fresh).catch(() => {})

  // We intentionally use [] deps — this is a "run once on mount" effect.
  // The props are read from the closure at mount time only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDismiss = useCallback((id: string) => {
    setCelebrations(prev => prev.filter(c => c.id !== id))
  }, [])

  return (
    <AchievementContext.Provider
      value={{
        unlockedIds: currentlyUnlocked,
        hasNewUnlocks,
      }}
    >
      {children}
      <CelebrationToast
        items={celebrations}
        onDismiss={handleDismiss}
        unlockLabel={unlockLabel}
      />
    </AchievementContext.Provider>
  )
}
