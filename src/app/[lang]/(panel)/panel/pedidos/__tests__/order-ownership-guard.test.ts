import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequirePanelAuth = vi.fn()
const mockGetTenantMedusaScope = vi.fn()
const mockGetAdminOrderDetail = vi.fn()
const mockOrderBelongsToScope = vi.fn()
const mockCreateOrderFulfillment = vi.fn()
const mockCancelAdminOrder = vi.fn()

vi.mock('@/lib/panel-auth', () => ({
    requirePanelAuth: mockRequirePanelAuth,
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: mockGetTenantMedusaScope,
}))

vi.mock('@/lib/medusa/admin', () => ({
    getAdminOrderDetail: mockGetAdminOrderDetail,
    orderBelongsToScope: mockOrderBelongsToScope,
    createOrderFulfillment: mockCreateOrderFulfillment,
    cancelAdminOrder: mockCancelAdminOrder,
}))

vi.mock('@/lib/revalidate', () => ({
    revalidatePanel: vi.fn(),
}))

describe('order ownership guard', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockRequirePanelAuth.mockResolvedValue({
            user: { id: 'owner-1' },
            role: 'owner',
            tenantId: 'tenant-1',
        })
        mockGetTenantMedusaScope.mockResolvedValue({
            tenantId: 'tenant-1',
            medusaSalesChannelId: 'sc_tenant_1',
        })
        mockGetAdminOrderDetail.mockResolvedValue({ id: 'ord_1' })
        mockCreateOrderFulfillment.mockResolvedValue({ error: null })
        mockCancelAdminOrder.mockResolvedValue({ error: null })
    })

    it('blocks fulfill when order is outside tenant scope', async () => {
        mockOrderBelongsToScope.mockReturnValue(false)
        const { fulfillOrder } = await import('../actions')

        const result = await fulfillOrder('ord_1')

        expect(result.success).toBe(false)
        expect(result.error).toContain('Order does not belong to current tenant scope')
        expect(mockCreateOrderFulfillment).not.toHaveBeenCalled()
    })

    it('allows fulfill when order belongs to tenant scope', async () => {
        mockOrderBelongsToScope.mockReturnValue(true)
        const { fulfillOrder } = await import('../actions')

        const result = await fulfillOrder('ord_1')

        expect(result.success).toBe(true)
        expect(mockCreateOrderFulfillment).toHaveBeenCalledWith(
            'ord_1',
            undefined,
            { tenantId: 'tenant-1', medusaSalesChannelId: 'sc_tenant_1' }
        )
    })

    it('blocks cancel when order is outside tenant scope', async () => {
        mockOrderBelongsToScope.mockReturnValue(false)
        const { cancelOrder } = await import('../actions')

        const result = await cancelOrder('ord_1')

        expect(result.success).toBe(false)
        expect(mockCancelAdminOrder).not.toHaveBeenCalled()
    })
})
