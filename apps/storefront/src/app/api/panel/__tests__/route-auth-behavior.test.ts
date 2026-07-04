import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mockWithPanelGuard = vi.fn()
const mockRequirePanelAuth = vi.fn()
const mockWithRateLimit = vi.fn()
const mockCreatePromotion = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/panel-auth', () => ({
    requirePanelAuth: mockRequirePanelAuth,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { key: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: vi.fn(async () => ({ tenantId: 'tenant-1' })),
}))

vi.mock('@/lib/medusa/admin-promotions', () => ({
    createPromotion: mockCreatePromotion,
}))

function makeJsonRequest(url: string, body: unknown): NextRequest {
    return new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }) as unknown as NextRequest
}

describe('panel route auth behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false, response: null })
        mockCreatePromotion.mockResolvedValue({ promotion: null, error: null })
    })

    it('returns 401 for unauthenticated analytics requests', async () => {
        mockWithPanelGuard.mockRejectedValueOnce(new Error('Not authenticated'))

        const { GET } = await import('../analytics/route')
        const res = await GET(new Request('http://localhost:3000/api/panel/analytics') as NextRequest)

        expect(res.status).toBe(401)
        await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
    })

    it('returns 401 for unauthenticated email domain requests', async () => {
        mockRequirePanelAuth.mockRejectedValueOnce(new Error('Not authenticated'))

        const { GET } = await import('../email-domain/route')
        const res = await GET()

        expect(res.status).toBe(401)
        await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
    })

    it('returns 403 for panel users without permissions on promotions', async () => {
        mockWithPanelGuard.mockRejectedValueOnce(new Error('Insufficient permissions'))

        const { POST } = await import('../promotions/route')
        const res = await POST(
            makeJsonRequest('http://localhost:3000/api/panel/promotions', { code: 'SPRING' })
        )

        expect(res.status).toBe(403)
        await expect(res.json()).resolves.toEqual({ error: 'Forbidden' })
    })
})
