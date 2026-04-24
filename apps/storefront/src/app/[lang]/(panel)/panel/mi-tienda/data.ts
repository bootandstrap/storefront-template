/**
 * Mi Tienda — Server-side data fetchers
 *
 * Each function extracts the data-fetching logic from the original standalone
 * page.tsx into a reusable helper. Called by mi-tienda/page.tsx based on
 * which tab is active (RSC Slot pattern).
 */

import { getConfigForTenant } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAdminProductsFull, getAdminCategories, getAdminProducts } from '@/lib/medusa/admin'
import { getInventoryItems, getLowStockItems, getStockLocations } from '@/lib/medusa/admin-inventory'
import { getProductsWithBadges } from '../insignias/actions'
import { checkLimit, type LimitCheckResult } from '@/lib/limits'
import { parsePanelListQuery } from '@/lib/panel-list-query'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { createClient } from '@/lib/supabase/server'

// ── Products Data ─────────────────────────────────────────────────────────

export async function fetchProductsData(
    tenantId: string,
    lang: string,
    rawSearchParams: Record<string, string | string[] | undefined>,
) {
    const scope = await getTenantMedusaScope(tenantId)
    const { config, planLimits } = await getConfigForTenant(tenantId)
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const query = parsePanelListQuery(rawSearchParams, {
        defaultLimit: 12,
        allowedStatuses: ['all', 'published', 'draft'],
        allowedTabs: ['productos', 'categorias'],
    })

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

    // Build badge map
    const badgeMap: Record<string, string[]> = {}
    for (const p of badgeProductsData.products) {
        badgeMap[p.id] = Array.isArray(p.metadata?.badges) ? (p.metadata.badges as string[]) : []
    }

    const labels = {
        catalogTitle: t('panel.catalog.title'),
        catalogSubtitle: t('panel.catalog.subtitle'),
        tabProducts: t('panel.catalog.tabProducts'),
        tabCategories: t('panel.catalog.tabCategories'),
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
        addCategory: t('panel.categories.add'),
        editCategory: t('panel.categories.edit'),
        noCategories: t('panel.categories.empty'),
        categoryName: t('panel.categories.name'),
        categoryDescription: t('panel.categories.description'),
        confirmDeleteCategory: t('panel.categories.confirmDelete'),
        categories: t('panel.categories.categoriesLabel'),
        badgesLabel: t('panel.badges.title'),
        badgesAvailable: t('panel.badges.available'),
        save: t('common.save'),
        cancel: t('common.cancel'),
        create: t('common.create'),
        delete: t('common.delete'),
        edit: t('common.edit'),
        previous: t('pagination.previous'),
        next: t('pagination.next'),
        maxReached: t('limits.maxReached'),
        images: t('panel.products.images'),
        dropzone: t('panel.products.dropzone'),
        dropzoneHint: t('panel.products.dropzoneHint'),
        uploading: t('panel.products.uploading'),
        imageAdded: t('panel.products.imageAdded'),
        saveFirst: t('panel.products.saveFirst'),
    }

    return {
        products: productsData.products,
        categories: categoriesData.product_categories.map(c => ({
            id: c.id,
            name: c.name,
            handle: c.handle,
            description: c.description,
        })),
        badgeMap,
        productCount: productsData.count,
        maxProducts: planLimits.max_products,
        canAddProduct: productLimitCheck.allowed,
        productLimitResult: productLimitCheck,
        categoryCount: categoriesData.count,
        maxCategories: planLimits.max_categories,
        canAddCategory: categoryLimitCheck.allowed,
        categoryLimitResult: categoryLimitCheck,
        currentPage: query.page,
        pageSize: query.limit,
        initialSearch: query.q ?? '',
        initialStatus: (query.status as 'all' | 'published' | 'draft' | undefined) ?? 'all',
        defaultCurrency: config.default_currency,
        activeCurrencies: config.active_currencies ?? [config.default_currency],
        labels,
    }
}

// ── Inventory Data ────────────────────────────────────────────────────────

export async function fetchInventoryData(tenantId: string, lang: string) {
    const scope = await getTenantMedusaScope(tenantId)
    const dict = await getDictionary(lang as Locale)

    const [inventoryData, lowStockData, locations] = await Promise.all([
        getInventoryItems({ limit: 50 }, scope),
        getLowStockItems(5, scope),
        getStockLocations(scope),
    ])

    const labels = {
        title: dict['panel.inventory.title'],
        subtitle: dict['panel.inventory.subtitle'],
        searchPlaceholder: dict['panel.inventory.searchPlaceholder'],
        sku: dict['panel.inventory.sku'],
        product: dict['panel.inventory.product'],
        stocked: dict['panel.inventory.stocked'],
        reserved: dict['panel.inventory.reserved'],
        available: dict['panel.inventory.available'],
        lowStock: dict['panel.inventory.lowStock'],
        outOfStock: dict['panel.inventory.outOfStock'],
        updateStock: dict['panel.inventory.updateStock'],
        noItems: dict['panel.inventory.noItems'],
        save: dict['common.save'],
        cancel: dict['common.cancel'],
        alerts: dict['panel.inventory.alerts'],
        noAlerts: dict['panel.inventory.noAlerts'],
        hide: dict['panel.inventory.hide'],
        itemsLeft: dict['panel.inventory.itemsLeft'],
        untitled: dict['panel.inventory.untitled'],
    }

    return {
        items: inventoryData.inventory_items,
        lowStockItems: lowStockData,
        locations,
        labels,
    }
}

// ── Badges Data ───────────────────────────────────────────────────────────

export async function fetchBadgesData() {
    return getProductsWithBadges()
}

// ── Carousel Data ─────────────────────────────────────────────────────────

export async function fetchCarouselData(tenantId: string) {
    const supabase = await createClient()
    const { config, planLimits } = await getConfigForTenant(tenantId)

    const { data: slides } = await supabase
        .from('carousel_slides')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('position', { ascending: true })

    const slideList = slides ?? []
    const limitCheck = checkLimit(planLimits, 'max_carousel_slides', slideList.length)

    return {
        slides: slideList,
        canAdd: limitCheck.allowed,
        slideLimitResult: limitCheck,
        slideCount: slideList.length,
        maxSlides: planLimits.max_carousel_slides,
    }
}

// ── Pages Data ────────────────────────────────────────────────────────────

export async function fetchPagesData(tenantId: string) {
    const supabase = await createClient()
    const { planLimits } = await getConfigForTenant(tenantId)

    const { data: pages } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

    const pageList = pages ?? []
    const limitCheck = checkLimit(planLimits, 'max_cms_pages', pageList.length)

    return {
        pages: pageList,
        canAdd: limitCheck.allowed,
        pageLimitResult: limitCheck,
        pageCount: pageList.length,
        maxPages: planLimits.max_cms_pages,
    }
}
