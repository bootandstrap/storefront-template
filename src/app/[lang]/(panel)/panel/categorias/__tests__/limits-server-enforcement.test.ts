import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequirePanelAuth = vi.fn()
const mockGetConfig = vi.fn()
const mockGetCategoryCount = vi.fn()
const mockCreateAdminCategory = vi.fn()

vi.mock('@/lib/panel-auth', () => ({
    requirePanelAuth: mockRequirePanelAuth,
}))

vi.mock('@/lib/revalidate', () => ({
    revalidatePanel: vi.fn(),
}))

vi.mock('@/lib/config', () => ({
    getConfig: mockGetConfig,
    getConfigForTenant: mockGetConfig,
    getRequiredTenantId: vi.fn().mockReturnValue('tenant-1'),
}))

vi.mock('@/lib/medusa/admin', () => ({
    getCategoryCount: mockGetCategoryCount,
    createAdminCategory: mockCreateAdminCategory,
    updateAdminCategory: vi.fn(),
    deleteAdminCategory: vi.fn(),
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: vi.fn().mockResolvedValue({
        medusaSalesChannelId: 'sc_test',
        medusaPublishableKey: 'pk_test',
    }),
}))

const basePlanLimits = {
    max_products: 10,
    max_customers: 100,
    max_orders_month: 100,
    max_categories: 1,
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

describe('createCategory server-side limits', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockRequirePanelAuth.mockResolvedValue({
            user: { id: 'u1' },
            role: 'owner',
            tenantId: 'tenant-1',
        })
        mockGetConfig.mockResolvedValue({ planLimits: basePlanLimits })
        mockCreateAdminCategory.mockResolvedValue({ category: { id: 'c1' }, error: null })
    })

    it('blocks creation when max_categories limit is reached', async () => {
        mockGetCategoryCount.mockResolvedValue(1)
        const { createCategory } = await import('../actions')

        const result = await createCategory({ name: 'Frutas' })

        expect(result.success).toBe(false)
        expect(result.error).toContain('Límite de categorías alcanzado')
        expect(mockCreateAdminCategory).not.toHaveBeenCalled()
    })

    it('creates category when below the plan limit', async () => {
        mockGetCategoryCount.mockResolvedValue(0)
        const { createCategory } = await import('../actions')

        const result = await createCategory({ name: 'Verduras' })

        expect(result.success).toBe(true)
        expect(mockCreateAdminCategory).toHaveBeenCalledTimes(1)
    })
})

