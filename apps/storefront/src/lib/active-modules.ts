/**
 * Active Module Detection — Multi-Source with Stripe Entitlements Awareness
 *
 * Detection hierarchy:
 *   Source 0: feature_flags (governance truth — synced by Stripe webhook or materializer)
 *   Source 1: module_orders + module_order_items (commercial truth — for tier resolution)
 *   Source 2: capability_overrides (demo/bundle fallback)
 *
 * Source 0 is always preferred because feature_flags are written by the Stripe
 * Entitlements webhook (<1s latency) and are the authoritative governance state.
 * Source 1 provides tier details (which tier is active for a module).
 *
 * F-22: Cleaned up — uses governance client, proper typing, no dead comments.
 * v2.0: Added flag-based detection as Source 0 for Stripe Entitlements support.
 */

import { createGovernanceClient } from '@/lib/supabase/governance'
import { deriveActiveModulesFromFlags } from '@/lib/governance/derive-modules'

export interface ActiveModuleInfo {
    moduleKey: string
    tierKey: string | null
    stripeSubscriptionId: string | null
    activatedAt: string
    /** How this module was detected */
    source: 'flags' | 'orders' | 'overrides'
}

// Internal types for the Supabase query response (untyped governance client)
interface OrderItem {
    module_key: string
    tier_name?: string | null
}

interface OrderRow {
    id: string
    status: string
    stripe_subscription_id: string | null
    activated_at: string | null
    paid_at: string | null
    module_order_items: OrderItem | OrderItem[]
}

/**
 * Get all active modules for a tenant.
 *
 * Uses a 3-source hierarchy:
 *   0. feature_flags → derive modules (Stripe Entitlements / materializer)
 *   1. module_orders → commercial records (for tier info)
 *   2. capability_overrides → demo/bundle fallback
 *
 * The result merges all sources: flags for activation, orders for tier details.
 */
export async function getActiveModulesForTenant(tenantId: string): Promise<ActiveModuleInfo[]> {
    const supabase = createGovernanceClient()

    // ── Source 0: Feature flags (governance truth — always fresh) ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: flagRow } = await (supabase as any)
        .from('feature_flags')
        .select('*')
        .eq('tenant_id', tenantId)
        .single() as { data: Record<string, boolean | null> | null }

    const flagDerivedModules = flagRow
        ? deriveActiveModulesFromFlags(flagRow as Record<string, boolean | null | undefined>)
        : new Set<string>()

    // ── Source 1: Module orders (commercial truth — for tier/stripe info) ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orders, error } = await (supabase as any)
        .from('module_orders')
        .select(`
            id,
            status,
            stripe_subscription_id,
            activated_at,
            paid_at,
            module_order_items (
                module_key,
                tier_name
            )
        `)
        .eq('tenant_id', tenantId)
        .in('status', ['paid', 'active', 'completed', 'confirmed']) as { data: OrderRow[] | null; error: { message: string } | null }

    if (error) {
        console.error('[active-modules] Error fetching module orders:', error)
    }

    // Build tier lookup from orders
    const orderTiers: Record<string, { tierKey: string; stripeSubscriptionId: string | null; activatedAt: string }> = {}
    if (orders) {
        for (const order of orders) {
            const items: OrderItem[] = Array.isArray(order.module_order_items)
                ? order.module_order_items
                : order.module_order_items ? [order.module_order_items] : []

            for (const item of items) {
                if (item.module_key) {
                    orderTiers[item.module_key] = {
                        tierKey: item.tier_name || 'basic',
                        stripeSubscriptionId: order.stripe_subscription_id || null,
                        activatedAt: order.activated_at || order.paid_at || new Date().toISOString(),
                    }
                }
            }
        }
    }

    // ── Merge: flags determine activation, orders provide tier details ──
    const activeModules: ActiveModuleInfo[] = []
    const seen = new Set<string>()

    // First: all flag-derived modules (Source 0)
    for (const moduleKey of flagDerivedModules) {
        seen.add(moduleKey)
        const orderInfo = orderTiers[moduleKey]
        activeModules.push({
            moduleKey,
            tierKey: orderInfo?.tierKey || null,
            stripeSubscriptionId: orderInfo?.stripeSubscriptionId || null,
            activatedAt: orderInfo?.activatedAt || new Date().toISOString(),
            source: 'flags',
        })
    }

    // Second: any order-based modules NOT already detected by flags (Source 1)
    for (const [moduleKey, info] of Object.entries(orderTiers)) {
        if (!seen.has(moduleKey)) {
            seen.add(moduleKey)
            activeModules.push({
                moduleKey,
                tierKey: info.tierKey,
                stripeSubscriptionId: info.stripeSubscriptionId,
                activatedAt: info.activatedAt,
                source: 'orders',
            })
        }
    }

    return activeModules
}
