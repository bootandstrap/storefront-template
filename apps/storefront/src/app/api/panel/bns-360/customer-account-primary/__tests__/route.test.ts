import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockRunBns360CustomerAccountPrimaryJourney = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { key: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/bns-360/full-system-journeys', () => ({
    runBns360CustomerAccountPrimaryJourney: mockRunBns360CustomerAccountPrimaryJourney,
}))

function makeRequest(url = 'https://tenant.example.com/api/panel/bns-360/customer-account-primary') {
    return new Request(url, { method: 'POST' }) as unknown as NextRequest
}

describe('POST /api/panel/bns-360/customer-account-primary', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false, response: null, headers: { 'x-rate-limit': 'ok' } })
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant-1' })
        mockRunBns360CustomerAccountPrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.customer-account-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: { crossTenantLeakage: false },
            cleanup: { status: 'verified' },
            residue: { zero: true },
        })
    })

    it('runs behind owner ecommerce guard and returns tenant-scoped customer evidence', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(mockWithPanelGuard).toHaveBeenCalledWith({ requiredFlag: 'enable_ecommerce' })
        expect(mockRunBns360CustomerAccountPrimaryJourney).toHaveBeenCalledWith({ tenantId: 'tenant-1' })
        expect(json.runtime.crossTenantLeakage).toBe(false)
        expect(JSON.stringify(json)).not.toContain('password')
        expect(JSON.stringify(json)).not.toContain('token')
    })
})
