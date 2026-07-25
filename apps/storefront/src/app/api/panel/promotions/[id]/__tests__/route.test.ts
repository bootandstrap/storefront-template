import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockGetTenantMedusaScope = vi.fn()
const mockUpdatePromotion = vi.fn()
const mockDeletePromotion = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { bucket: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: mockGetTenantMedusaScope,
}))

vi.mock('@/lib/medusa/admin-promotions', () => ({
    updatePromotion: mockUpdatePromotion,
    deletePromotion: mockDeletePromotion,
}))

vi.mock('@/lib/logger', () => ({
    logger: { error: mockLoggerError },
}))

function makeRequest(body?: Record<string, unknown>): NextRequest {
    return new NextRequest(new Request('https://tenant.example.com/api/panel/promotions/promo_1', {
        method: body ? 'PATCH' : 'DELETE',
        body: body ? JSON.stringify(body) : undefined,
    }))
}

describe('PATCH/DELETE /api/panel/promotions/[id]', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false })
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant_123' })
        mockGetTenantMedusaScope.mockResolvedValue({ tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' })
        mockUpdatePromotion.mockResolvedValue({ error: null })
        mockDeletePromotion.mockResolvedValue({ error: null })
    })

    it('patches a promotion through the authenticated tenant Medusa scope', async () => {
        const { PATCH } = await import('../route')

        const response = await PATCH(
            makeRequest({ is_disabled: true }),
            { params: Promise.resolve({ id: 'promo_1' }) }
        )
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(mockUpdatePromotion).toHaveBeenCalledWith(
            'promo_1',
            { is_disabled: true },
            { tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' }
        )
        expect(json.ok).toBe(true)
    })

    it('deletes a promotion through the authenticated tenant Medusa scope', async () => {
        const { DELETE } = await import('../route')

        const response = await DELETE(
            makeRequest(),
            { params: Promise.resolve({ id: 'promo_1' }) }
        )
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(mockDeletePromotion).toHaveBeenCalledWith(
            'promo_1',
            { tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' }
        )
        expect(json.ok).toBe(true)
    })
})
