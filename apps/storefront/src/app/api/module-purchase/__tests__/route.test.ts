import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockGetActiveModulesForTenant = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => ({
        auth: { getUser: mockGetUser },
        from: () => ({ select: mockSelect }),
    })),
}))

vi.mock('@/lib/active-modules', () => ({
    getActiveModulesForTenant: mockGetActiveModulesForTenant,
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
        mockGetActiveModulesForTenant.mockResolvedValue([])
    })

    it('maps checkout_url -> url and forwards a semantic product key', async () => {
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
                tier_id: 'basic',
            }),
        })

        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.url).toBe('https://stripe.test/session_123')

        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
        const body = JSON.parse(String(options?.body))

        expect(fetchMock.mock.calls[0]?.[0]).toBe('https://control.example.com/api/commercial-checkout')
        expect(body.product_key).toMatch(/^module\.crm\./)
        expect(body.tenant_id).toBe('tenant-1')
        expect(body.currency).toBe('CHF')
        expect(body.billing_interval).toBe('month')
        expect(body).not.toHaveProperty('tier_id')
        expect(body.success_url).toBe('https://tenant.storefront.com/es/panel/ajustes?tab=suscripcion&module_purchased=crm')
        expect(body.cancel_url).toBe('https://tenant.storefront.com/es/panel/ajustes?tab=suscripcion')
        expect(body.idempotency_key).toMatch(/^[0-9a-f-]{36}$/)
        expect((options?.headers as Record<string, string>)['x-bns-internal-token']).toBe('test-internal-token')
    })

    it('fails closed before checkout when the internal BSWEB token is missing', async () => {
        delete process.env.BSWEB_INTERNAL_API_TOKEN
        const fetchMock = vi.fn()
        globalThis.fetch = fetchMock as unknown as typeof fetch

        const { POST } = await import('../route')

        const req = new NextRequest('https://tenant.storefront.com/api/module-purchase', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                module_key: 'crm',
                tier_id: 'basic',
            }),
        })

        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(503)
        expect(json.error).toBe('Storefront internal checkout token is not configured')
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('blocks module purchases when reusable dependency grants are not active', async () => {
        const fetchMock = vi.fn()
        globalThis.fetch = fetchMock as unknown as typeof fetch

        const { POST } = await import('../route')

        const req = new NextRequest('https://tenant.storefront.com/api/module-purchase', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                module_key: 'pos',
                tier_id: 'basic',
            }),
        })

        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json).toEqual({
            error: 'Dependencies not met',
            missing_dependencies: ['ecommerce'],
        })
        expect(mockGetActiveModulesForTenant).toHaveBeenCalledWith('tenant-1')
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('allows dependent modules when central active grants satisfy requirements', async () => {
        mockGetActiveModulesForTenant.mockResolvedValue([
            {
                moduleKey: 'ecommerce',
                tierKey: 'basic',
                stripeSubscriptionId: null,
                activatedAt: '2026-07-09T00:00:00.000Z',
                source: 'flags',
            },
        ])
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ url: 'https://stripe.test/session_pos' }),
        })
        globalThis.fetch = fetchMock as unknown as typeof fetch

        const { POST } = await import('../route')

        const req = new NextRequest('https://tenant.storefront.com/api/module-purchase', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                module_key: 'pos',
                tier_id: 'basic',
            }),
        })

        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.url).toBe('https://stripe.test/session_pos')
        const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
        const body = JSON.parse(String(options?.body))
        expect(body.product_key).toMatch(/^module\.pos\./)
    })

    it('propagates BSWEB commercial checkout errors without creating local grant state', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: false,
            status: 409,
            json: async () => ({ error: 'module.crm.basic is already active for this tenant' }),
        })
        globalThis.fetch = fetchMock as unknown as typeof fetch

        const { POST } = await import('../route')

        const req = new NextRequest('https://tenant.storefront.com/api/module-purchase', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                module_key: 'crm',
                tier_id: 'basic',
            }),
        })

        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(409)
        expect(json.error).toBe('module.crm.basic is already active for this tenant')
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })
})
