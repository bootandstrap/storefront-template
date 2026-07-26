import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetCategories, mockGetProducts } = vi.hoisted(() => ({
    mockGetCategories: vi.fn(),
    mockGetProducts: vi.fn(),
}))

vi.mock('@/lib/medusa/client', () => ({
    getCategories: mockGetCategories,
    getProducts: mockGetProducts,
}))

function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((res) => {
        resolve = res
    })
    return { promise, resolve }
}

describe('resolveProductListingData', () => {
    beforeEach(() => {
        mockGetCategories.mockReset()
        mockGetProducts.mockReset()
    })

    it('fetches products in parallel with categories when no category filter is present', async () => {
        const categories = deferred<Array<{ id: string; name: string; handle: string }>>()
        mockGetCategories.mockReturnValueOnce(categories.promise)
        mockGetProducts.mockResolvedValueOnce({ products: [], count: 0 })

        const { resolveProductListingData } = await import('../product-listing')
        const listing = resolveProductListingData({ sort: 'title', q: 'headphones', page: '2' })
        await Promise.resolve()

        expect(mockGetProducts).toHaveBeenCalledWith({
            order: 'title',
            q: 'headphones',
            limit: 12,
            offset: 12,
        })

        categories.resolve([])
        await expect(listing).resolves.toMatchObject({
            categories: [],
            products: [],
            count: 0,
            currentPage: 2,
            totalPages: 0,
        })
    })

    it('waits for categories before fetching products when category handle must be resolved', async () => {
        const categories = deferred<Array<{ id: string; name: string; handle: string }>>()
        mockGetCategories.mockReturnValueOnce(categories.promise)
        mockGetProducts.mockResolvedValueOnce({ products: [], count: 0 })

        const { resolveProductListingData } = await import('../product-listing')
        const listing = resolveProductListingData({ category: 'audio' })
        await Promise.resolve()

        expect(mockGetProducts).not.toHaveBeenCalled()

        categories.resolve([{ id: 'cat_audio', name: 'Audio', handle: 'audio' }])
        await listing

        expect(mockGetProducts).toHaveBeenCalledWith({
            category_id: ['cat_audio'],
            order: undefined,
            q: undefined,
            limit: 12,
            offset: 0,
        })
    })
})
