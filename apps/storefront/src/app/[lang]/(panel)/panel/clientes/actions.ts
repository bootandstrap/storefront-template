'use server'

/**
 * Customer actions — Owner Panel
 *
 * Tenant-scoped server actions for lazy-loading customer details
 * and syncing loyalty data to Medusa.
 */

import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getAdminOrders, getAdminCustomerDetail, updateCustomerMetadata } from '@/lib/medusa/admin-orders'
import { logOwnerAction } from '@/lib/panel/log-owner-action'
import type { LoyaltyMedusaData } from '@/lib/pos/loyalty-engine'

export interface CustomerOrderSummary {
    id: string
    display_id: number
    status: string
    total: number
    currency_code: string
    created_at: string
}

export async function fetchCustomerOrders(customerId: string): Promise<{
    orders: CustomerOrderSummary[]
    error: string | null
}> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)

        const { orders } = await getAdminOrders({
            limit: 10,
            q: customerId,
        }, scope)

        const customerOrders = orders
            .filter(o => o.customer?.email) // basic filter
            .map(o => ({
                id: o.id,
                display_id: o.display_id,
                status: o.status,
                total: o.total,
                currency_code: o.currency_code,
                created_at: o.created_at,
            }))

        return { orders: customerOrders, error: null }
    } catch {
        return { orders: [], error: 'Failed to load orders' }
    }
}

// ---------------------------------------------------------------------------
// Loyalty ⇄ Medusa Sync
// ---------------------------------------------------------------------------

/**
 * Persists loyalty data to Medusa customer.metadata.loyalty
 * Called client-side after addStamp() / redeemReward() for dual-write.
 */
export async function syncLoyaltyStamps(
    customerId: string,
    loyaltyData: LoyaltyMedusaData
): Promise<{ error: string | null }> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)

        const { error } = await updateCustomerMetadata(
            customerId,
            { loyalty: loyaltyData },
            scope
        )

        if (!error) {
            logOwnerAction(tenantId, 'customer.sync_loyalty', { customerId, stamps: loyaltyData.stamps })
        }

        return { error }
    } catch {
        return { error: 'Failed to sync loyalty data' }
    }
}

/**
 * Reads loyalty data from Medusa customer.metadata.loyalty
 * Returns null if no loyalty data exists yet.
 */
export async function fetchCustomerLoyalty(
    customerId: string
): Promise<{ loyalty: LoyaltyMedusaData | null; error: string | null }> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)

        const customer = await getAdminCustomerDetail(customerId, scope)
        if (!customer) {
            return { loyalty: null, error: 'Customer not found' }
        }

        const loyalty = (customer.metadata?.loyalty as LoyaltyMedusaData) ?? null
        return { loyalty, error: null }
    } catch {
        return { loyalty: null, error: 'Failed to fetch loyalty data' }
    }
}
