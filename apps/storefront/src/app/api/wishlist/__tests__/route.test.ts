import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockCreateClient = vi.fn()
const mockGetConfig = vi.fn()
const mockIsFeatureEnabled = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
    createClient: mockCreateClient,
}))

vi.mock('@/lib/config', () => ({
    getConfig: mockGetConfig,
}))

vi.mock('@/lib/features', () => ({
    isFeatureEnabled: mockIsFeatureEnabled,
}))

vi.mock('@/lib/logger', () => ({
    logger: { error: mockLoggerError },
}))

function makeRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest(new Request('https://tenant.example.com/api/wishlist', {
        method: 'POST',
        body: JSON.stringify(body),
    }))
}

function makeWishlistClient(options: { user?: { id: string }; count?: number; upsertError?: unknown } = {}) {
    const countQuery = {
        eq: vi.fn(async () => ({ count: options.count ?? 0 })),
    }
    const select = vi.fn((_columns?: string, config?: { count?: string; head?: boolean }) => {
        if (config?.head) return countQuery
        return {
            eq: vi.fn(() => ({
                order: vi.fn(async () => ({
                    data: [{ product_id: 'prod_1' }],
                    error: null,
                })),
            })),
        }
    })
    const upsert = vi.fn(async () => ({ error: options.upsertError ?? null }))

    return {
        auth: {
            getUser: vi.fn(async () => ({ data: { user: options.user ?? null } })),
        },
        from: vi.fn(() => ({ select, upsert })),
        select,
        upsert,
    }
}

describe('GET/POST /api/wishlist', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockGetConfig.mockResolvedValue({
            featureFlags: { enable_wishlist: true },
            planLimits: { max_wishlist_items: 2 },
        })
        mockIsFeatureEnabled.mockReturnValue(true)
    })

    it('returns an empty list without touching auth when wishlist is disabled', async () => {
        mockIsFeatureEnabled.mockReturnValueOnce(false)
        const { GET } = await import('../route')

        const response = await GET()
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.items).toEqual([])
        expect(mockCreateClient).not.toHaveBeenCalled()
    })

    it('requires customer authentication before adding wishlist items', async () => {
        mockCreateClient.mockResolvedValue(makeWishlistClient())
        const { POST } = await import('../route')

        const response = await POST(makeRequest({ productId: 'prod_1' }))
        const json = await response.json()

        expect(response.status).toBe(401)
        expect(json.error).toBe('Authentication required')
    })

    it('enforces the tenant plan wishlist limit before upsert', async () => {
        const client = makeWishlistClient({ user: { id: 'user_1' }, count: 2 })
        mockCreateClient.mockResolvedValue(client)
        const { POST } = await import('../route')

        const response = await POST(makeRequest({ productId: 'prod_1' }))
        const json = await response.json()

        expect(response.status).toBe(403)
        expect(json.error).toBe('Wishlist limit reached')
        expect(client.upsert).not.toHaveBeenCalled()
    })
})
