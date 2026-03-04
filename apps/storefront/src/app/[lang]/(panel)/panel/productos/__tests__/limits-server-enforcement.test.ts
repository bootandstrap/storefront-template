import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockWithPanelGuard = vi.fn()
const mockGetConfig = vi.fn()
const mockGetProductCount = vi.fn()
const mockCreateAdminProduct = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/revalidate', () => ({
    revalidatePanel: vi.fn(),
}))



vi.mock('@/lib/medusa/admin', () => ({
    getProductCount: mockGetProductCount,
    createAdminProduct: mockCreateAdminProduct,
    updateAdminProduct: vi.fn(),
    deleteAdminProduct: vi.fn(),
    updateVariantPrices: vi.fn(),
    uploadFiles: vi.fn(),
    updateProductImages: vi.fn(),
    deleteProductImage: vi.fn(),
    getAdminProduct: vi.fn(),
    updateVariantInventory: vi.fn(),
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: vi.fn().mockResolvedValue({
        medusaSalesChannelId: 'sc_test',
        medusaPublishableKey: 'pk_test',
    }),
}))

vi.mock('@/lib/config', () => ({
    getConfig: mockGetConfig,
    getConfigForTenant: mockGetConfig,
    getRequiredTenantId: vi.fn().mockReturnValue('tenant-1'),
}))

const basePlanLimits = {
    max_products: 1,
    max_customers: 100,
    max_orders_month: 100,
    max_categories: 20,
    max_images_per_product: 10,
    max_cms_pages: 10,
    max_carousel_slides: 10,
    max_admin_users: 3,
    storage_limit_mb: 500,
    plan_name: 'starter',
    plan_expires_at: null,
    max_languages: 1,
    max_currencies: 1,
    max_whatsapp_templates: 5,
    max_file_upload_mb: 5,
    max_email_sends_month: 1000,
    max_custom_domains: 1,
}

describe('createProduct server-side limits', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant-1',
            appConfig: {
                planLimits: basePlanLimits,
                config: { stock_mode: 'always_in_stock', low_stock_threshold: 5 },
                featureFlags: { enable_ecommerce: true },
            },
        })
        mockGetConfig.mockResolvedValue({
            planLimits: basePlanLimits,
            config: { stock_mode: 'always_in_stock', low_stock_threshold: 5 },
        })
        mockCreateAdminProduct.mockResolvedValue({ product: { id: 'p1' }, error: null })
    })

    it('blocks creation when max_products limit is reached', async () => {
        mockGetProductCount.mockResolvedValue(1)
        const { createProduct } = await import('../actions')

        const result = await createProduct({
            title: 'Producto 1',
            price: 10,
            currency: 'usd',
            status: 'published',
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('Límite de productos alcanzado')
        expect(mockCreateAdminProduct).not.toHaveBeenCalled()
    })

    it('creates product when below the plan limit', async () => {
        mockGetProductCount.mockResolvedValue(0)
        const { createProduct } = await import('../actions')

        const result = await createProduct({
            title: 'Producto 2',
            price: 10,
            currency: 'usd',
            status: 'published',
        })

        expect(result.success).toBe(true)
        expect(mockCreateAdminProduct).toHaveBeenCalledTimes(1)
    })
})

