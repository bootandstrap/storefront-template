import { getCategories, getProducts } from '@/lib/medusa/client'

export const PRODUCTS_PER_PAGE = 12

export interface ProductListingSearchParams {
    category?: string
    sort?: string
    q?: string
    page?: string
}

export async function resolveProductListingData(sp: ProductListingSearchParams) {
    const currentPage = Math.max(1, parseInt(sp.page || '1', 10) || 1)
    const offset = (currentPage - 1) * PRODUCTS_PER_PAGE
    const categoriesPromise = getCategories()

    let products: Awaited<ReturnType<typeof getProducts>>['products'] = []
    let count = 0

    if (!sp.category) {
        const productsPromise = getProducts({
            order: sp.sort || undefined,
            q: sp.q || undefined,
            limit: PRODUCTS_PER_PAGE,
            offset,
        })
        const [categories, productResult] = await Promise.all([
            categoriesPromise,
            productsPromise.catch(() => ({ products: [], count: 0 })),
        ])

        products = productResult.products
        count = productResult.count

        return {
            categories,
            products,
            count,
            currentPage,
            totalPages: Math.ceil(count / PRODUCTS_PER_PAGE),
        }
    }

    const categories = await categoriesPromise
    try {
        const categoryId = categories.find((category) => category.handle === sp.category)?.id
        const productResult = await getProducts({
            category_id: [categoryId].filter(Boolean) as string[],
            order: sp.sort || undefined,
            q: sp.q || undefined,
            limit: PRODUCTS_PER_PAGE,
            offset,
        })
        products = productResult.products
        count = productResult.count
    } catch {
        products = []
        count = 0
    }

    return {
        categories,
        products,
        count,
        currentPage,
        totalPages: Math.ceil(count / PRODUCTS_PER_PAGE),
    }
}
