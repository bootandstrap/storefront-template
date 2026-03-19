'use client'

/**
 * AchievementProvider — React context for tracking and celebrating achievements
 *
 * Wraps the panel layout. On mount, compares server-evaluated achievements
 * with stored state, shows celebration toasts for new unlocks, and persists.
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
  /** All currently unlocked achievement IDs */
  unlockedIds: string[]
  /** Whether any new achievements were detected on this session */
  hasNewUnlocks: boolean
}

interface AchievementProviderProps {
  children: ReactNode
  /** Server-evaluated currently unlocked IDs */
  currentlyUnlocked: string[]
  /** Previously persisted unlocked IDs */
  previouslyStored: string[]
  /** Translations for achievement titles/descriptions */
  achievementLabels: Record<string, string>
  /** The "Achievement Unlocked!" label */
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
// Provider
// ---------------------------------------------------------------------------

export default function AchievementProvider({
  children,
  currentlyUnlocked,
  previouslyStored,
  achievementLabels,
  unlockLabel,
}: AchievementProviderProps) {
  const [celebrations, setCelebrations] = useState<CelebrationItem[]>([])
  const [hasNewUnlocks, setHasNewUnlocks] = useState(false)

  // Detect new achievements on mount
  useEffect(() => {
    const storedSet = new Set(previouslyStored)
    const newIds = currentlyUnlocked.filter(id => !storedSet.has(id))

    if (newIds.length > 0) {
      setHasNewUnlocks(true)

      // Build celebration items from achievement defs
      const items: CelebrationItem[] = newIds
        .map(id => {
          // Import achievement defs dynamically to avoid server import issues
          const title = achievementLabels[`achievement.${id}.title`] || id
          const desc = achievementLabels[`achievement.${id}.desc`] || ''
          const emojiMap: Record<string, string> = {
            first_product: '📦', brand_identity: '🎨', connected: '📞',
            go_live: '🚀', tour_complete: '🎓', first_sale: '💰',
            sales_streak: '🔥', revenue_milestone: '💎', shipping_ready: '🚚',
            product_master: '🏆', catalog_pro: '📚', module_explorer: '🔌',
            power_user: '⚡', fully_setup: '🌟', store_master: '👑',
          }

          return {
            id,
            emoji: emojiMap[id] || '🏆',
            title,
            description: desc,
          }
        })

      setCelebrations(items)

      // Persist new achievements (fire-and-forget)
      saveAchievementsAction(newIds).catch(err => {
        console.warn('[AchievementProvider] Failed to persist:', err)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

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
      <CelebrationToast items={celebrations} onDismiss={handleDismiss} unlockLabel={unlockLabel} />
    </AchievementContext.Provider>
  )
}
