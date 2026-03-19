/**
 * Achievement System — Milestones and unlockable badges for owner panel
 *
 * 15 milestones across 3 categories (Setup, Sales, Growth).
 * Evaluated against store readiness + live metrics.
 * Persists unlocked IDs to config.achievements_unlocked (JSONB).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AchievementCategory = 'setup' | 'sales' | 'growth'

export interface AchievementDef {
  id: string
  emoji: string
  titleKey: string         // i18n key
  descKey: string          // i18n key
  category: AchievementCategory
  /** Order within category for display grid */
  order: number
}

export interface UnlockedAchievement {
  id: string
  unlockedAt: string       // ISO timestamp
}

export interface AchievementContext {
  productCount: number
  categoryCount: number
  ordersThisMonth: number
  hasLogo: boolean
  hasContact: boolean
  hasPaymentMethod: boolean
  maintenanceOff: boolean
  activeModuleCount: number
  tourCompleted: boolean
  readinessScore: number
  revenueThisMonth: number  // in cents
}

// ---------------------------------------------------------------------------
// Achievement Registry (15 milestones)
// ---------------------------------------------------------------------------

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Setup (5)
  {
    id: 'first_product',
    emoji: '📦',
    titleKey: 'achievement.firstProduct.title',
    descKey: 'achievement.firstProduct.desc',
    category: 'setup',
    order: 1,
  },
  {
    id: 'brand_identity',
    emoji: '🎨',
    titleKey: 'achievement.brandIdentity.title',
    descKey: 'achievement.brandIdentity.desc',
    category: 'setup',
    order: 2,
  },
  {
    id: 'connected',
    emoji: '📞',
    titleKey: 'achievement.connected.title',
    descKey: 'achievement.connected.desc',
    category: 'setup',
    order: 3,
  },
  {
    id: 'go_live',
    emoji: '🚀',
    titleKey: 'achievement.goLive.title',
    descKey: 'achievement.goLive.desc',
    category: 'setup',
    order: 4,
  },
  {
    id: 'tour_complete',
    emoji: '🎓',
    titleKey: 'achievement.tourComplete.title',
    descKey: 'achievement.tourComplete.desc',
    category: 'setup',
    order: 5,
  },

  // Sales (4)
  {
    id: 'first_sale',
    emoji: '💰',
    titleKey: 'achievement.firstSale.title',
    descKey: 'achievement.firstSale.desc',
    category: 'sales',
    order: 1,
  },
  {
    id: 'sales_streak',
    emoji: '🔥',
    titleKey: 'achievement.salesStreak.title',
    descKey: 'achievement.salesStreak.desc',
    category: 'sales',
    order: 2,
  },
  {
    id: 'revenue_milestone',
    emoji: '💎',
    titleKey: 'achievement.revenueMilestone.title',
    descKey: 'achievement.revenueMilestone.desc',
    category: 'sales',
    order: 3,
  },
  {
    id: 'shipping_ready',
    emoji: '🚚',
    titleKey: 'achievement.shippingReady.title',
    descKey: 'achievement.shippingReady.desc',
    category: 'sales',
    order: 4,
  },

  // Growth (6)
  {
    id: 'product_master',
    emoji: '🏆',
    titleKey: 'achievement.productMaster.title',
    descKey: 'achievement.productMaster.desc',
    category: 'growth',
    order: 1,
  },
  {
    id: 'catalog_pro',
    emoji: '📚',
    titleKey: 'achievement.catalogPro.title',
    descKey: 'achievement.catalogPro.desc',
    category: 'growth',
    order: 2,
  },
  {
    id: 'module_explorer',
    emoji: '🔌',
    titleKey: 'achievement.moduleExplorer.title',
    descKey: 'achievement.moduleExplorer.desc',
    category: 'growth',
    order: 3,
  },
  {
    id: 'power_user',
    emoji: '⚡',
    titleKey: 'achievement.powerUser.title',
    descKey: 'achievement.powerUser.desc',
    category: 'growth',
    order: 4,
  },
  {
    id: 'fully_setup',
    emoji: '🌟',
    titleKey: 'achievement.fullySetup.title',
    descKey: 'achievement.fullySetup.desc',
    category: 'growth',
    order: 5,
  },
  {
    id: 'store_master',
    emoji: '👑',
    titleKey: 'achievement.storeMaster.title',
    descKey: 'achievement.storeMaster.desc',
    category: 'growth',
    order: 6,
  },
]

// ---------------------------------------------------------------------------
// Condition evaluators
// ---------------------------------------------------------------------------

const CONDITIONS: Record<string, (ctx: AchievementContext) => boolean> = {
  first_product:      ctx => ctx.productCount >= 1,
  brand_identity:     ctx => ctx.hasLogo,
  connected:          ctx => ctx.hasContact,
  go_live:            ctx => ctx.maintenanceOff,
  tour_complete:      ctx => ctx.tourCompleted,
  first_sale:         ctx => ctx.ordersThisMonth >= 1,
  sales_streak:       ctx => ctx.ordersThisMonth >= 10,
  revenue_milestone:  ctx => ctx.revenueThisMonth >= 10000, // 100 CHF in cents
  shipping_ready:     ctx => ctx.hasPaymentMethod, // shipping = payment setup for now
  product_master:     ctx => ctx.productCount >= 10,
  catalog_pro:        ctx => ctx.categoryCount >= 5,
  module_explorer:    ctx => ctx.activeModuleCount >= 3,
  power_user:         ctx => ctx.activeModuleCount >= 5,
  fully_setup:        ctx => ctx.readinessScore >= 80,
  store_master:       ctx => ctx.readinessScore >= 100,
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluates all achievements against current context.
 * Returns IDs of achievements that are currently unlocked.
 */
export function evaluateAchievements(ctx: AchievementContext): string[] {
  return ACHIEVEMENT_DEFS
    .filter(def => {
      const condition = CONDITIONS[def.id]
      return condition ? condition(ctx) : false
    })
    .map(def => def.id)
}

/**
 * Find newly unlocked achievements by comparing current state
 * with previously stored unlocked IDs.
 */
export function findNewAchievements(
  currentlyUnlocked: string[],
  previouslyStored: string[],
): string[] {
  const storedSet = new Set(previouslyStored)
  return currentlyUnlocked.filter(id => !storedSet.has(id))
}

/**
 * Get achievement definition by ID.
 */
export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENT_DEFS.find(def => def.id === id)
}

/**
 * Get achievements grouped by category, with unlock status.
 */
export function getAchievementsGrouped(unlockedIds: string[]): {
  setup: (AchievementDef & { unlocked: boolean })[]
  sales: (AchievementDef & { unlocked: boolean })[]
  growth: (AchievementDef & { unlocked: boolean })[]
} {
  const unlockedSet = new Set(unlockedIds)

  const enrich = (def: AchievementDef) => ({
    ...def,
    unlocked: unlockedSet.has(def.id),
  })

  return {
    setup: ACHIEVEMENT_DEFS.filter(d => d.category === 'setup').sort((a, b) => a.order - b.order).map(enrich),
    sales: ACHIEVEMENT_DEFS.filter(d => d.category === 'sales').sort((a, b) => a.order - b.order).map(enrich),
    growth: ACHIEVEMENT_DEFS.filter(d => d.category === 'growth').sort((a, b) => a.order - b.order).map(enrich),
  }
}
