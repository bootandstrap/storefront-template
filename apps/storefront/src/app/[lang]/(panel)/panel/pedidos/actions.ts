'use server'

import { revalidatePanel } from '@/lib/revalidate'
import { withPanelGuard } from '@/lib/panel-guard'
import { logOwnerAction } from '@/lib/panel/log-owner-action'
import {
    cancelAdminOrder,
    createOrderFulfillment,
    getAdminOrderDetail,
    orderBelongsToScope,
    createAdminRefund,
} from '@/lib/medusa/admin'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { logger } from '@/lib/logger'

export async function fulfillOrder(
    orderId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
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
        logOwnerAction(tenantId, 'order.fulfill', { orderId })
        return { success: true }
    } catch (err) {
        logger.error('[panel/orders] Fulfill error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

export async function cancelOrder(
    orderId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
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
        logOwnerAction(tenantId, 'order.cancel', { orderId })
        return { success: true }
    } catch (err) {
        logger.error('[panel/orders] Cancel error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

export async function refundOrder(
    orderId: string,
    paymentId: string,
    amount: number
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!paymentId || typeof amount !== 'number' || amount <= 0) {
            return { success: false, error: 'Invalid refund parameters' }
        }

        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
        const scope = await getTenantMedusaScope(tenantId)

        // Verify order belongs to tenant
        const order = await getAdminOrderDetail(orderId, scope)
        if (!orderBelongsToScope(order, scope)) {
            return { success: false, error: 'Order does not belong to current tenant scope' }
        }

        const result = await createAdminRefund(paymentId, amount, scope)
        if (result.error) {
            return { success: false, error: result.error }
        }
        revalidatePanel('panel')
        logOwnerAction(tenantId, 'order.refund', { orderId, paymentId, amount })
        return { success: true }
    } catch (err) {
        logger.error('[panel/orders] Refund error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
