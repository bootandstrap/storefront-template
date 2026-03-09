'use server'

/**
 * Customer actions — Owner Panel
 *
 * Tenant-scoped server actions for lazy-loading customer details.
 */

import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getAdminOrders } from '@/lib/medusa/admin-orders'

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
