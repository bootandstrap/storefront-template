import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetTenantMedusaScope = vi.fn()
const mockCreateAdminProduct = vi.fn()
const mockGetAdminProductsFull = vi.fn()
const mockGetAdminProduct = vi.fn()
const mockUpdateAdminProduct = vi.fn()
const mockDeleteAdminProduct = vi.fn()

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: mockGetTenantMedusaScope,
}))

vi.mock('@/lib/medusa/admin', () => ({
    createAdminProduct: mockCreateAdminProduct,
    getAdminProductsFull: mockGetAdminProductsFull,
    getAdminProduct: mockGetAdminProduct,
    updateAdminProduct: mockUpdateAdminProduct,
    deleteAdminProduct: mockDeleteAdminProduct,
}))

describe('createBns360EcommerceMedusaClient', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockGetTenantMedusaScope.mockResolvedValue({
            tenantId: 'tenant-1',
            medusaSalesChannelId: 'sc_tenant_1',
        })
        mockCreateAdminProduct.mockResolvedValue({
            product: {
                id: 'prod_1',
                title: 'BNS360 Product Initial',
                handle: 'bns360-ecommerce-run-1',
                status: 'draft',
                metadata: {},
            },
            error: null,
        })
    })

    it('adds the tenant Medusa sales channel to product creation payloads', async () => {
        const { createBns360EcommerceMedusaClient } = await import('../route-support')
        const client = await createBns360EcommerceMedusaClient('tenant-1')

        await client.createProduct({
            title: 'BNS360 Product Initial',
            handle: 'bns360-ecommerce-run-1',
            description: 'certification product',
            status: 'draft',
            metadata: { bns360_run_id: 'run-1' },
            options: [{ title: 'Formato', values: ['Default'] }],
            variants: [
                {
                    title: 'Default',
                    prices: [{ amount: 100, currency_code: 'eur' }],
                    manage_inventory: false,
                    options: { Formato: 'Default' },
                },
            ],
        })

        expect(mockCreateAdminProduct).toHaveBeenCalledWith(
            expect.objectContaining({
                sales_channels: [{ id: 'sc_tenant_1' }],
            }),
            {
                tenantId: 'tenant-1',
                medusaSalesChannelId: 'sc_tenant_1',
            }
        )
    })
})
