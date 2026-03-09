/**
 * Tests for Stripe webhook idempotency (atomic claimEvent pattern)
 *
 * Validates:
 * - Duplicate events are skipped when claimEvent returns empty array (row exists)
 * - First-time events are processed when claimEvent returns the inserted row
 * - Missing webhook secret returns 503
 * - Missing signature returns 400
 * - Cart completion failure returns 500 (Stripe retries)
 * - Non-critical failure (email) returns 200 (no retry)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Stripe
// ---------------------------------------------------------------------------

const mockConstructEvent = vi.fn()

vi.mock('stripe', () => {
    class MockStripe {
        webhooks = { constructEvent: mockConstructEvent }
    }
    return { default: MockStripe }
})

// ---------------------------------------------------------------------------
// Mock governance client — isolate from real Supabase client singleton
// ---------------------------------------------------------------------------

const mockRpc = vi.fn()
const mockInsert = vi.fn()

vi.mock('server-only', () => ({}))

vi.mock('@/lib/supabase/governance', () => ({
    createGovernanceClient: vi.fn(() => ({
        rpc: mockRpc,
        from: vi.fn(() => ({
            insert: mockInsert.mockResolvedValue({ data: null, error: null }),
        })),
    })),
    getGovernanceMode: vi.fn(() => 'rpc'),
}))

// ---------------------------------------------------------------------------
// Mock fetch for Medusa + email calls
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch
let fetchResponses: Array<{ url: string; response: unknown; ok?: boolean }> = []

function mockFetchSetup(responses: Array<{ url: string; response: unknown; ok?: boolean }>) {
    fetchResponses = responses
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        const match = fetchResponses.find(r => String(url).includes(r.url))
        if (match) {
            return Promise.resolve({
                ok: match.ok !== undefined ? match.ok : true,
                status: match.ok === false ? 500 : 200,
                json: () => Promise.resolve(match.response),
                text: () => Promise.resolve(JSON.stringify(match.response)),
            })
        }
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve('{}'),
        })
    })
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = originalFetch
    // Reset governance singleton
    const g = globalThis as unknown as Record<string, unknown>
    delete g.__supabaseGovernanceClient
    delete g.__governanceMode
    // Default: claim returns 'claimed'
    mockRpc.mockResolvedValue({ data: 'claimed', error: null })
    mockInsert.mockResolvedValue({ data: null, error: null })
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
    process.env.STRIPE_SECRET_KEY = 'sk_test_key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.MEDUSA_BACKEND_URL = 'http://localhost:9000'
    process.env.TENANT_ID = 'test-tenant'
})

// Helper: create a mock NextRequest
function makeWebhookRequest(body: string = '{}', signature: string = 'sig_test'): Request {
    return new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'stripe-signature': signature,
        },
        body,
    }) as unknown as Request
}

describe('POST /api/webhooks/stripe — atomic idempotency', () => {
    it('returns 503 when webhook secret is not configured', async () => {
        process.env.STRIPE_WEBHOOK_SECRET = ''
        vi.resetModules()
        const { POST } = await import('../route')
        const req = makeWebhookRequest()
        const res = await POST(req as never)
        expect(res.status).toBe(503)
    })

    it('returns 400 when stripe-signature header is missing', async () => {
        vi.resetModules()
        const { POST } = await import('../route')
        const req = new Request('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST',
            body: '{}',
        })
        const res = await POST(req as never)
        expect(res.status).toBe(400)
    })

    it('skips duplicate event when claimEvent finds already-processed event', async () => {
        const fakeEvent = {
            id: 'evt_duplicate_123',
            type: 'payment_intent.succeeded',
            data: { object: { id: 'pi_test', amount: 1000, metadata: {} } },
        }
        mockConstructEvent.mockReturnValue(fakeEvent)

        // Governance mock: claim returns 'duplicate' → skip processing
        mockRpc.mockResolvedValue({ data: 'duplicate', error: null })

        vi.resetModules()
        const { POST } = await import('../route')
        const req = makeWebhookRequest('{"test": true}', 'sig_valid')
        const res = await POST(req as never)
        expect(res.status).toBe(200)

        const json = await res.json()
        expect(json.duplicate).toBe(true)
        expect(json.received).toBe(true)
    })

    it('processes first-time event when claimEvent inserts successfully', async () => {
        const fakeEvent = {
            id: 'evt_new_456',
            type: 'payment_intent.succeeded',
            data: {
                object: {
                    id: 'pi_new',
                    amount: 2500,
                    receipt_email: 'customer@test.com',
                    metadata: { customer_name: 'Test User', cart_id: 'cart_123' },
                },
            },
        }
        mockConstructEvent.mockReturnValue(fakeEvent)

        // Governance mock: claim returns 'claimed', mark succeeds
        mockRpc.mockResolvedValue({ data: 'claimed', error: null })

        // Fetch mocks: only Medusa + email (RPCs go through mockRpc)
        mockFetchSetup([
            { url: 'carts/cart_123/complete', response: { order: { id: 'order_1' } } },
            { url: 'functions/v1/send-email', response: { success: true } },
        ])

        vi.resetModules()
        const { POST } = await import('../route')
        const req = makeWebhookRequest('{"test": true}', 'sig_valid')
        const res = await POST(req as never)
        expect(res.status).toBe(200)

        const json = await res.json()
        expect(json.received).toBe(true)
        expect(json.duplicate).toBeUndefined()
    })

    it('returns 503 when Supabase is unavailable (fail-safe: forces Stripe retry)', async () => {
        const fakeEvent = {
            id: 'evt_fallback_789',
            type: 'payment_intent.succeeded',
            data: {
                object: {
                    id: 'pi_fallback',
                    amount: 500,
                    metadata: {},
                },
            },
        }
        mockConstructEvent.mockReturnValue(fakeEvent)

        // Governance mock: claim throws → 'unavailable' → 503 for Stripe retry
        mockRpc.mockResolvedValue({ data: null, error: { message: 'Network error' } })

        vi.resetModules()
        const { POST } = await import('../route')
        const req = makeWebhookRequest('{"test": true}', 'sig_valid')
        const res = await POST(req as never)
        // MUST return 503 so Stripe retries — we cannot risk silently dropping orders
        expect(res.status).toBe(503)
        const json = await res.json()
        expect(json.error).toBeDefined()
    })

    it('returns 503 when Supabase config is missing (fail-safe: forces Stripe retry)', async () => {
        const fakeEvent = {
            id: 'evt_no_config_001',
            type: 'payment_intent.succeeded',
            data: {
                object: {
                    id: 'pi_no_config',
                    amount: 1000,
                    metadata: {},
                },
            },
        }
        mockConstructEvent.mockReturnValue(fakeEvent)

        // Governance mock: RPC throws error → 'unavailable' → 503
        mockRpc.mockRejectedValue(new Error('Config missing'))

        vi.resetModules()
        const { POST } = await import('../route')
        const req = makeWebhookRequest('{"test": true}', 'sig_valid')
        const res = await POST(req as never)
        // Config missing → 'unavailable' → 503
        expect(res.status).toBe(503)
        const json = await res.json()
        expect(json.error).toBeDefined()
    })

    // ── NEW: H-003 Remediation tests ──────────────────────────────────────

    it('returns 500 when cart completion fails (critical path)', async () => {
        const fakeEvent = {
            id: 'evt_cart_fail_001',
            type: 'payment_intent.succeeded',
            data: {
                object: {
                    id: 'pi_cart_fail',
                    amount: 5000,
                    receipt_email: 'buyer@test.com',
                    metadata: { customer_name: 'Buyer', cart_id: 'cart_fail_999' },
                },
            },
        }
        mockConstructEvent.mockReturnValue(fakeEvent)

        // Governance mock: claim succeeds
        mockRpc.mockResolvedValue({ data: 'claimed', error: null })

        // Fetch mock: cart completion fails (Medusa returns 500)
        mockFetchSetup([
            { url: 'carts/cart_fail_999/complete', response: { error: 'Internal error' }, ok: false },
        ])

        vi.resetModules()
        const { POST } = await import('../route')
        const req = makeWebhookRequest('{"test": true}', 'sig_valid')
        const res = await POST(req as never)

        // MUST return 500 so Stripe retries — we cannot lose orders
        expect(res.status).toBe(500)

        const json = await res.json()
        expect(json.error).toBeDefined()
    })

    it('returns 200 when email fails but cart succeeds (non-critical)', async () => {
        const fakeEvent = {
            id: 'evt_email_fail_002',
            type: 'payment_intent.succeeded',
            data: {
                object: {
                    id: 'pi_email_fail',
                    amount: 3000,
                    receipt_email: 'buyer@test.com',
                    metadata: { customer_name: 'Buyer', cart_id: 'cart_ok_111' },
                },
            },
        }
        mockConstructEvent.mockReturnValue(fakeEvent)

        // Governance mock: claim succeeds
        mockRpc.mockResolvedValue({ data: 'claimed', error: null })

        // Fetch mocks: cart succeeds, email fails (non-critical)
        mockFetchSetup([
            { url: 'carts/cart_ok_111/complete', response: { order: { id: 'order_ok' } } },
            { url: 'functions/v1/send-email', response: { error: 'Email service down' }, ok: false },
        ])

        vi.resetModules()
        const { POST } = await import('../route')
        const req = makeWebhookRequest('{"test": true}', 'sig_valid')
        const res = await POST(req as never)

        // MUST return 200 — email failure is non-critical
        expect(res.status).toBe(200)

        const json = await res.json()
        expect(json.received).toBe(true)
    })
})
