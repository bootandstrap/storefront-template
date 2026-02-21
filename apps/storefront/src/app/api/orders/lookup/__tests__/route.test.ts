/**
 * Tests for POST /api/orders/lookup — secure guest order lookup
 *
 * Validates:
 * - 400 on missing/invalid params
 * - 400 on non-numeric display_id
 * - 404 when no order matches
 * - 404 when email doesn't match (prevents enumeration)
 * - 200 with minimal fields on valid match
 * - 429 rate limiting after threshold
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock getConfig (feature flag gate)
// ---------------------------------------------------------------------------

const mockGetConfig = vi.fn()
vi.mock('@/lib/config', () => ({
    getConfig: (...args: unknown[]) => mockGetConfig(...args),
}))

// ---------------------------------------------------------------------------
// Mock rate limiter (rate-limit-factory, not rate-limit)
// ---------------------------------------------------------------------------

const mockIsLimited = vi.fn().mockResolvedValue(false)
vi.mock('@/lib/security/rate-limit-factory', () => ({
    createSmartRateLimiter: vi.fn(() => ({
        isLimited: mockIsLimited,
    })),
}))

// Mock getClientIp
vi.mock('@/lib/security/get-client-ip', () => ({
    getClientIp: vi.fn(() => '127.0.0.1'),
}))

// We mock global fetch for the medusa server call
const originalFetch = globalThis.fetch

const defaultConfig = {
    featureFlags: { enable_order_tracking: true },
    planLimits: {},
    config: {},
}

beforeEach(() => {
    vi.clearAllMocks()
    mockGetConfig.mockResolvedValue(defaultConfig)
    mockIsLimited.mockResolvedValue(false)
    // Mock MEDUSA_BACKEND_URL
    process.env.MEDUSA_BACKEND_URL = 'http://localhost:9000'
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = 'pk_test'
})

// Helper: Create a minimal Request object (simulating Next.js)
function makeRequest(body: unknown, ip?: string): Request {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (ip) {
        headers['x-forwarded-for'] = ip
    }
    return new Request('http://localhost:3000/api/orders/lookup', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    })
}

describe('POST /api/orders/lookup', () => {
    it('returns 400 when email is missing', async () => {
        const { POST } = await import('../route')
        const req = makeRequest({ display_id: '123' })
        const res = await POST(req)
        expect(res.status).toBe(400)
        const json = await res.json()
        expect(json.error).toContain('email')
    })

    it('returns 400 when display_id is missing', async () => {
        const { POST } = await import('../route')
        const req = makeRequest({ email: 'test@example.com' })
        const res = await POST(req)
        expect(res.status).toBe(400)
        const json = await res.json()
        expect(json.error).toContain('display_id')
    })

    it('returns 400 when both params are missing', async () => {
        const { POST } = await import('../route')
        const req = makeRequest({})
        const res = await POST(req)
        expect(res.status).toBe(400)
    })

    it('returns 400 on invalid JSON body', async () => {
        const { POST } = await import('../route')
        const req = new Request('http://localhost:3000/api/orders/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'not-json',
        })
        const res = await POST(req)
        expect(res.status).toBe(400)
    })

    it('returns 400 when display_id is non-numeric', async () => {
        const { POST } = await import('../route')
        const req = makeRequest({ email: 'test@example.com', display_id: 'abc-injected' })
        const res = await POST(req)
        expect(res.status).toBe(400)
        const json = await res.json()
        expect(json.error).toContain('numeric')
    })

    it('returns 404 when no order matches display_id', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ orders: [] }),
        })

        const { POST } = await import('../route')
        const req = makeRequest({ email: 'test@example.com', display_id: '999' })
        const res = await POST(req)
        expect(res.status).toBe(404)

        globalThis.fetch = originalFetch
    })

    it('returns 404 when order exists but email does not match', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                orders: [{
                    id: 'order_1',
                    display_id: 123,
                    email: 'different@example.com',
                    status: 'pending',
                    created_at: '2026-01-01T00:00:00Z',
                    total: 2500,
                    currency_code: 'eur',
                }],
            }),
        })

        const { POST } = await import('../route')
        const req = makeRequest({ email: 'test@example.com', display_id: '123' })
        const res = await POST(req)
        expect(res.status).toBe(404)

        globalThis.fetch = originalFetch
    })

    it('returns 200 with minimal fields on valid match', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                orders: [{
                    id: 'order_1',
                    display_id: 42,
                    email: 'buyer@example.com',
                    status: 'completed',
                    created_at: '2026-02-01T12:00:00Z',
                    total: 4999,
                    currency_code: 'eur',
                    // These should NOT be in response (security)
                    shipping_address: { address_1: '123 Main St' },
                    billing_address: { address_1: '456 Oak Ave' },
                    items: [{ id: 'item_1', title: 'Apple' }],
                }],
            }),
        })

        const { POST } = await import('../route')
        const req = makeRequest({ email: 'buyer@example.com', display_id: '42' })
        const res = await POST(req)
        expect(res.status).toBe(200)

        const json = await res.json()
        expect(json.order).toEqual({
            display_id: 42,
            status: 'completed',
            created_at: '2026-02-01T12:00:00Z',
            total: 4999,
            currency_code: 'eur',
        })

        // Sensitive fields must NOT be exposed
        expect(json.order.shipping_address).toBeUndefined()
        expect(json.order.billing_address).toBeUndefined()
        expect(json.order.items).toBeUndefined()
        expect(json.order.id).toBeUndefined()

        globalThis.fetch = originalFetch
    })

    it('returns 429 when rate limited', async () => {
        mockIsLimited.mockResolvedValue(true)

        vi.resetModules()
        const { POST } = await import('../route')
        const req = makeRequest({ email: 'test@example.com', display_id: '123' }, '1.2.3.4')
        const res = await POST(req)
        expect(res.status).toBe(429)
        const json = await res.json()
        expect(json.error).toContain('Too many')
    })

    it('returns 403 when enable_order_tracking is disabled', async () => {
        mockGetConfig.mockResolvedValue({
            featureFlags: { enable_order_tracking: false },
            planLimits: {},
            config: {},
        })

        vi.resetModules()
        const { POST } = await import('../route')
        const req = makeRequest({ email: 'test@example.com', display_id: '123' })
        const res = await POST(req)
        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.error).toContain('tracking')
    })
})
