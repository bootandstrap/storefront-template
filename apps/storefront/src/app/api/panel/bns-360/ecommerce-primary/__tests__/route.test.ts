import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockRunBns360EcommercePrimaryJourney = vi.fn()
const mockCreateBns360EcommerceMedusaClient = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { key: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/bns-360/ecommerce-primary-journey', () => ({
    runBns360EcommercePrimaryJourney: mockRunBns360EcommercePrimaryJourney,
}))

vi.mock('../route-support', () => ({
    createBns360EcommerceMedusaClient: mockCreateBns360EcommerceMedusaClient,
}))

function makeRequest(url = 'https://tenant.example.com/api/panel/bns-360/ecommerce-primary') {
    return new Request(url, { method: 'POST' }) as unknown as NextRequest
}

describe('POST /api/panel/bns-360/ecommerce-primary', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false, response: null, headers: { 'x-rate-limit': 'ok' } })
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant-1' })
        mockCreateBns360EcommerceMedusaClient.mockResolvedValue({ client: 'medusa' })
        mockRunBns360EcommercePrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.ecommerce-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                product: { id: 'prod_1', handle: 'bns360-ecommerce-run-1', status: 'draft' },
                catalog: { readableAfterCreate: true, updatedTitle: 'BNS360 Product Updated' },
            },
            cleanup: { status: 'verified' },
            residue: { zero: true },
        })
    })

    it('runs behind owner ecommerce guard and returns redacted verified evidence', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(response.headers.get('x-rate-limit')).toBe('ok')
        expect(mockWithPanelGuard).toHaveBeenCalledWith({ requiredFlag: 'enable_ecommerce' })
        expect(mockRunBns360EcommercePrimaryJourney).toHaveBeenCalledWith({
            tenantId: 'tenant-1',
            client: { client: 'medusa' },
        })
        expect(json).toMatchObject({
            schema: 'bootandstrap.template.bns-360.ecommerce-primary/v1',
            status: 'verified',
            cleanup: { status: 'verified' },
            residue: { zero: true },
        })
        expect(JSON.stringify(json)).not.toContain('MEDUSA_ADMIN_PASSWORD')
        expect(JSON.stringify(json)).not.toContain('token')
        expect(JSON.stringify(json)).not.toContain('password')
    })

    it('returns 409 when cleanup cannot prove zero residue', async () => {
        mockRunBns360EcommercePrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.ecommerce-primary/v1',
            status: 'blocked',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                product: { id: 'prod_1', handle: 'bns360-ecommerce-run-1', status: 'draft' },
                catalog: { readableAfterCreate: true, updatedTitle: 'BNS360 Product Updated' },
            },
            cleanup: { status: 'failed' },
            residue: { zero: false },
        })

        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(409)
        expect(json.status).toBe('blocked')
        expect(json.cleanup.status).toBe('failed')
    })
})
