/**
 * Tests for Stripe webhook idempotency (atomic claimEvent pattern)
 *
 * Validates:
 * - Duplicate events are skipped when claimEvent returns empty array (row exists)
 * - First-time events are processed when claimEvent returns the inserted row
 * - Missing webhook secret returns 503
 * - Missing signature returns 400
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Stripe
// ---------------------------------------------------------------------------

const mockConstructEvent = vi.fn()

vi.mock('stripe', () => {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class MockStripe {
        webhooks = { constructEvent: mockConstructEvent }
    }
    return { default: MockStripe }
})

// ---------------------------------------------------------------------------
// Mock fetch for Supabase + Medusa calls
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch
let fetchResponses: Array<{ url: string; response: unknown }> = []

function mockFetchSetup(responses: Array<{ url: string; response: unknown }>) {
    fetchResponses = responses
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        const match = fetchResponses.find(r => String(url).includes(r.url))
        if (match) {
            return Promise.resolve({
                ok: true,
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

    it('skips duplicate event when claimEvent returns empty (row already exists)', async () => {
        const fakeEvent = {
            id: 'evt_duplicate_123',
            type: 'payment_intent.succeeded',
            data: { object: { id: 'pi_test', amount: 1000, metadata: {} } },
        }
        mockConstructEvent.mockReturnValue(fakeEvent)

        // claimEvent: upsert returns empty array → row already existed → duplicate
        mockFetchSetup([
            { url: 'stripe_webhook_events', response: [] },
        ])

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

        // claimEvent: upsert returns the inserted row → we own this event
        mockFetchSetup([
            {
                url: 'stripe_webhook_events',
                response: [{ id: 'new-row', event_id: 'evt_new_456' }],
            },
            { url: 'carts/cart_123/complete', response: { order: { id: 'order_1' } } },
            { url: 'functions/v1/send-email', response: { success: true } },
            { url: 'analytics_events', response: {} },
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

    it('processes event when Supabase is unavailable (fail-open)', async () => {
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

        // claimEvent: fetch throws → fail-open → process anyway
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

        vi.resetModules()
        const { POST } = await import('../route')
        const req = makeWebhookRequest('{"test": true}', 'sig_valid')
        const res = await POST(req as never)
        expect(res.status).toBe(200)

        const json = await res.json()
        expect(json.received).toBe(true)
    })
})
