'use server'

import { revalidatePanel } from '@/lib/revalidate'
import { requirePanelAuth } from '@/lib/panel-auth'
import {
    cancelAdminOrder,
    createOrderFulfillment,
    getAdminOrderDetail,
    orderBelongsToScope,
} from '@/lib/medusa/admin'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'

export async function fulfillOrder(
    orderId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { tenantId } = await requirePanelAuth()
        const scope = await getTenantMedusaScope(tenantId)

        const order = await getAdminOrderDetail(orderId, scope)
        if (!orderBelongsToScope(order, scope)) {
            return { success: false, error: 'Order does not belong to current tenant scope' }
        }

        const result = await createOrderFulfillment(orderId, undefined, scope)
        if (result.error) {
            return { success: false, error: result.error }
        }
        revalidatePanel('panel')
        return { success: true }
    } catch (err) {
        console.error('[panel/orders] Fulfill error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

export async function cancelOrder(
    orderId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { tenantId } = await requirePanelAuth()
        const scope = await getTenantMedusaScope(tenantId)

        const order = await getAdminOrderDetail(orderId, scope)
        if (!orderBelongsToScope(order, scope)) {
            return { success: false, error: 'Order does not belong to current tenant scope' }
        }

        const result = await cancelAdminOrder(orderId, scope)
        if (result.error) {
            return { success: false, error: result.error }
        }
        revalidatePanel('panel')
        return { success: true }
    } catch (err) {
        console.error('[panel/orders] Cancel error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
