import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetDictionary = vi.fn()
const mockCreateTranslator = vi.fn()
const mockWithPanelGuard = vi.fn()
const mockGetTenantMedusaScope = vi.fn()
const mockGetProductCount = vi.fn()
const mockGetCategoryCount = vi.fn()

vi.mock('@/lib/i18n', () => ({
    getDictionary: mockGetDictionary,
    createTranslator: mockCreateTranslator,
}))

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: mockGetTenantMedusaScope,
}))

vi.mock('@/lib/medusa/admin', () => ({
    getProductCount: mockGetProductCount,
    getCategoryCount: mockGetCategoryCount,
}))

vi.mock('@/components/panel/ModuleShell', () => ({
    default: function ModuleShell(props: Record<string, unknown>) {
        return { type: 'ModuleShell', props }
    },
}))

vi.mock('../SEOClient', () => ({
    default: function SEOClient(props: Record<string, unknown>) {
        return { type: 'SEOClient', props }
    },
}))

describe('SEOPage /[lang]/panel/seo', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockGetDictionary.mockResolvedValue({})
        mockCreateTranslator.mockReturnValue((key: string) => key)
        mockGetTenantMedusaScope.mockResolvedValue({ tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' })
        mockGetProductCount.mockResolvedValue(3)
        mockGetCategoryCount.mockResolvedValue(2)
    })

    it('renders locked SEO shell without product/category audits', async () => {
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant_123',
            appConfig: {
                featureFlags: { enable_seo: false },
                config: {},
            },
        })
        const { default: SEOPage } = await import('../page')

        const element = await SEOPage({ params: Promise.resolve({ lang: 'es' }) })
        const client = element.props.children

        expect(element.props).toMatchObject({
            isLocked: true,
            gateFlag: 'enable_seo',
            lang: 'es',
        })
        expect(mockGetProductCount).not.toHaveBeenCalled()
        expect(mockGetCategoryCount).not.toHaveBeenCalled()
        expect(client.props.seoData).toMatchObject({
            productCount: 0,
            categoryCount: 0,
            pagesIndexed: 3,
        })
    })

    it('builds SEO audit score from tenant config and scoped catalog counts', async () => {
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant_123',
            appConfig: {
                featureFlags: { enable_seo: true, enable_seo_tools: true },
                config: {
                    meta_title: 'Store title',
                    meta_description: 'Store description',
                    favicon_url: 'https://cdn.example.com/favicon.ico',
                    logo_url: 'https://cdn.example.com/logo.png',
                    store_email: 'hello@example.com',
                    social_instagram: 'bootandstrap',
                },
            },
        })
        const { default: SEOPage } = await import('../page')

        const element = await SEOPage({ params: Promise.resolve({ lang: 'es' }) })
        const client = element.props.children

        expect(mockGetTenantMedusaScope).toHaveBeenCalledWith('tenant_123')
        expect(mockGetProductCount).toHaveBeenCalledWith({ tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' })
        expect(mockGetCategoryCount).toHaveBeenCalledWith({ tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' })
        expect(element.props.isLocked).toBe(false)
        expect(client.props.seoData).toMatchObject({
            score: 100,
            productCount: 3,
            categoryCount: 2,
            pagesIndexed: 8,
            metaIssues: 0,
            hasMetaTitle: true,
            hasMetaDescription: true,
            hasFavicon: true,
            hasLogo: true,
        })
    })
})
