import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    guard: vi.fn(),
    scope: vi.fn(),
    getOrder: vi.fn(),
    createPOSRefund: vi.fn(),
    getRefundedQuantities: vi.fn(),
}))

vi.mock('@/lib/panel-guard', () => ({ withPanelGuard: mocks.guard }))
vi.mock('@/lib/medusa/tenant-scope', () => ({ getTenantMedusaScope: mocks.scope }))
vi.mock('@/lib/medusa/admin-orders', () => ({
    getAdminOrderDetail: mocks.getOrder,
    createPOSRefundOperation: mocks.createPOSRefund,
    getPOSRefundedQuantities: mocks.getRefundedQuantities,
}))

import { createPOSRefundAction, getRefundableItemsAction } from '../refund-actions'

const order = {
    id: 'order-1',
    total: 3_500,
    currency_code: 'chf',
    items: [
        {
            id: 'item-1',
            title: 'Widget',
            variant_title: null,
            thumbnail: null,
            quantity: 2,
            unit_price: 1_000,
            total: 2_000,
            product_id: 'product-1',
        },
        {
            id: 'item-2',
            title: 'Gadget',
            variant_title: null,
            thumbnail: null,
            quantity: 1,
            unit_price: 1_500,
            total: 1_500,
            product_id: 'product-2',
        },
    ],
}

function request(overrides: Partial<Parameters<typeof createPOSRefundAction>[0]> = {}) {
    return createPOSRefundAction({
        order_id: 'order-1',
        items: [{ item_id: 'item-1', quantity: 1 }],
        reason: 'damaged',
        refund_amount: 1_000,
        operation_id: 'operation-1',
        idempotency_key: 'idempotency-1',
        ...overrides,
    })
}

describe('POS refund server authority', () => {
    beforeEach(() => {
        mocks.guard.mockReset().mockResolvedValue({
            tenantId: 'tenant-1',
            appConfig: { config: { default_currency: 'chf' } },
        })
        mocks.scope.mockReset().mockResolvedValue({ tenantId: 'tenant-1' })
        mocks.getOrder.mockReset().mockResolvedValue(order)
        mocks.createPOSRefund.mockReset().mockResolvedValue({
            operation: { outcome: 'acknowledged', status: 'acknowledged', refund_id: 'refund-1' },
            error: null,
        })
        mocks.getRefundedQuantities.mockReset().mockResolvedValue({
            refunded_quantities: {}, error: null,
        })
    })

    it.each([
        ['fractional amount', { refund_amount: 1_000.5 }],
        ['unknown item', { items: [{ item_id: 'unknown', quantity: 1 }] }],
        ['zero quantity', { items: [{ item_id: 'item-1', quantity: 0 }] }],
        ['excess quantity', { items: [{ item_id: 'item-1', quantity: 3 }] }],
        ['duplicate item', { items: [
            { item_id: 'item-1', quantity: 1 },
            { item_id: 'item-1', quantity: 1 },
        ], refund_amount: 2_000 }],
        ['client amount mismatch', { refund_amount: 999 }],
    ])('rejects %s before a refund mutation', async (_name, overrides) => {
        const result = await request(overrides)

        expect(result).toMatchObject({ success: false, refund: null })
        expect(result.error).toBeTruthy()
        expect(mocks.createPOSRefund).not.toHaveBeenCalled()
    })

    it('submits only the server-recomputed amount and marks completion after acknowledgement', async () => {
        const result = await request({
            items: [
                { item_id: 'item-1', quantity: 2 },
                { item_id: 'item-2', quantity: 1 },
            ],
            refund_amount: 3_500,
        })

        expect(mocks.createPOSRefund).toHaveBeenCalledWith(
            expect.objectContaining({
                order_id: 'order-1',
                operation_id: 'operation-1',
                idempotency_key: 'idempotency-1',
                items: [
                    { item_id: 'item-1', quantity: 2 },
                    { item_id: 'item-2', quantity: 1 },
                ],
            }),
            { tenantId: 'tenant-1' },
        )
        expect(result).toMatchObject({
            success: true,
            refund: { id: 'refund-1', total_refund: 3_500, status: 'completed' },
        })
    })

    it('does not mark a rejected Medusa refund as completed', async () => {
        mocks.createPOSRefund.mockResolvedValue({ operation: null, error: 'refund rejected' })

        const result = await request()

        expect(result).toEqual({ success: false, refund: null, error: 'refund rejected' })
    })

    it('does not mark pending or failed ledger outcomes as completed', async () => {
        mocks.createPOSRefund.mockResolvedValue({
            operation: { outcome: 'replay_pending', status: 'pending', refund_id: null },
            error: null,
        })

        const result = await request()

        expect(result).toEqual({
            success: false,
            refund: null,
            error: 'Refund outcome is pending authoritative acknowledgement',
        })
    })

    it('subtracts pending and acknowledged ledger quantities and preserves a valid empty list', async () => {
        mocks.getRefundedQuantities.mockResolvedValue({
            refunded_quantities: { 'item-1': 2, 'item-2': 1 },
            error: null,
        })

        const result = await getRefundableItemsAction('order-1')

        expect(result.error).toBeUndefined()
        expect(result.items).toEqual([])
    })

    it('fails closed when refund quantity authority is unavailable', async () => {
        mocks.getRefundedQuantities.mockResolvedValue({
            refunded_quantities: {}, error: 'pos_refund_runtime_unavailable',
        })

        const result = await getRefundableItemsAction('order-1')

        expect(result.items).toEqual([])
        expect(result.error).toBe('pos_refund_runtime_unavailable')
    })
})
