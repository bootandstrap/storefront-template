import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Productos', description: 'Explora nuestro catálogo completo de productos' }

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfig } from '@/lib/config'
import ProductGrid from '@/components/products/ProductGrid'
import { resolveProductListingData } from '@/lib/products/product-listing'

export const dynamic = 'force-dynamic'

export default async function ProductosPage({
    params,
    searchParams,
}: {
    params: Promise<{ lang: string }>
    searchParams: Promise<{ category?: string; sort?: string; q?: string; page?: string }>
}) {
    const { lang } = await params
    const sp = await searchParams
    const [dictionary, { featureFlags }, listing] = await Promise.all([
        getDictionary(lang as Locale),
        getConfig(),
        resolveProductListingData(sp),
    ])
    const t = createTranslator(dictionary)

    const {
        categories,
        products,
        count,
        currentPage,
        totalPages,
    } = listing

    return (
        <div className="container-page py-8">
            <h1 className="text-3xl md:text-4xl font-bold font-display text-tx mb-8">
                {t('product.allProducts')}
            </h1>

            <ProductGrid
                products={products}
                categories={categories}
                totalCount={count}
                badgesEnabled={featureFlags.enable_product_badges}
                compareEnabled={featureFlags.enable_product_comparisons}
                currentPage={currentPage}
                totalPages={totalPages}
            />
        </div>
    )
}
