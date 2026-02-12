import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mockIsLimited = vi.fn()
const mockInsert = vi.fn()
const mockFrom = vi.fn()
const mockCreateAdminClient = vi.fn()

vi.mock('@/lib/security/rate-limit-factory', () => ({
    createSmartRateLimiter: vi.fn(() => ({
        isLimited: mockIsLimited,
        reset: vi.fn(),
        resetAll: vi.fn(),
    })),
}))

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: mockCreateAdminClient,
}))

function makeRequest(body: unknown, ip = '1.2.3.4'): NextRequest {
    return new Request('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip,
        },
        body: JSON.stringify(body),
    }) as unknown as NextRequest
}

describe('POST /api/analytics', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.TENANT_ID = 'tenant_analytics_1'
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
        mockIsLimited.mockResolvedValue(false)
        mockInsert.mockResolvedValue({ error: null })
        mockFrom.mockReturnValue({ insert: mockInsert })
        mockCreateAdminClient.mockReturnValue({
            from: mockFrom,
        })
    })

    it('returns 429 when rate limited', async () => {
        mockIsLimited.mockResolvedValueOnce(true)
        const { POST } = await import('../route')
        const res = await POST(makeRequest({ event_type: 'page_view' }))
        expect(res.status).toBe(429)
    })

    it('returns 503 when TENANT_ID is missing', async () => {
        delete process.env.TENANT_ID
        const { POST } = await import('../route')
        const res = await POST(makeRequest({ event_type: 'page_view' }))
        expect(res.status).toBe(503)
    })

    it('returns 500 when insert fails', async () => {
        mockInsert.mockResolvedValueOnce({ error: { message: 'insert failed' } })
        const { POST } = await import('../route')
        const res = await POST(makeRequest({ event_type: 'page_view' }))
        expect(res.status).toBe(500)
    })

    it('returns 200 when payload is valid', async () => {
        const { POST } = await import('../route')
        const res = await POST(makeRequest({ event_type: 'page_view', properties: { a: 1 } }))
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.ok).toBe(true)
        expect(mockFrom).toHaveBeenCalledWith('analytics_events')
    })
})
