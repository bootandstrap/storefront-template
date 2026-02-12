/**
 * Products Manager — Owner Panel
 *
 * Server component fetches products + categories + plan limits,
 * delegates to ProductsClient for interactive CRUD.
 */

import { getConfig } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAdminProductsFull, getAdminCategories } from '@/lib/medusa/admin'
import { checkLimit } from '@/lib/limits'
import ProductsClient from './ProductsClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.products.title') }
}

export default async function ProductsManagerPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { config, planLimits } = await getConfig()

    // Fetch products and categories in parallel
    const [productsData, categoriesData] = await Promise.all([
        getAdminProductsFull({ limit: 50 }),
        getAdminCategories({ limit: 50 }),
    ])

    const limitCheck = checkLimit(planLimits, 'max_products', productsData.count)

    // Pre-resolve translations
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const labels = {
        title: t('panel.products.title'),
        subtitle: t('panel.products.subtitle'),
        addProduct: t('panel.products.add'),
        editProduct: t('panel.products.edit'),
        noProducts: t('panel.products.empty'),
        name: t('panel.products.name'),
        description: t('panel.products.description'),
        price: t('panel.products.price'),
        category: t('panel.products.category'),
        noCategory: t('panel.products.noCategory'),
        status: t('panel.products.status'),
        published: t('panel.products.published'),
        draft: t('panel.products.draft'),
        all: t('panel.products.all'),
        searchPlaceholder: t('panel.products.searchPlaceholder'),
        products: t('panel.products.productsLabel'),
        confirmDelete: t('panel.products.confirmDelete'),
        save: t('common.save'),
        cancel: t('common.cancel'),
        create: t('common.create'),
        delete: t('common.delete'),
        edit: t('common.edit'),
        maxReached: t('limits.maxReached'),
    }

    return (
        <div className="space-y-6">
            <ProductsClient
                products={productsData.products}
                categories={categoriesData.product_categories.map(c => ({
                    id: c.id,
                    name: c.name,
                }))}
                productCount={productsData.count}
                maxProducts={planLimits.max_products}
                canAdd={limitCheck.allowed}
                defaultCurrency={config.default_currency || 'usd'}
                labels={labels}
            />
        </div>
    )
}
