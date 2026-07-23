import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockAdminFetch = vi.fn()

vi.mock('../admin-core', () => ({
    adminFetch: mockAdminFetch,
    normalizeAdminListParams: vi.fn(params => ({
        limit: params?.limit ?? 20,
        offset: params?.offset ?? 0,
        q: params?.q,
        status: params?.status,
    })),
}))

describe('createAdminProduct', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('binds new products to the default shipping profile when none is supplied', async () => {
        mockAdminFetch
            .mockResolvedValueOnce({
                data: { shipping_profiles: [{ id: 'sp_default', type: 'default' }] },
                error: null,
            })
            .mockResolvedValueOnce({
                data: { product: { id: 'prod_1', title: 'Panel Product', handle: 'panel-product', status: 'published' } },
                error: null,
            })

        const { createAdminProduct } = await import('../admin-products')

        const result = await createAdminProduct({
            title: 'Panel Product',
            status: 'published',
            variants: [{ title: 'Default', prices: [{ amount: 1000, currency_code: 'eur' }] }],
        }, { tenantId: 'tenant-1', medusaSalesChannelId: 'sc_1' })

        expect(result.error).toBeNull()
        const createCall = mockAdminFetch.mock.calls.at(-1)
        expect(createCall?.[0]).toBe('/admin/products')
        expect(createCall?.[1]).toMatchObject({ method: 'POST' })
        expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
            shipping_profile_id: 'sp_default',
        })
        expect(createCall?.[2]).toEqual({ tenantId: 'tenant-1', medusaSalesChannelId: 'sc_1' })
    })
})
