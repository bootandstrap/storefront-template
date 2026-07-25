import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetConfig = vi.fn()
const mockIsFeatureEnabled = vi.fn()
const mockCheckLimit = vi.fn()
const mockBuildLimitError = vi.fn()
const mockCreateClient = vi.fn()
const mockAdminFetch = vi.fn()
const mockGetTenantMedusaScope = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@/lib/config', () => ({
    getConfig: mockGetConfig,
}))

vi.mock('@/lib/features', () => ({
    isFeatureEnabled: mockIsFeatureEnabled,
}))

vi.mock('@/lib/limits', () => ({
    checkLimit: mockCheckLimit,
}))

vi.mock('@/lib/limit-errors', () => ({
    buildLimitError: mockBuildLimitError,
}))

vi.mock('@/lib/supabase/server', () => ({
    createClient: mockCreateClient,
}))

vi.mock('@/lib/medusa/admin-core', () => ({
    adminFetch: mockAdminFetch,
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: mockGetTenantMedusaScope,
}))

vi.mock('@/lib/logger', () => ({
    logger: { error: mockLoggerError },
}))

function makeRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest(new Request('https://tenant.example.com/api/reviews', {
        method: 'POST',
        body: JSON.stringify(body),
    }))
}

describe('POST /api/reviews', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        process.env.TENANT_ID = 'tenant_123'
        mockGetConfig.mockResolvedValue({
            featureFlags: { enable_reviews: true },
            planLimits: { max_reviews_per_product: 10 },
        })
        mockIsFeatureEnabled.mockReturnValue(true)
        mockCreateClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({
                    data: { user: { id: 'user_1', email: 'buyer@example.com' } },
                })),
            },
        })
        mockGetTenantMedusaScope.mockResolvedValue({ tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' })
        mockCheckLimit.mockReturnValue({ allowed: true })
        mockBuildLimitError.mockReturnValue('limit reached')
        mockAdminFetch
            .mockResolvedValueOnce({ data: { reviews: [], stats: { total: 0 } }, error: null })
            .mockResolvedValueOnce({ data: { review: { id: 'review_1' } }, error: null })
    })

    it('fails closed when tenant id is not configured', async () => {
        delete process.env.TENANT_ID
        const { POST } = await import('../route')

        const response = await POST(makeRequest({ productId: 'prod_1', rating: 5 }))
        const json = await response.json()

        expect(response.status).toBe(500)
        expect(json.error).toBe('Tenant not configured')
        expect(mockAdminFetch).not.toHaveBeenCalled()
    })

    it('requires authenticated customer context', async () => {
        mockCreateClient.mockResolvedValueOnce({
            auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
        })
        const { POST } = await import('../route')

        const response = await POST(makeRequest({ productId: 'prod_1', rating: 5 }))
        const json = await response.json()

        expect(response.status).toBe(401)
        expect(json.error).toBe('Authentication required')
        expect(mockAdminFetch).not.toHaveBeenCalled()
    })

    it('submits sanitized pending reviews through the tenant Medusa scope', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest({
            productId: 'prod_1',
            rating: 4.7,
            comment: '  useful product  ',
            authorName: '  Buyer Name  ',
        }))
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(mockAdminFetch).toHaveBeenNthCalledWith(
            1,
            '/admin/reviews?product_id=prod_1',
            {},
            { tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' }
        )
        expect(mockAdminFetch).toHaveBeenNthCalledWith(
            2,
            '/admin/reviews',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    product_id: 'prod_1',
                    rating: 5,
                    comment: 'useful product',
                    author_name: 'Buyer Name',
                    user_id: 'user_1',
                    status: 'pending',
                }),
            }),
            { tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' }
        )
        expect(json).toEqual({ success: true, status: 'pending' })
    })
})
