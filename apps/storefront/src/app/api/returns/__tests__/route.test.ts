import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRateLimiterIsLimited = vi.fn()
const mockGetClientIp = vi.fn()
const mockCreateClient = vi.fn()
const mockGetConfig = vi.fn()
const mockIsFeatureEnabled = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@/lib/security/rate-limit-factory', () => ({
    createSmartRateLimiter: vi.fn(() => ({
        isLimited: mockRateLimiterIsLimited,
    })),
}))

vi.mock('@/lib/security/get-client-ip', () => ({
    getClientIp: mockGetClientIp,
}))

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
    return new NextRequest(new Request('https://tenant.example.com/api/returns', {
        method: 'POST',
        body: JSON.stringify(body),
    }))
}

function makeReturnsClient(options: { user?: { id: string }; profile?: Record<string, unknown> } = {}) {
    const profileSingle = vi.fn(async () => ({ data: options.profile ?? { tenant_id: 'tenant_123', medusa_customer_id: 'cus_1' } }))
    const insertSingle = vi.fn(async () => ({
        data: { id: 'return_1', tenant_id: 'tenant_123', order_id: 'order_1' },
        error: null,
    }))
    const select = vi.fn((columns?: string) => {
        if (columns === 'medusa_customer_id, tenant_id') {
            return { eq: vi.fn(() => ({ single: profileSingle })) }
        }
        return { single: insertSingle }
    })
    const insert = vi.fn(() => ({ select }))

    return {
        auth: {
            getUser: vi.fn(async () => ({ data: { user: options.user ?? null } })),
        },
        from: vi.fn(() => ({ select, insert })),
        insert,
    }
}

describe('POST /api/returns', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockRateLimiterIsLimited.mockResolvedValue(false)
        mockGetClientIp.mockReturnValue('127.0.0.1')
        mockGetConfig.mockResolvedValue({
            featureFlags: { enable_self_service_returns: true },
        })
        mockIsFeatureEnabled.mockReturnValue(true)
    })

    it('requires authenticated customer context', async () => {
        mockCreateClient.mockResolvedValue(makeReturnsClient())
        const { POST } = await import('../route')

        const response = await POST(makeRequest({ order_id: 'order_1', items: [{ item_id: 'item_1', quantity: 1 }] }))
        const json = await response.json()

        expect(response.status).toBe(401)
        expect(json.error).toBe('Not authenticated')
    })

    it('stores return requests scoped to the customer tenant profile', async () => {
        const client = makeReturnsClient({ user: { id: 'user_1' } })
        mockCreateClient.mockResolvedValue(client)
        const { POST } = await import('../route')

        const response = await POST(makeRequest({
            order_id: 'order_1',
            items: [{ item_id: 'item_1', quantity: 1 }],
            reason: 'wrong_size',
            note: 'Needs exchange',
        }))
        const json = await response.json()

        expect(response.status).toBe(201)
        expect(client.insert).toHaveBeenCalledWith(expect.objectContaining({
            tenant_id: 'tenant_123',
            order_id: 'order_1',
            customer_id: 'cus_1',
            status: 'pending',
        }))
        expect(json.return).toMatchObject({ id: 'return_1', tenant_id: 'tenant_123' })
    })
})
