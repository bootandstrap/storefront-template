/**
 * POS Refund Actions
 *
 * Server actions for processing refunds at the POS terminal.
 * Enterprise tier feature (gated by enable_pos_shifts).
 */
'use server'

import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getAdminOrderDetail, createPOSRefundOperation, getPOSRefundedQuantities } from '@/lib/medusa/admin-orders'
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

        const availability = await getPOSRefundedQuantities(orderId, scope)
        if (availability.error) {
            return { items: [], order_total: 0, currency_code: fallbackCurrency, error: availability.error }
        }

        const items: RefundableItem[] = (order.items || []).flatMap(item => {
            const refundableQuantity = Math.max(0, item.quantity - (availability.refunded_quantities[item.id] ?? 0))
            return refundableQuantity === 0 ? [] : [{
                id: item.id,
                title: item.title,
                variant_title: item.variant_title,
                thumbnail: item.thumbnail,
                quantity: item.quantity,
                refundable_quantity: refundableQuantity,
                unit_price: item.unit_price,
                total: item.total,
            }]
        })

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

type POSRefundRequest = {
    order_id: string
    items: { item_id: string; quantity: number }[]
    reason: RefundReason
    reason_note?: string
    refund_amount: number // minor units
    operation_id: string
    idempotency_key: string
}

type OrderDetail = NonNullable<Awaited<ReturnType<typeof getAdminOrderDetail>>>
type ValidatedRefundItem = { title: string; quantity: number; amount: number }
type RefundFailure = { valid: false; error: string }
type RefundValidation =
    | { valid: true; items: ValidatedRefundItem[]; amount: number }
    | RefundFailure

function invalidRefund(error: string): RefundFailure {
    return { valid: false, error }
}

function validateRefundInputShape(input: POSRefundRequest): RefundFailure | null {
    if (!Number.isSafeInteger(input.refund_amount) || input.refund_amount <= 0) {
        return invalidRefund('Refund amount must use positive integer minor units')
    }
    if (input.items.length === 0) return invalidRefund('No items selected for refund')
    return null
}

function validateSelectedRefundItem(
    selectedItem: POSRefundRequest['items'][number],
    order: OrderDetail,
    seenItemIds: Set<string>,
): RefundFailure | { valid: true; item: ValidatedRefundItem } {
    if (seenItemIds.has(selectedItem.item_id)) return invalidRefund('Duplicate refund item')
    seenItemIds.add(selectedItem.item_id)

    const orderItem = order.items.find(item => item.id === selectedItem.item_id)
    if (!orderItem) return invalidRefund('Refund item does not belong to order')
    if (
        !Number.isSafeInteger(selectedItem.quantity)
        || selectedItem.quantity <= 0
        || selectedItem.quantity > orderItem.quantity
    ) {
        return invalidRefund('Invalid refund item quantity')
    }
    if (!Number.isSafeInteger(orderItem.unit_price) || orderItem.unit_price < 0) {
        return invalidRefund('Order item price is invalid')
    }

    const amount = orderItem.unit_price * selectedItem.quantity
    if (!Number.isSafeInteger(amount)) return invalidRefund('Refund amount exceeds safe integer range')
    return {
        valid: true,
        item: { title: orderItem.title, quantity: selectedItem.quantity, amount },
    }
}

function validateRefundRequest(input: POSRefundRequest, order: OrderDetail): RefundValidation {
    const seenItemIds = new Set<string>()
    const items: ValidatedRefundItem[] = []
    let amount = 0
    for (const selectedItem of input.items) {
        const result = validateSelectedRefundItem(selectedItem, order, seenItemIds)
        if (!result.valid) return result
        amount += result.item.amount
        items.push(result.item)
    }
    if (
        !Number.isSafeInteger(amount)
        || amount <= 0
        || amount > order.total
        || amount !== input.refund_amount
    ) {
        return invalidRefund('Refund amount does not match selected order items')
    }
    if (!input.operation_id.trim() || !input.idempotency_key.trim()) {
        return invalidRefund('Refund operation identity is required')
    }
    return { valid: true, items, amount }
}

function refundFailure(error: string) {
    return { success: false, refund: null, error } as const
}

export async function createPOSRefundAction(
    input: POSRefundRequest,
): Promise<{ success: boolean; refund: POSRefund | null; error?: string }> {
    try {
        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_pos_shifts' })
        const inputFailure = validateRefundInputShape(input)
        if (inputFailure) return refundFailure(inputFailure.error)
        const scope = await getTenantMedusaScope(tenantId)
        const order = await getAdminOrderDetail(input.order_id, scope)
        if (!order) return refundFailure('Order not found')
        const validated = validateRefundRequest(input, order)
        if (!validated.valid) return refundFailure(validated.error)

        const { operation, error } = await createPOSRefundOperation(
            {
                order_id: input.order_id,
                operation_id: input.operation_id,
                idempotency_key: input.idempotency_key,
                items: input.items,
                reason: input.reason,
                reason_note: input.reason_note,
            },
            scope
        )

        if (error) return refundFailure(error)
        if (operation?.status !== 'acknowledged' || !operation.refund_id) {
            return refundFailure('Refund outcome is pending authoritative acknowledgement')
        }

        // Build receipt data
        const refund: POSRefund = {
            id: operation.refund_id,
            order_id: input.order_id,
            items: validated.items,
            reason: input.reason,
            reason_note: input.reason_note,
            total_refund: validated.amount,
            currency_code: order.currency_code,
            created_at: new Date().toISOString(),
            status: 'completed',
        }

        return { success: true, refund }
    } catch (err) {
        return refundFailure(err instanceof Error ? err.message : 'Refund failed')
    }
}
