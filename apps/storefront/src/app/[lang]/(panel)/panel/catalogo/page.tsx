/**
 * Catálogo — Unified Products + Categories + Badges
 *
 * Server component that fetches all catalog data and renders
 * a tabbed CatalogClient with products (+ inline badges) and categories.
 */

import { getConfigForTenant } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAdminProductsFull, getAdminCategories, getAdminProducts } from '@/lib/medusa/admin'
import { checkLimit } from '@/lib/limits'
import { parsePanelListQuery } from '@/lib/panel-list-query'
import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import CatalogClient from './CatalogClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.catalog.title') }
}

export default async function CatalogPage({
    params,
    searchParams,
}: {
    params: Promise<{ lang: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const { lang } = await params
    const rawSearchParams = await searchParams
    const { tenantId } = await withPanelGuard()
    const scope = await getTenantMedusaScope(tenantId)
    const { config, planLimits } = await getConfigForTenant(tenantId)
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const query = parsePanelListQuery(rawSearchParams, {
        defaultLimit: 12,
        allowedStatuses: ['all', 'published', 'draft'],
        allowedTabs: ['productos', 'categorias'],
    })

    // Fetch products (full), categories, and products with badge data in parallel
    const [productsData, categoriesData, badgeProductsData] = await Promise.all([
        getAdminProductsFull({
            limit: query.limit,
            offset: query.offset,
            q: query.q,
            status: query.status,
        }, scope),
        getAdminCategories({ limit: 50 }, scope),
        getAdminProducts({ limit: 100 }, scope),
    ])

    const productLimitCheck = checkLimit(planLimits, 'max_products', productsData.count)
    const categoryLimitCheck = checkLimit(planLimits, 'max_categories', categoriesData.count)

    // Build badge map: productId → badges[]
    const badgeMap: Record<string, string[]> = {}
    for (const p of badgeProductsData.products) {
        badgeMap[p.id] = Array.isArray(p.metadata?.badges) ? (p.metadata.badges as string[]) : []
    }

    const labels = {
        // Catalog-level
        catalogTitle: t('panel.catalog.title'),
        catalogSubtitle: t('panel.catalog.subtitle'),
        tabProducts: t('panel.catalog.tabProducts'),
        tabCategories: t('panel.catalog.tabCategories'),
        // Product labels
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
        // Category labels
        addCategory: t('panel.categories.add'),
        editCategory: t('panel.categories.edit'),
        noCategories: t('panel.categories.empty'),
        categoryName: t('panel.categories.name'),
        categoryDescription: t('panel.categories.description'),
        confirmDeleteCategory: t('panel.categories.confirmDelete'),
        categories: t('panel.categories.categoriesLabel'),
        // Badge labels
        badgesLabel: t('panel.badges.title'),
        badgesAvailable: t('panel.badges.available'),
        // Common
        save: t('common.save'),
        cancel: t('common.cancel'),
        create: t('common.create'),
        delete: t('common.delete'),
        edit: t('common.edit'),
        previous: t('pagination.previous'),
        next: t('pagination.next'),
        maxReached: t('limits.maxReached'),
        // Image labels
        images: t('panel.products.images'),
        dropzone: t('panel.products.dropzone'),
        dropzoneHint: t('panel.products.dropzoneHint'),
        uploading: t('panel.products.uploading'),
        imageAdded: t('panel.products.imageAdded'),
        saveFirst: t('panel.products.saveFirst'),
    }

    return (
        <div className="space-y-6">
            <CatalogClient
                products={productsData.products}
                categories={categoriesData.product_categories.map(c => ({
                    id: c.id,
                    name: c.name,
                    handle: c.handle,
                    description: c.description,
                }))}
                badgeMap={badgeMap}
                productCount={productsData.count}
                maxProducts={planLimits.max_products}
                canAddProduct={productLimitCheck.allowed}
                categoryCount={categoriesData.count}
                maxCategories={planLimits.max_categories}
                canAddCategory={categoryLimitCheck.allowed}
                currentPage={query.page}
                pageSize={query.limit}
                initialSearch={query.q ?? ''}
                initialStatus={(query.status as 'all' | 'published' | 'draft' | undefined) ?? 'all'}
                initialTab={(query.tab as 'productos' | 'categorias' | undefined) ?? 'productos'}
                defaultCurrency={config.default_currency || 'usd'}
                labels={labels}
            />
        </div>
    )
}
