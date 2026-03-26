import { Suspense } from 'react'
import { getProducts, getCategories } from '@/lib/medusa/client'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfig } from '@/lib/config'
import ProductGrid from '@/components/products/ProductGrid'
import { ProductGridSkeleton } from '@/components/ui/Skeleton'

export const dynamic = 'force-dynamic'

const PRODUCTS_PER_PAGE = 12

export default async function ProductosPage({
    params,
    searchParams,
}: {
    params: Promise<{ lang: string }>
    searchParams: Promise<{ category?: string; sort?: string; q?: string; page?: string }>
}) {
    const { lang } = await params
    const sp = await searchParams
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const { featureFlags } = await getConfig()

    const currentPage = Math.max(1, parseInt(sp.page || '1', 10) || 1)
    const offset = (currentPage - 1) * PRODUCTS_PER_PAGE

    const categories = await getCategories()

    // Graceful fallback: Medusa might not be running
    let products: Awaited<ReturnType<typeof getProducts>>['products'] = []
    let count = 0
    try {
        const res = await getProducts({
            category_id: sp.category
                ? [categories.find((c) => c.handle === sp.category)?.id].filter(Boolean) as string[]
                : undefined,
            order: sp.sort || undefined,
            q: sp.q || undefined,
            limit: PRODUCTS_PER_PAGE,
            offset,
        })
        products = res.products
        count = res.count
    } catch {
        // Medusa down — show empty state
    }

    const totalPages = Math.ceil(count / PRODUCTS_PER_PAGE)

    return (
        <div className="container-page py-8">
            <h1 className="text-3xl md:text-4xl font-bold font-display text-text-primary mb-8">
                {t('product.allProducts')}
            </h1>

            <Suspense fallback={<ProductGridSkeleton />}>
                <ProductGrid
                    products={products}
                    categories={categories}
                    totalCount={count}
                    badgesEnabled={featureFlags.enable_product_badges}
                    compareEnabled={featureFlags.enable_product_comparisons}
                    currentPage={currentPage}
                    totalPages={totalPages}
                />
            </Suspense>
        </div>
    )
}

