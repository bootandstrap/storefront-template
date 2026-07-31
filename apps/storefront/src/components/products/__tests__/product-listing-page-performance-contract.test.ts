import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getDictionary: vi.fn(),
    getConfig: vi.fn(),
    resolveProductListingData: vi.fn(),
}))

vi.mock('@/lib/i18n', () => ({
    getDictionary: mocks.getDictionary,
    createTranslator: () => (key: string) => key,
}))

vi.mock('@/lib/config', () => ({
    getConfig: mocks.getConfig,
}))

vi.mock('@/lib/products/product-listing', () => ({
    resolveProductListingData: mocks.resolveProductListingData,
}))

vi.mock('@/components/products/ProductGrid', () => ({
    default: () => null,
}))

import ProductosPage from '../../../app/[lang]/(shop)/productos/page'

function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((resolver) => {
        resolve = resolver
    })
    return { promise, resolve }
}

describe('product listing page performance contract', () => {
    it('starts independent dictionary, governance, and catalog reads concurrently', async () => {
        const dictionary = deferred<Record<string, never>>()
        const governance = deferred<{
            featureFlags: {
                enable_product_badges: boolean
                enable_product_comparisons: boolean
            }
        }>()
        const listing = deferred<{
            categories: never[]
            products: never[]
            count: number
            currentPage: number
            totalPages: number
        }>()

        mocks.getDictionary.mockReturnValueOnce(dictionary.promise)
        mocks.getConfig.mockReturnValueOnce(governance.promise)
        mocks.resolveProductListingData.mockReturnValueOnce(listing.promise)

        const render = ProductosPage({
            params: Promise.resolve({ lang: 'es' }),
            searchParams: Promise.resolve({ page: '1' }),
        })

        await vi.waitFor(() => {
            expect(mocks.getDictionary).toHaveBeenCalledWith('es')
            expect(mocks.getConfig).toHaveBeenCalledOnce()
            expect(mocks.resolveProductListingData).toHaveBeenCalledWith({ page: '1' })
        })

        dictionary.resolve({})
        governance.resolve({
            featureFlags: {
                enable_product_badges: true,
                enable_product_comparisons: false,
            },
        })
        listing.resolve({
            categories: [],
            products: [],
            count: 0,
            currentPage: 1,
            totalPages: 0,
        })

        await expect(render).resolves.toBeDefined()
    })
})
