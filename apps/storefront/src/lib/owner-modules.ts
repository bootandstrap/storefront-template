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
  sort_order: number
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
  // Try RPC first
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_owner_module_catalog', { p_locale: locale })

  if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
    return rpcData.map(mapRpcToOwnerModule)
  }

  // Fallback: direct query with manual locale selection
  const { data: modules, error } = await supabase
    .from('modules')
    .select(`
      id, key, name, name_en, name_de, name_fr, name_it,
      description, description_en, description_de, description_fr, description_it,
      tagline, tagline_en, tagline_de, tagline_fr, tagline_it,
      emoji, icon_name, category,
      color_gradient, text_color, icon_color,
      is_purchasable, has_free_tier, requires, sort_order,
      module_tiers (
        id, key, tier_name, tier_name_en, tier_name_de, tier_name_fr, tier_name_it,
        price, features, is_recommended, stripe_price_id, sort_order
      )
    `)
    .eq('is_active', true)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })

  if (error || !modules) return []

  return modules.map(m => ({
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
    has_free_tier: m.has_free_tier ?? false,
    requires: parseRequires(m.requires),
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

async function fetchActiveModules(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
): Promise<Record<string, { tierKey: string }>> {
  const { data: orders } = await supabase
    .from('module_orders')
    .select('module_key, tier_key, status')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const active: Record<string, { tierKey: string }> = {}
  if (orders) {
    for (const order of orders) {
      active[order.module_key] = { tierKey: order.tier_key }
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
    has_free_tier: row.has_free_tier as boolean,
    requires: parseRequires(row.requires),
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
