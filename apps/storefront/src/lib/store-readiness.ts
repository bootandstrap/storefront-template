/**
 * Store Readiness Engine — calculates a 0-100 score for owner panel gamification
 *
 * Provides a weighted checklist of things an owner should do to fully set up
 * their store. Powers: StoreHealthCard, SmartTips, AchievementSystem.
 *
 * Cache: 60s per tenant (via in-memory Map).
 */

import { getConfigForTenant } from '@/lib/config'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getProductCount, getCategoryCount, getOrdersThisMonth } from '@/lib/medusa/admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReadinessCheck {
  id: string
  emoji: string
  labelKey: string        // i18n key for display
  descKey: string         // i18n key for description / tip
  weight: number          // contribution to total score (all weights sum to 100)
  done: boolean
  actionHref: string      // panel page to fix this
  category: 'setup' | 'content' | 'sales' | 'growth'
}

export type StoreLevel = 'setup' | 'growing' | 'thriving'

export interface StoreReadinessResult {
  score: number            // 0-100
  level: StoreLevel
  checks: ReadinessCheck[]
  nextAction: ReadinessCheck | null  // first incomplete check
  completedCount: number
  totalCount: number
}

// ---------------------------------------------------------------------------
// Cache (60s TTL)
// ---------------------------------------------------------------------------

const cache = new Map<string, { result: StoreReadinessResult; ts: number }>()
const CACHE_TTL_MS = 60_000

export function invalidateReadinessCache(tenantId: string): void {
  cache.delete(tenantId)
}

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

function getLevel(score: number): StoreLevel {
  if (score >= 80) return 'thriving'
  if (score >= 40) return 'growing'
  return 'setup'
}

export async function calculateStoreReadiness(
  tenantId: string,
  lang: string = 'es',
): Promise<StoreReadinessResult> {
  // Check cache
  const cached = cache.get(tenantId)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.result
  }

  // Fetch data in parallel
  const appConfig = await getConfigForTenant(tenantId)
  const { config, featureFlags } = appConfig

  let productCount = 0
  let categoryCount = 0
  let ordersThisMonth = 0

  try {
    const scope = await getTenantMedusaScope(tenantId)
    const [pc, cc, otm] = await Promise.all([
      getProductCount(scope),
      getCategoryCount(scope),
      getOrdersThisMonth(scope),
    ])
    productCount = pc
    categoryCount = cc
    ordersThisMonth = otm
  } catch {
    // Medusa unavailable — degrade gracefully, counts stay 0
  }

  const hasPaymentMethod =
    featureFlags.enable_whatsapp_checkout ||
    featureFlags.enable_online_payments ||
    featureFlags.enable_cash_on_delivery ||
    featureFlags.enable_bank_transfer

  // Define all checks with weights (sum = 100)
  const checks: ReadinessCheck[] = [
    {
      id: 'first_product',
      emoji: '📦',
      labelKey: 'storeHealth.check.firstProduct',
      descKey: 'storeHealth.tip.firstProduct',
      weight: 15,
      done: productCount > 0,
      actionHref: `/${lang}/panel/mi-tienda`,
      category: 'content',
    },
    {
      id: 'brand_logo',
      emoji: '🎨',
      labelKey: 'storeHealth.check.logo',
      descKey: 'storeHealth.tip.logo',
      weight: 10,
      done: !!config.logo_url,
      actionHref: `/${lang}/panel/ajustes?tab=tienda`,
      category: 'setup',
    },
    {
      id: 'contact_info',
      emoji: '📞',
      labelKey: 'storeHealth.check.contact',
      descKey: 'storeHealth.tip.contact',
      weight: 10,
      done: !!config.whatsapp_number || !!config.store_email,
      actionHref: `/${lang}/panel/ajustes?tab=tienda`,
      category: 'setup',
    },
    {
      id: 'payment_method',
      emoji: '💳',
      labelKey: 'storeHealth.check.payment',
      descKey: 'storeHealth.tip.payment',
      weight: 12,
      done: hasPaymentMethod,
      actionHref: `/${lang}/panel/ajustes?tab=tienda`,
      category: 'setup',
    },
    {
      id: 'categories',
      emoji: '📂',
      labelKey: 'storeHealth.check.categories',
      descKey: 'storeHealth.tip.categories',
      weight: 8,
      done: categoryCount > 0,
      actionHref: `/${lang}/panel/mi-tienda?tab=categorias`,
      category: 'content',
    },
    {
      id: 'go_live',
      emoji: '🚀',
      labelKey: 'storeHealth.check.goLive',
      descKey: 'storeHealth.tip.goLive',
      weight: 12,
      done: !featureFlags.enable_maintenance_mode,
      actionHref: `/${lang}/panel/ajustes?tab=tienda`,
      category: 'setup',
    },
    {
      id: 'first_sale',
      emoji: '💰',
      labelKey: 'storeHealth.check.firstSale',
      descKey: 'storeHealth.tip.firstSale',
      weight: 10,
      done: ordersThisMonth > 0,
      actionHref: `/${lang}/panel/ventas`,
      category: 'sales',
    },
    {
      id: 'multi_products',
      emoji: '🏪',
      labelKey: 'storeHealth.check.multiProducts',
      descKey: 'storeHealth.tip.multiProducts',
      weight: 8,
      done: productCount >= 5,
      actionHref: `/${lang}/panel/mi-tienda`,
      category: 'growth',
    },
    {
      id: 'multi_categories',
      emoji: '📚',
      labelKey: 'storeHealth.check.multiCategories',
      descKey: 'storeHealth.tip.multiCategories',
      weight: 7,
      done: categoryCount >= 3,
      actionHref: `/${lang}/panel/mi-tienda?tab=categorias`,
      category: 'growth',
    },
    {
      id: 'active_modules',
      emoji: '🔌',
      labelKey: 'storeHealth.check.modules',
      descKey: 'storeHealth.tip.modules',
      weight: 8,
      done: [
        featureFlags.enable_carousel,
        featureFlags.enable_analytics,
        featureFlags.enable_chatbot,
        featureFlags.enable_crm,
        featureFlags.enable_reviews,
      ].filter(Boolean).length >= 2,
      actionHref: `/${lang}/panel/modulos`,
      category: 'growth',
    },
  ]

  const score = checks.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0)
  const completedCount = checks.filter(c => c.done).length
  const nextAction = checks.find(c => !c.done) || null

  const result: StoreReadinessResult = {
    score,
    level: getLevel(score),
    checks,
    nextAction,
    completedCount,
    totalCount: checks.length,
  }

  // Cache result
  cache.set(tenantId, { result, ts: Date.now() })

  return result
}
