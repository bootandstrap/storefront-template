/**
 * Owner Modules Data Layer — Fetches module catalog for the owner panel
 *
 * Uses the get_owner_module_catalog RPC for locale-aware module data.
 * Falls back to governance client direct query if RPC unavailable.
 */

import { createClient } from '@/lib/supabase/server'
import { getConfig } from '@/lib/config'

// ── Types ────────────────────────────────────────────────────────────────────

export interface OwnerModuleInfo {
  key: string
  name: string
  description: string
  tagline: string
  emoji: string
  icon_name: string
  category: string
  color_gradient: string
  text_color: string
  icon_color: string
  is_purchasable: boolean
  has_free_tier: boolean
  requires: string[]
  payment_type: 'subscription' | 'one_time' | 'extension'
  sort_order: number
  /** Module availability status. 'construction' disables purchase globally. */
  status: 'active' | 'construction'
  tiers: OwnerTierInfo[]
}

export interface OwnerTierInfo {
  key: string
  name: string
  price: number
  features: string[]
  is_recommended: boolean
  stripe_price_id: string | null
}

export interface OwnerModuleStatus {
  /** Modules that are currently active for this tenant */
  activeModules: Record<string, { tierKey: string }>
  /** All available modules from the catalog */
  catalog: OwnerModuleInfo[]
  /** Tenant's current monthly module spend */
  monthlySpend: number
}

// ── Data Fetching ────────────────────────────────────────────────────────────

/**
 * Get the full module marketplace data for the owner.
 * Combines catalog data with tenant's active modules.
 */
export async function getOwnerModuleStatus(locale: string): Promise<OwnerModuleStatus> {
  const supabase = await createClient()
  const { config, featureFlags } = await getConfig()
  const tenantId = config.tenant_id || ''

  // ── Fetch catalog (locale-aware) ──
  const catalog = await fetchModuleCatalog(supabase, locale)

  // ── Fetch active modules for this tenant ──
  const activeModules = await fetchActiveModules(supabase, tenantId)

  // ── Calculate monthly spend ──
  const monthlySpend = calculateMonthlySpend(catalog, activeModules)

  return { activeModules, catalog, monthlySpend }
}

async function fetchModuleCatalog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  locale: string,
): Promise<OwnerModuleInfo[]> {
  let dbCatalog: OwnerModuleInfo[] = []

  // Try RPC first
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_owner_module_catalog', { p_locale: locale })

  if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
    dbCatalog = rpcData.map(mapRpcToOwnerModule)
  } else {
    // Fallback: direct query with manual locale selection
    const { data: modules, error } = await supabase
      .from('modules')
      .select(`
        id, key, name, name_en, name_de, name_fr, name_it,
        description, description_en, description_de, description_fr, description_it,
        tagline, tagline_en, tagline_de, tagline_fr, tagline_it,
        emoji, icon_name, category,
        color_gradient, text_color, icon_color,
        is_purchasable, has_free_tier, requires, sort_order, payment_type,
        module_tiers (
          id, key, tier_name, tier_name_en, tier_name_de, tier_name_fr, tier_name_it,
          price, features, is_recommended, stripe_price_id, sort_order
        )
      `)
      .eq('is_active', true)
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })

    if (!error && modules) {
      dbCatalog = modules.map(m => ({
        key: m.key,
        name: getLocalizedField(m, 'name', locale),
        description: getLocalizedField(m, 'description', locale),
        tagline: getLocalizedField(m, 'tagline', locale),
        emoji: m.emoji || '📦',
        icon_name: m.icon_name || 'Package',
        category: m.category || 'other',
        color_gradient: m.color_gradient || 'from-gray-500 to-gray-600',
        text_color: m.text_color || 'text-gray-600',
        icon_color: m.icon_color || 'text-gray-500',
        is_purchasable: m.is_purchasable ?? true,
        status: 'active' as const,
        has_free_tier: m.has_free_tier ?? false,
        requires: parseRequires(m.requires),
        payment_type: (['one_time', 'extension'].includes(m.payment_type || '') ? m.payment_type : 'subscription') as OwnerModuleInfo['payment_type'],
        sort_order: m.sort_order ?? 0,
        tiers: (m.module_tiers || [])
          .sort((a: { sort_order?: number }, b: { sort_order?: number }) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0)
          )
          .map((t: Record<string, unknown>) => ({
            key: t.key as string,
            name: getLocalizedField(t, 'tier_name', locale),
            price: t.price as number,
            features: parseFeatures(t.features),
            is_recommended: t.is_recommended as boolean || false,
            stripe_price_id: t.stripe_price_id as string | null,
          })),
      }))
    }
  }

  // ── Contract-catalog fallback ──────────────────────────────────────────
  // Supplement DB results with modules from governance-contract.json
  // that are not yet in the modules table (e.g. pos_kiosk, capacidad).
  try {
    const contract = await import('@/lib/governance/governance-contract.json')
    const contractCatalog = (contract.modules?.catalog || []) as Array<{
      key: string; name: string; icon: string; description: string
      category: string; popular?: boolean; status?: string
      requires: string[]
      tiers: Array<{ key: string; name: string; price_chf: number; features: string[]; recommended?: boolean }>
    }>
    const existingKeys = new Set(dbCatalog.map(m => m.key))

    for (const cm of contractCatalog) {
      if (!existingKeys.has(cm.key)) {
        dbCatalog.push({
          key: cm.key,
          name: cm.name,
          description: cm.description,
          tagline: '',
          emoji: cm.icon || '📦',
          icon_name: CONTRACT_ICON_MAP[cm.key] || 'Package',
          category: cm.category || 'other',
          color_gradient: CONTRACT_GRADIENT_MAP[cm.key] || 'from-gray-500 to-gray-600',
          text_color: 'text-gray-600',
          icon_color: 'text-gray-500',
          is_purchasable: true,
          status: (cm.status as 'active' | 'construction') || 'active',
          has_free_tier: false,
          requires: cm.requires || [],
          payment_type: 'subscription',
          sort_order: dbCatalog.length,
          tiers: (cm.tiers || []).map(t => ({
            key: t.key,
            name: t.name,
            price: t.price_chf,
            features: t.features || [],
            is_recommended: t.recommended || false,
            stripe_price_id: null,
          })),
        })
      }
    }
  } catch {
    // Contract not available — proceed with DB-only catalog
  }

  return dbCatalog
}

