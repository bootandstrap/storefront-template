import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockRunBns360POSPrimaryJourney = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { key: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/bns-360/pos-primary-journey', () => ({
    runBns360POSPrimaryJourney: mockRunBns360POSPrimaryJourney,
}))

function makeRequest(url = 'https://tenant.example.com/api/panel/bns-360/pos-primary') {
    return new Request(url, { method: 'POST' }) as unknown as NextRequest
}

describe('POST /api/panel/bns-360/pos-primary', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false, response: null, headers: { 'x-rate-limit': 'ok' } })
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant-1',
            appConfig: {
                config: { business_name: 'BNS 360 POS' },
                featureFlags: { enable_pos: true, enable_pos_kiosk: true },
                planLimits: { max_pos_payment_methods: 2 },
            },
        })
        mockRunBns360POSPrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.pos-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                cart: { itemCount: 2, total: 2340 },
                paymentMethods: { enabledIds: ['cash', 'card_terminal'] },
                virtualPrinter: { jobs: [{ type: 'sale_receipt' }, { type: 'cash_drawer' }] },
                kiosk: { available: true },
            },
            cleanup: { status: 'verified', restored: true },
            residue: { zero: true },
        })
    })

    it('runs behind owner POS guard and returns redacted verified evidence', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(response.headers.get('x-rate-limit')).toBe('ok')
        expect(mockWithPanelGuard).toHaveBeenCalledWith({ requiredFlag: 'enable_pos' })
        expect(mockRunBns360POSPrimaryJourney).toHaveBeenCalledWith({
            tenantId: 'tenant-1',
            featureFlags: { enable_pos: true, enable_pos_kiosk: true },
            planLimits: { max_pos_payment_methods: 2 },
            businessName: 'BNS 360 POS',
        })
        expect(json).toMatchObject({
            schema: 'bootandstrap.template.bns-360.pos-primary/v1',
            status: 'verified',
            cleanup: { status: 'verified', restored: true },
            residue: { zero: true },
        })
        expect(JSON.stringify(json)).not.toContain('password')
        expect(JSON.stringify(json)).not.toContain('token')
    })

    it('returns 409 when POS runtime projection is blocked', async () => {
        mockRunBns360POSPrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.pos-primary/v1',
            status: 'blocked',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            cleanup: { status: 'verified', restored: true },
            residue: { zero: true },
            error: 'enable_pos is not materialized',
        })

        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(409)
        expect(json.status).toBe('blocked')
        expect(json.error).toContain('enable_pos')
    })

    it('does not execute real payments, refunds, Medusa order writes or external calls', () => {
        const routeSource = readFileSync(join(__dirname, '../route.ts'), 'utf8')

        expect(routeSource).not.toContain('stripe')
        expect(routeSource).not.toContain('createPOSSale')
        expect(routeSource).not.toContain('convertDraftToOrder')
        expect(routeSource).not.toContain('refund')
        expect(routeSource).not.toContain('fetch(')
    })
})
