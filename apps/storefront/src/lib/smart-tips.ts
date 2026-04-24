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
  // ── Governance-native extensions ──
  /** Product limit usage percentage (0-100) */
  productLimitPct?: number
  /** Order limit usage percentage (0-100) */
  orderLimitPct?: number
  /** Storage limit usage percentage (0-100) */
  storageLimitPct?: number
  /** Whether chatbot module is available but not active */
  chatbotAvailableNotActive?: boolean
  /** Whether SEO module is available but not active */
  seoAvailableNotActive?: boolean
  /** Whether CRM module is available but not active */
  crmAvailableNotActive?: boolean
  /** Current plan name */
  planName?: string
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
    actionHref: '/panel/mi-tienda',
    targetPages: ['panel'],
    category: 'setup',
    condition: ctx => ctx.productCount === 0,
  },
  {
    id: 'add_logo',
    emoji: '🎨',
    messageKey: 'smartTip.addLogo',
    actionKey: 'smartTip.goToSettings',
    actionHref: '/panel/ajustes?tab=tienda',
    targetPages: ['panel'],
    category: 'setup',
    condition: ctx => !ctx.hasLogo && ctx.productCount > 0,
  },
  {
    id: 'add_contact',
    emoji: '📞',
    messageKey: 'smartTip.addContact',
    actionKey: 'smartTip.goToSettings',
    actionHref: '/panel/ajustes?tab=tienda',
    targetPages: ['panel', 'ajustes'],
    category: 'setup',
    condition: ctx => !ctx.hasContact,
  },
  {
    id: 'add_payment',
    emoji: '💳',
    messageKey: 'smartTip.addPayment',
    actionKey: 'smartTip.goToSettings',
    actionHref: '/panel/ajustes?tab=tienda',
    targetPages: ['panel'],
    category: 'setup',
    condition: ctx => !ctx.hasPaymentMethod && ctx.productCount > 0,
  },
  {
    id: 'go_live',
    emoji: '🚀',
    messageKey: 'smartTip.goLive',
    actionKey: 'smartTip.goToSettings',
    actionHref: '/panel/ajustes?tab=tienda',
    targetPages: ['panel'],
    category: 'setup',
    condition: ctx => !ctx.maintenanceOff && ctx.readinessScore >= 40,
  },
  {
    id: 'add_categories',
    emoji: '📂',
    messageKey: 'smartTip.addCategories',
    actionKey: 'smartTip.goToCategories',
    actionHref: '/panel/mi-tienda?tab=categorias',
    targetPages: ['panel', 'mi-tienda'],
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
    targetPages: ['panel', 'ventas'],
    category: 'growth',
    condition: ctx => ctx.ordersThisMonth >= 5 && ctx.activeModuleCount < 3,
  },
  {
    id: 'grow_catalog',
    emoji: '🏪',
    messageKey: 'smartTip.growCatalog',
    actionKey: 'smartTip.goToCatalog',
    actionHref: '/panel/mi-tienda',
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
  // ── Governance-Aware Tips (2026 Refactor) ──
  {
    id: 'limit_products_warning',
    emoji: '⚠️',
    messageKey: 'smartTip.productsApproachingLimit',
    actionKey: 'smartTip.goToModules',
    actionHref: '/panel/modulos',
    targetPages: ['panel', 'mi-tienda'],
    category: 'growth',
    condition: ctx => (ctx.productLimitPct ?? 0) >= 75 && (ctx.productLimitPct ?? 0) < 100,
  },
  {
    id: 'limit_orders_warning',
    emoji: '📈',
    messageKey: 'smartTip.ordersApproachingLimit',
    actionKey: 'smartTip.goToModules',
    actionHref: '/panel/modulos',
    targetPages: ['panel', 'ventas'],
    category: 'growth',
    condition: ctx => (ctx.orderLimitPct ?? 0) >= 80,
  },
  {
    id: 'recommend_chatbot',
    emoji: '🤖',
    messageKey: 'smartTip.recommendChatbot',
    actionKey: 'smartTip.goToModules',
    actionHref: '/panel/modulos',
    targetPages: ['panel'],
    category: 'growth',
    condition: ctx => !!ctx.chatbotAvailableNotActive && ctx.ordersThisMonth >= 10,
  },
  {
    id: 'recommend_seo',
    emoji: '🔍',
    messageKey: 'smartTip.recommendSEO',
    actionKey: 'smartTip.goToModules',
    actionHref: '/panel/modulos',
    targetPages: ['panel'],
    category: 'growth',
    condition: ctx => !!ctx.seoAvailableNotActive && ctx.productCount >= 10,
  },
  {
    id: 'recommend_crm',
    emoji: '👥',
    messageKey: 'smartTip.recommendCRM',
    actionKey: 'smartTip.goToModules',
    actionHref: '/panel/modulos',
    targetPages: ['panel', 'ventas'],
    category: 'growth',
    condition: ctx => !!ctx.crmAvailableNotActive && ctx.ordersThisMonth >= 20,
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