// ── Contract fallback metadata ───────────────────────────────────────────────
const CONTRACT_ICON_MAP: Record<string, string> = {
  ecommerce: 'ShoppingBag',
  sales_channels: 'MessageCircle',
  chatbot: 'Bot',
  crm: 'Users',
  seo: 'Search',
  rrss: 'Share2',
  i18n: 'Globe',
  automation: 'Zap',
  auth_advanced: 'Shield',
  email_marketing: 'Mail',
  pos: 'Monitor',
  pos_kiosk: 'Tablet',
  capacidad: 'BarChart3',
}

const CONTRACT_GRADIENT_MAP: Record<string, string> = {
  ecommerce: 'from-emerald-500 to-emerald-700',
  sales_channels: 'from-green-500 to-teal-600',
  chatbot: 'from-violet-500 to-purple-700',
  crm: 'from-amber-500 to-orange-600',
  seo: 'from-sky-500 to-blue-700',
  rrss: 'from-pink-500 to-rose-700',
  i18n: 'from-cyan-500 to-teal-600',
  automation: 'from-yellow-500 to-amber-600',
  auth_advanced: 'from-slate-500 to-slate-700',
  email_marketing: 'from-red-500 to-rose-600',
  pos: 'from-indigo-500 to-blue-600',
  pos_kiosk: 'from-blue-500 to-indigo-700',
  capacidad: 'from-purple-500 to-indigo-600',
}

