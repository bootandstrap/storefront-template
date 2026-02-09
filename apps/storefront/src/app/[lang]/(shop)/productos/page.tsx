import { Suspense } from 'react'
import { getProducts, getCategories } from '@/lib/medusa/client'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import ProductGrid from '@/components/products/ProductGrid'
import { ProductGridSkeleton } from '@/components/ui/Skeleton'

export const dynamic = 'force-dynamic'

export default async function ProductosPage({
    params,
    searchParams,
}: {
    params: Promise<{ lang: string }>
    searchParams: Promise<{ category?: string; sort?: string; q?: string }>
}) {
    const { lang } = await params
    const sp = await searchParams
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const categories = await getCategories()
    const { products, count } = await getProducts({
        category_id: sp.category
            ? [categories.find((c) => c.handle === sp.category)?.id].filter(Boolean) as string[]
            : undefined,
        order: sp.sort || undefined,
        q: sp.q || undefined,
        limit: 50,
    })

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
                />
            </Suspense>
        </div>
    )
}
