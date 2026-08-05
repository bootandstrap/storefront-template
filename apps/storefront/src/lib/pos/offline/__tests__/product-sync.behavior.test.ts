import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    guard: vi.fn(),
    tenantScope: vi.fn(),
    legacyScope: vi.fn(),
    products: vi.fn(),
}))

vi.mock('@/lib/panel-guard', () => ({ withPanelGuard: mocks.guard }))
vi.mock('@/lib/medusa/tenant-scope', () => ({ getTenantMedusaScope: mocks.tenantScope }))
vi.mock('@/lib/medusa/admin', () => ({
    resolveScope: mocks.legacyScope,
    getAdminProductsFull: mocks.products,
}))

import { syncProductCatalogAction } from '../product-sync'
import { applyProductCatalogSyncResult } from '../useOfflineSync'

const scope = { tenantId: 'tenant-1', medusaSalesChannelId: 'sc-1' }

describe('POS product catalog sync boundary', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.guard.mockResolvedValue({ tenantId: 'tenant-1' })
        mocks.tenantScope.mockResolvedValue(scope)
        mocks.legacyScope.mockResolvedValue(null)
        mocks.products.mockResolvedValue({ products: [], count: 0, error: null })
    })

    it('requires the offline POS capability and resolves scope from the authorized tenant', async () => {
        await syncProductCatalogAction()

        expect(mocks.guard).toHaveBeenCalledWith({ requiredFlag: 'enable_pos_offline_cart' })
        expect(mocks.tenantScope).toHaveBeenCalledWith('tenant-1')
        expect(mocks.products).toHaveBeenCalledWith({ limit: 500, status: 'published' }, scope)
        expect(mocks.legacyScope).not.toHaveBeenCalled()
    })

    it('fails closed before catalog access when the tenant scope is unavailable', async () => {
        mocks.tenantScope.mockResolvedValue(null)

        const result = await syncProductCatalogAction()

        expect(result.products).toEqual([])
        expect(result.totalCount).toBe(0)
        expect(result.error).toBe('POS product sync unavailable: tenant scope is missing')
        expect(mocks.products).not.toHaveBeenCalled()
    })

    it('does not report an upstream Medusa read error as a successful empty catalog', async () => {
        mocks.products.mockResolvedValue({ products: [], count: 0, error: 'Medusa unavailable' })

        const result = await syncProductCatalogAction()

        expect(result.products).toEqual([])
        expect(result.totalCount).toBe(0)
        expect(result.error).toBe('POS product sync unavailable')
    })

    it('maps only the scoped Medusa snapshot after a successful response', async () => {
        mocks.products.mockResolvedValue({
            count: 1,
            error: null,
            products: [{
                id: 'prod-1',
                title: 'Coffee',
                thumbnail: null,
                status: 'published',
                updated_at: '2026-08-05T00:00:00.000Z',
                variants: [{
                    id: 'variant-1',
                    title: 'Default',
                    sku: 'COFFEE-1',
                    barcode: '123',
                    manage_inventory: true,
                    inventory_quantity: 4,
                    prices: [{ amount: 500, currency_code: 'chf' }],
                }],
                categories: [{ id: 'cat-1', name: 'Drinks' }],
            }],
        })

        const result = await syncProductCatalogAction()

        expect(result.error).toBeUndefined()
        expect(result.totalCount).toBe(1)
        expect(result.products).toEqual([expect.objectContaining({
            id: 'prod-1',
            variants: [expect.objectContaining({ id: 'variant-1', inventory_quantity: 4 })],
        })])
    })
})

describe('POS product catalog snapshot application', () => {
    const result = {
        products: [],
        serverTime: 1_786_000_000_000,
        totalCount: 0,
    }

    function createStore() {
        return {
            replaceProducts: vi.fn().mockResolvedValue(undefined),
            setLastSyncTime: vi.fn().mockResolvedValue(undefined),
            getProducts: vi.fn().mockResolvedValue([]),
        }
    }

    it('does not mutate the cache or freshness marker after a failed server sync', async () => {
        const store = createStore()

        await expect(applyProductCatalogSyncResult(store, {
            ...result,
            error: 'POS product sync unavailable',
        })).rejects.toThrow('POS product sync unavailable')

        expect(store.replaceProducts).not.toHaveBeenCalled()
        expect(store.setLastSyncTime).not.toHaveBeenCalled()
    })

    it('replaces a successful full snapshot, including an authoritative empty catalog', async () => {
        const store = createStore()

        await applyProductCatalogSyncResult(store, result)

        expect(store.replaceProducts).toHaveBeenCalledWith([])
        expect(store.setLastSyncTime).toHaveBeenCalledWith(result.serverTime)
        expect(store.getProducts).toHaveBeenCalledOnce()
    })

    it('does not advance freshness when the atomic snapshot replacement fails', async () => {
        const store = createStore()
        store.replaceProducts.mockRejectedValue(new Error('IndexedDB transaction aborted'))

        await expect(applyProductCatalogSyncResult(store, result))
            .rejects.toThrow('IndexedDB transaction aborted')

        expect(store.setLastSyncTime).not.toHaveBeenCalled()
    })
})