async function fetchActiveModules(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
): Promise<Record<string, { tierKey: string }>> {
  const active: Record<string, { tierKey: string }> = {}

  // ── Source 0: Feature flags (governance truth — Stripe Entitlements synced) ──
  // feature_flags are always fresh: written by Stripe webhook or materializer.
  // We derive which modules are active from enabled flags.
  try {
    const { data: flagRow } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (flagRow) {
      // Import the derive function dynamically to avoid circular deps
      const { deriveActiveModulesFromFlags } = await import('@/lib/governance/derive-modules')
      const flagModules = deriveActiveModulesFromFlags(flagRow as Record<string, boolean | null | undefined>)

      // We know which modules are active from flags, but we need tier info
      // from module_orders (Source 1) below. Mark them with default tier for now.
      for (const moduleKey of flagModules) {
        active[moduleKey] = { tierKey: 'basic' }
      }
    }
  } catch {
    // Non-fatal — fall through to Source 1
  }

  // ── Source 1: Commercial truth (Stripe-backed module_orders + items) ──
  // module_orders has no module_key column — real data lives in module_order_items
  const { data: orders } = await supabase
    .from('module_orders')
    .select(`
      id, status,
      module_order_items (
        module_key,
        tier_name
      )
    `)
    .eq('tenant_id', tenantId)
    .in('status', ['active', 'paid', 'completed', 'confirmed'])

  if (orders) {
    for (const order of orders as Array<{
      id: string
      status: string
      module_order_items: Array<{ module_key: string; tier_name: string | null }> | { module_key: string; tier_name: string | null } | null
    }>) {
      const items = Array.isArray(order.module_order_items)
        ? order.module_order_items
        : order.module_order_items ? [order.module_order_items] : []
      for (const item of items) {
        if (item.module_key) {
          // Orders provide tier info — upgrade the default tier from Source 0
          active[item.module_key] = { tierKey: item.tier_name || 'basic' }
        }
      }
    }
  }

  // ── Source 2: Governance fallback (demo/bundle provisioned tenants) ──
  // When applyModuleBundle() materializes module_orders, this fallback
  // catches the gap for older demo tenants that only have capability_overrides.
  if (Object.keys(active).length === 0) {
    const { data: overrides } = await supabase
      .from('capability_overrides')
      .select('key, value, reason')
      .eq('tenant_id', tenantId)
      .like('reason', 'bundle:%')

    if (overrides && overrides.length > 0) {
      // Overrides exist from a bundle — derive module list from flag keys
      // e.g. key 'enable_ecommerce' → module 'ecommerce'
      // We map known flag prefixes to module keys
      const FLAG_MODULE_REVERSE: Record<string, string> = {
        enable_ecommerce: 'ecommerce',
        enable_online_payments: 'sales_channels',
        enable_whatsapp_checkout: 'sales_channels',
        enable_chatbot: 'chatbot',
        enable_crm: 'crm',
        enable_analytics: 'seo',
        enable_newsletter: 'email_marketing',
        enable_multi_language: 'i18n',
        enable_email_campaigns: 'email_marketing',
        enable_abandoned_cart_emails: 'automation',
        enable_google_oauth: 'auth_advanced',
        enable_reviews: 'ecommerce',
        enable_wishlist: 'ecommerce',
        enable_promotions: 'ecommerce',
        enable_social_links: 'rrss',
      }
      for (const ov of overrides) {
        const moduleKey = FLAG_MODULE_REVERSE[ov.key]
        if (moduleKey && ov.value === true && !active[moduleKey]) {
          active[moduleKey] = { tierKey: 'enterprise' } // bundles apply max tier
        }
      }
    }
  }

  return active
}

function calculateMonthlySpend(
  catalog: OwnerModuleInfo[],
  activeModules: Record<string, { tierKey: string }>,
): number {
  let total = 0
  for (const [key, { tierKey }] of Object.entries(activeModules)) {
    const module = catalog.find(m => m.key === key)
    if (!module) continue
    const tier = module.tiers.find(t => t.key === tierKey)
    if (tier) total += tier.price
  }
  return total
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getLocalizedField(obj: Record<string, unknown>, field: string, locale: string): string {
  const localeSuffix = locale === 'es' ? '' : `_${locale}`
  const localizedKey = localeSuffix ? `${field}${localeSuffix}` : field
  return (obj[localizedKey] as string) || (obj[field] as string) || ''
}

function parseRequires(val: unknown): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return [] }
  }
  return []
}

function parseFeatures(val: unknown): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return [] }
  }
  return []
}

function mapRpcToOwnerModule(row: Record<string, unknown>): OwnerModuleInfo {
  return {
    key: row.key as string,
    name: row.name as string,
    description: row.description as string,
    tagline: (row.tagline as string) || '',
    emoji: (row.emoji as string) || '📦',
    icon_name: (row.icon_name as string) || 'Package',
    category: (row.category as string) || 'other',
    color_gradient: (row.color_gradient as string) || 'from-gray-500 to-gray-600',
    text_color: (row.text_color as string) || 'text-gray-600',
    icon_color: (row.icon_color as string) || 'text-gray-500',
    is_purchasable: row.is_purchasable as boolean,
    status: (row.status as 'active' | 'construction') || 'active',
    has_free_tier: row.has_free_tier as boolean,
    requires: parseRequires(row.requires),
    payment_type: (['one_time', 'extension'].includes(row.payment_type as string || '') 
      ? row.payment_type as OwnerModuleInfo['payment_type'] 
      : 'subscription') as OwnerModuleInfo['payment_type'],
    sort_order: (row.sort_order as number) || 0,
    tiers: ((row.tiers as Record<string, unknown>[]) || []).map(t => ({
      key: t.key as string,
      name: t.name as string,
      price: t.price as number,
      features: parseFeatures(t.features),
      is_recommended: t.is_recommended as boolean || false,
      stripe_price_id: t.stripe_price_id as string | null,
    })),
  }
}
