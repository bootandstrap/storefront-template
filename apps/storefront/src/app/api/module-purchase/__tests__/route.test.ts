import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => ({
        auth: { getUser: mockGetUser },
        from: () => ({ select: mockSelect }),
    })),
}))

describe('POST /api/module-purchase', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.BSWEB_INTERNAL_URL = 'https://control.example.com'
        process.env.BSWEB_INTERNAL_API_TOKEN = 'test-internal-token'

        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
        mockSelect.mockReturnValue({ eq: mockEq })
        mockEq.mockReturnValue({ single: mockSingle })
        mockSingle.mockResolvedValue({ data: { tenant_id: 'tenant-1', role: 'owner' } })
    })

    it('maps checkout_url -> url and forwards tier_id + internal token', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ checkout_url: 'https://stripe.test/session_123' }),
        })
        globalThis.fetch = fetchMock as unknown as typeof fetch

        const { POST } = await import('../route')

        const req = new NextRequest('https://tenant.storefront.com/api/module-purchase', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-locale': 'es',
            },
            body: JSON.stringify({
                module_key: 'crm',
                tier_id: 'tier-abc',
            }),
        })

        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.url).toBe('https://stripe.test/session_123')

        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
        const body = JSON.parse(String(options?.body))

        expect(body.tier_id).toBe('tier-abc')
        expect(body.tier).toBeUndefined()
        expect((options?.headers as Record<string, string>)['x-bns-internal-token']).toBe('test-internal-token')
    })
})

