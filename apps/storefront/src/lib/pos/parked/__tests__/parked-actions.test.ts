import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockWithPanelGuard = vi.fn()
const mockGetTenantMedusaScope = vi.fn()
const mockCreateDraftOrder = vi.fn()
const mockAdminFetch = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: mockGetTenantMedusaScope,
}))

vi.mock('@/lib/medusa/admin-draft-orders', () => ({
    createDraftOrder: mockCreateDraftOrder,
}))

vi.mock('@/lib/medusa/admin-core', () => ({
    adminFetch: mockAdminFetch,
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: mockLoggerError,
    },
}))

const scope = { tenantId: 'tenant_123', medusaSalesChannelId: 'sc_1' }

describe('POS parked sale server actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant_123' })
        mockGetTenantMedusaScope.mockResolvedValue(scope)
        mockAdminFetch.mockResolvedValue({ data: { regions: [{ id: 'reg_1' }] }, error: null })
        mockCreateDraftOrder.mockResolvedValue({ draft_order: { id: 'draft_1' }, error: null })
    })

    it('parks sales as tenant-scoped Medusa draft orders with POS metadata', async () => {
        const { parkSaleAction } = await import('../parked-actions')

        await expect(parkSaleAction({
            customer_name: 'Ada',
            note: 'Pickup',
            items: [{ variant_id: 'var_1', quantity: 2, unit_price: 500, title: 'Apple' }],
        })).resolves.toEqual({ draft_order_id: 'draft_1' })

        expect(mockWithPanelGuard).toHaveBeenCalled()
        expect(mockGetTenantMedusaScope).toHaveBeenCalledWith('tenant_123')
        expect(mockAdminFetch).toHaveBeenCalledWith('/admin/regions?limit=1', {}, scope)
        expect(mockCreateDraftOrder).toHaveBeenCalledWith(expect.objectContaining({
            region_id: 'reg_1',
            sales_channel_id: 'sc_1',
            no_notification_order: true,
            metadata: expect.objectContaining({
                source: 'pos',
                pos_parked: true,
                customer_name: 'Ada',
                note: 'Pickup',
                item_titles: expect.stringContaining('Apple'),
            }),
        }), scope)
    })

    it('fails closed when no Medusa region exists', async () => {
        mockAdminFetch.mockResolvedValueOnce({ data: { regions: [] }, error: null })
        const { parkSaleAction } = await import('../parked-actions')

        await expect(parkSaleAction({
            items: [{ variant_id: 'var_1', quantity: 1, unit_price: 500, title: 'Apple' }],
        })).resolves.toEqual({ error: 'No region configured' })

        expect(mockCreateDraftOrder).not.toHaveBeenCalled()
    })

    it('lists only parked draft orders and normalizes optional metadata', async () => {
        mockAdminFetch.mockResolvedValueOnce({
            data: {
                draft_orders: [
                    {
                        id: 'draft_1',
                        items: [{ variant_id: 'var_1', quantity: 2, unit_price: 500, title: 'Apple' }],
                        metadata: { pos_parked: true, customer_name: 'Ada', note: 'Pickup', parked_at: '2026-07-20T10:00:00.000Z' },
                    },
                    {
                        id: 'draft_2',
                        items: [],
                        metadata: { pos_parked: false },
                    },
                ],
            },
            error: null,
        })
        const { listParkedSalesAction } = await import('../parked-actions')

        await expect(listParkedSalesAction()).resolves.toEqual({
            sales: [{
                id: 'draft_1',
                items: [{ variant_id: 'var_1', quantity: 2, unit_price: 500, title: 'Apple' }],
                customer_name: 'Ada',
                note: 'Pickup',
                parked_at: '2026-07-20T10:00:00.000Z',
            }],
        })
    })

    it('unparks sales by deleting the tenant-scoped draft order', async () => {
        mockAdminFetch.mockResolvedValueOnce({ data: {}, error: null })
        const { unparkSaleAction } = await import('../parked-actions')

        await expect(unparkSaleAction('draft_1')).resolves.toEqual({})

        expect(mockAdminFetch).toHaveBeenCalledWith('/admin/draft-orders/draft_1', { method: 'DELETE' }, scope)
    })
})
