/**
 * Smart Tips Engine — Contextual suggestions based on store state
 *
 * Each tip has a condition function, target page, and i18n key.
 * Evaluates which tips to show based on current store metrics.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SmartTipDef {
  id: string
  emoji: string
  messageKey: string
  actionKey: string
  actionHref: string
  /** Pages where this tip should appear (empty = all pages) */
  targetPages: string[]
  category: 'setup' | 'growth' | 'sales'
}

export interface SmartTipContext {
  productCount: number
  categoryCount: number
  ordersThisMonth: number
  hasLogo: boolean
  hasContact: boolean
  hasPaymentMethod: boolean
  maintenanceOff: boolean
  activeModuleCount: number
  readinessScore: number
}

// ---------------------------------------------------------------------------
// Tip Registry (~10 contextual tips)
// ---------------------------------------------------------------------------

const TIPS: (SmartTipDef & { condition: (ctx: SmartTipContext) => boolean })[] = [
  {
    id: 'add_first_product',
    emoji: '📦',
    messageKey: 'smartTip.addFirstProduct',
    actionKey: 'smartTip.goToCatalog',
    actionHref: '/panel/catalogo',
    targetPages: ['panel'],
    category: 'setup',
    condition: ctx => ctx.productCount === 0,
  },
  {
    id: 'add_logo',
    emoji: '🎨',
    messageKey: 'smartTip.addLogo',
    actionKey: 'smartTip.goToSettings',
    actionHref: '/panel/tienda',
    targetPages: ['panel'],
    category: 'setup',
    condition: ctx => !ctx.hasLogo && ctx.productCount > 0,
  },
  {
    id: 'add_contact',
    emoji: '📞',
    messageKey: 'smartTip.addContact',
    actionKey: 'smartTip.goToSettings',
    actionHref: '/panel/tienda',
    targetPages: ['panel', 'tienda'],
    category: 'setup',
    condition: ctx => !ctx.hasContact,
  },
  {
    id: 'add_payment',
    emoji: '💳',
    messageKey: 'smartTip.addPayment',
    actionKey: 'smartTip.goToSettings',
    actionHref: '/panel/tienda',
    targetPages: ['panel'],
    category: 'setup',
    condition: ctx => !ctx.hasPaymentMethod && ctx.productCount > 0,
  },
  {
    id: 'go_live',
    emoji: '🚀',
    messageKey: 'smartTip.goLive',
    actionKey: 'smartTip.goToSettings',
    actionHref: '/panel/tienda',
    targetPages: ['panel'],
    category: 'setup',
    condition: ctx => !ctx.maintenanceOff && ctx.readinessScore >= 40,
  },
  {
    id: 'add_categories',
    emoji: '📂',
    messageKey: 'smartTip.addCategories',
    actionKey: 'smartTip.goToCategories',
    actionHref: '/panel/categorias',
    targetPages: ['panel', 'catalogo'],
    category: 'setup',
    condition: ctx => ctx.categoryCount === 0 && ctx.productCount >= 2,
  },
  {
    id: 'explore_modules',
    emoji: '🔌',
    messageKey: 'smartTip.exploreModules',
    actionKey: 'smartTip.goToModules',
    actionHref: '/panel/modulos',
    targetPages: ['panel'],
    category: 'growth',
    condition: ctx => ctx.activeModuleCount < 2 && ctx.readinessScore >= 30,
  },
  {
    id: 'activate_analytics',
    emoji: '📊',
    messageKey: 'smartTip.activateAnalytics',
    actionKey: 'smartTip.goToModules',
    actionHref: '/panel/modulos',
    targetPages: ['panel', 'pedidos'],
    category: 'growth',
    condition: ctx => ctx.ordersThisMonth >= 5 && ctx.activeModuleCount < 3,
  },
  {
    id: 'grow_catalog',
    emoji: '🏪',
    messageKey: 'smartTip.growCatalog',
    actionKey: 'smartTip.goToCatalog',
    actionHref: '/panel/catalogo',
    targetPages: ['panel'],
    category: 'growth',
    condition: ctx => ctx.productCount >= 1 && ctx.productCount < 5 && ctx.ordersThisMonth >= 1,
  },
  {
    id: 'celebrate_setup',
    emoji: '🎉',
    messageKey: 'smartTip.celebrateSetup',
    actionKey: 'smartTip.viewProgress',
    actionHref: '/panel',
    targetPages: ['panel'],
    category: 'growth',
    condition: ctx => ctx.readinessScore >= 80,
  },
]

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluate tips for a specific page.
 * Returns up to `limit` tips that match conditions and aren't dismissed.
 */
export function evaluateSmartTips(
  ctx: SmartTipContext,
  page: string,
  dismissedIds: string[],
  limit: number = 2,
): SmartTipDef[] {
  const dismissedSet = new Set(dismissedIds)

  return TIPS
    .filter(tip => {
      // Not dismissed
      if (dismissedSet.has(tip.id)) return false
      // Matches target page
      if (tip.targetPages.length > 0 && !tip.targetPages.some(p => page.includes(p))) return false
      // Condition met
      return tip.condition(ctx)
    })
    .slice(0, limit)
    .map(({ condition: _, ...rest }) => rest) // Strip condition fn from output
}
