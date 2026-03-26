/**
 * Products Manager — Owner Panel
 *
 * Server component fetches products + categories + plan limits,
 * delegates to ProductsClient for interactive CRUD.
 */

import { getConfigForTenant } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAdminProductsFull, getAdminCategories } from '@/lib/medusa/admin'
import { checkLimit } from '@/lib/limits'
import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
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
    const { tenantId } = await withPanelGuard()
    const scope = await getTenantMedusaScope(tenantId)
    const { config, planLimits } = await getConfigForTenant(tenantId)

    // Fetch products and categories in parallel (all scoped to auth tenant)
    const [productsData, categoriesData] = await Promise.all([
        getAdminProductsFull({ limit: 50 }, scope),
        getAdminCategories({ limit: 50 }, scope),
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
        addProductHint: t('panel.products.emptyHint'),
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
        selectAll: t('panel.products.selectAll'),
        deselectAll: t('panel.products.deselectAll'),
        bulkPublish: t('panel.products.bulkPublish'),
        bulkDraft: t('panel.products.bulkDraft'),
        bulkDelete: t('panel.products.bulkDelete'),
        exportCsv: t('panel.products.exportCsv'),
        selected: t('panel.products.selected'),
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
                stockMode={config.stock_mode || 'simple'}
                maxImagesPerProduct={planLimits.max_images_per_product ?? 10}
            />
        </div>
    )
}
