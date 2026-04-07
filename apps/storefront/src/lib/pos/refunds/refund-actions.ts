/**
 * POS Refund Actions
 *
 * Server actions for processing refunds at the POS terminal.
 * Enterprise tier feature (gated by enable_pos_shifts).
 */
'use server'

import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getAdminOrderDetail, createOrderRefund } from '@/lib/medusa/admin-orders'
import type { POSRefund, RefundReason } from '@/lib/pos/pos-config'

// ---------------------------------------------------------------------------
// Get refundable items for an order
// ---------------------------------------------------------------------------

export interface RefundableItem {
    id: string
    title: string
    variant_title: string | null
    thumbnail: string | null
    quantity: number           // originally ordered
    refundable_quantity: number // can still refund
    unit_price: number
    total: number
}

export async function getRefundableItemsAction(
    orderId: string
): Promise<{ items: RefundableItem[]; order_total: number; currency_code: string; error?: string }> {
    try {
        const { tenantId, appConfig } = await withPanelGuard({ requiredFlag: 'enable_pos_shifts' })
        const fallbackCurrency = appConfig.config.default_currency || 'eur'
        const scope = await getTenantMedusaScope(tenantId)
        const order = await getAdminOrderDetail(orderId, scope)

        if (!order) {
            return { items: [], order_total: 0, currency_code: fallbackCurrency, error: 'Order not found' }
        }

        const items: RefundableItem[] = (order.items || []).map(item => ({
            id: item.id,
            title: item.title,
            variant_title: item.variant_title,
            thumbnail: item.thumbnail,
            quantity: item.quantity,
            refundable_quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
        }))

        return {
            items,
            order_total: order.total,
            currency_code: order.currency_code || fallbackCurrency,
        }
    } catch (err) {
        // In error paths, we may not have appConfig yet — use 'eur' as safe default
        return {
            items: [],
            order_total: 0,
            currency_code: 'eur',
            error: err instanceof Error ? err.message : 'Failed to load order',
        }
    }
}

// ---------------------------------------------------------------------------
// Process POS refund (full or partial)
// ---------------------------------------------------------------------------

export async function createPOSRefundAction(input: {
    order_id: string
    items: { item_id: string; quantity: number }[]
    reason: RefundReason
    reason_note?: string
    refund_amount: number // minor units
}): Promise<{ success: boolean; refund: POSRefund | null; error?: string }> {
    try {
        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_pos_shifts' })

        if (input.refund_amount <= 0) {
            return { success: false, refund: null, error: 'Refund amount must be positive' }
        }

        if (input.items.length === 0) {
            return { success: false, refund: null, error: 'No items selected for refund' }
        }

        const scope = await getTenantMedusaScope(tenantId)
        const order = await getAdminOrderDetail(input.order_id, scope)
        if (!order) {
            return { success: false, refund: null, error: 'Order not found' }
        }

        // Build refund note
        const reasonLabels: Record<RefundReason, string> = {
            damaged: 'Producto dañado',
            wrong_item: 'Producto equivocado',
            dissatisfied: 'Cliente insatisfecho',
            other: 'Otro',
        }
        const note = [
            `POS Refund: ${reasonLabels[input.reason]}`,
            input.reason_note ? `Nota: ${input.reason_note}` : '',
            `Items: ${input.items.map(i => {
                const orderItem = order.items.find(oi => oi.id === i.item_id)
                return orderItem ? `${orderItem.title} x${i.quantity}` : i.item_id
            }).join(', ')}`,
        ].filter(Boolean).join(' | ')

        // Process refund via Medusa admin API
        const { error } = await createOrderRefund(
            input.order_id,
            {
                amount: input.refund_amount,
                reason: input.reason === 'other' ? 'other' : 'return',
                note,
            },
            scope
        )

        if (error) {
            return { success: false, refund: null, error }
        }

        // Build receipt data
        const refundItems = input.items.map(i => {
            const orderItem = order.items.find(oi => oi.id === i.item_id)
            return {
                title: orderItem?.title || 'Unknown',
                quantity: i.quantity,
                amount: (orderItem?.unit_price || 0) * i.quantity,
            }
        })

        const refund: POSRefund = {
            id: `ref_${Date.now()}`,
            order_id: input.order_id,
            items: refundItems,
            reason: input.reason,
            reason_note: input.reason_note,
            total_refund: input.refund_amount,
            currency_code: order.currency_code,
            created_at: new Date().toISOString(),
            status: 'completed',
        }

        return { success: true, refund }
    } catch (err) {
        return {
            success: false,
            refund: null,
            error: err instanceof Error ? err.message : 'Refund failed',
        }
    }
}
