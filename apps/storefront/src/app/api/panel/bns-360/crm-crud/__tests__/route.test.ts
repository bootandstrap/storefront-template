import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockRunBns360CrmCrudJourney = vi.fn()
const mockCreateBns360CrmCrudMedusaClient = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { key: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/bns-360/crm-crud-journey', () => ({
    runBns360CrmCrudJourney: mockRunBns360CrmCrudJourney,
}))

vi.mock('../route-support', () => ({
    createBns360CrmCrudMedusaClient: mockCreateBns360CrmCrudMedusaClient,
}))

function makeRequest(url = 'https://tenant.example.com/api/panel/bns-360/crm-crud') {
    return new Request(url, { method: 'POST' }) as unknown as NextRequest
}

describe('POST /api/panel/bns-360/crm-crud', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false, response: null, headers: { 'x-rate-limit': 'ok' } })
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant-1' })
        mockCreateBns360CrmCrudMedusaClient.mockResolvedValue({ client: 'medusa' })
        mockRunBns360CrmCrudJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.crm-crud/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            cleanup: { status: 'verified' },
            residue: { zero: true },
            resource: { kind: 'medusa_customer', id: 'cus_1', email: '[redacted]' },
        })
    })

    it('runs behind owner CRM guard and returns redacted verified evidence', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(response.headers.get('x-rate-limit')).toBe('ok')
        expect(mockWithPanelGuard).toHaveBeenCalledWith({ requiredFlag: 'enable_crm' })
        expect(mockRunBns360CrmCrudJourney).toHaveBeenCalledWith({
            tenantId: 'tenant-1',
            client: { client: 'medusa' },
        })
        expect(json).toMatchObject({
            schema: 'bootandstrap.template.bns-360.crm-crud/v1',
            status: 'verified',
            cleanup: { status: 'verified' },
            residue: { zero: true },
        })
        expect(JSON.stringify(json)).not.toContain('@')
        expect(JSON.stringify(json)).not.toContain('+1555')
    })

    it('returns 409 when cleanup cannot prove zero residue', async () => {
        mockRunBns360CrmCrudJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.crm-crud/v1',
            status: 'blocked',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            cleanup: { status: 'failed' },
            residue: { zero: false },
            resource: { kind: 'medusa_customer', id: 'cus_1', email: '[redacted]' },
        })

        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(409)
        expect(json.status).toBe('blocked')
        expect(json.cleanup.status).toBe('failed')
    })
})
