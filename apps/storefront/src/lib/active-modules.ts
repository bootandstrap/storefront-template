/**
 * Commercial Source of Truth for Active Modules
 *
 * Queries `module_orders` + `module_order_items` to determine which modules
 * are commercially active for a tenant. This is the billing-level truth —
 * feature_flags are the governance-level truth (derived from this).
 *
 * F-22: Cleaned up — uses governance client, proper typing, no dead comments.
 */

import { createGovernanceClient } from '@/lib/supabase/governance'

export interface ActiveModuleInfo {
    moduleKey: string
    tierKey: string | null
    stripeSubscriptionId: string | null
    activatedAt: string
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
 * Get all commercially active modules for a tenant.
 *
 * Active = module_orders with status in ('paid', 'active', 'completed', 'confirmed').
 * Each order can have multiple items (modules).
 */
export async function getActiveModulesForTenant(tenantId: string): Promise<ActiveModuleInfo[]> {
    const supabase = createGovernanceClient()

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

    if (error || !orders) {
        console.error('[active-modules] Error fetching active modules:', error)
        return []
    }

    const activeModules: ActiveModuleInfo[] = []

    for (const order of orders) {
        const items: OrderItem[] = Array.isArray(order.module_order_items)
            ? order.module_order_items
            : order.module_order_items ? [order.module_order_items] : []

        for (const item of items) {
            activeModules.push({
                moduleKey: item.module_key,
                tierKey: item.tier_name || null,
                stripeSubscriptionId: order.stripe_subscription_id || null,
                activatedAt: order.activated_at || order.paid_at || new Date().toISOString(),
            })
        }
    }

    return activeModules
}
