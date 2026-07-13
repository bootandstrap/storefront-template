import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockRunBns360OrderLifecyclePrimaryJourney = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { key: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/bns-360/full-system-journeys', () => ({
    runBns360OrderLifecyclePrimaryJourney: mockRunBns360OrderLifecyclePrimaryJourney,
}))

function makeRequest(url = 'https://tenant.example.com/api/panel/bns-360/order-lifecycle-primary') {
    return new Request(url, { method: 'POST' }) as unknown as NextRequest
}

describe('POST /api/panel/bns-360/order-lifecycle-primary', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false, response: null, headers: { 'x-rate-limit': 'ok' } })
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant-1' })
        mockRunBns360OrderLifecyclePrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.order-lifecycle-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: { paymentCollectionLinked: true },
            cleanup: { status: 'verified' },
            residue: { zero: true },
        })
    })

    it('runs behind owner ecommerce guard and returns order lifecycle evidence', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(mockWithPanelGuard).toHaveBeenCalledWith({ requiredFlag: 'enable_ecommerce' })
        expect(mockRunBns360OrderLifecyclePrimaryJourney).toHaveBeenCalledWith({ tenantId: 'tenant-1' })
        expect(json.runtime.paymentCollectionLinked).toBe(true)
        expect(JSON.stringify(json)).not.toContain('password')
        expect(JSON.stringify(json)).not.toContain('token')
    })
})
