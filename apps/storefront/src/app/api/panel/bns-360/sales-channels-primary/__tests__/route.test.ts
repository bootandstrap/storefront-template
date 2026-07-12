import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockRunBns360SalesChannelsPrimaryJourney = vi.fn()
const mockCreateBns360SalesChannelsPrimaryClient = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { key: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/bns-360/sales-channels-primary-journey', () => ({
    runBns360SalesChannelsPrimaryJourney: mockRunBns360SalesChannelsPrimaryJourney,
}))

vi.mock('../route-support', () => ({
    createBns360SalesChannelsPrimaryClient: mockCreateBns360SalesChannelsPrimaryClient,
}))

function makeRequest(url = 'https://tenant.example.com/api/panel/bns-360/sales-channels-primary') {
    return new Request(url, { method: 'POST' }) as unknown as NextRequest
}

describe('POST /api/panel/bns-360/sales-channels-primary', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false, response: null, headers: { 'x-rate-limit': 'ok' } })
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant-1' })
        mockCreateBns360SalesChannelsPrimaryClient.mockReturnValue({ client: 'config' })
        mockRunBns360SalesChannelsPrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.sales-channels-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                paymentMethods: { enabledIds: ['whatsapp', 'card', 'cod'], maxPaymentMethods: 3 },
                channelConfig: { preferredContact: 'email', whatsappGreetingRedacted: true },
            },
            cleanup: { status: 'verified', restored: true },
        })
    })

    it('runs behind owner sales channel guard and returns redacted verified evidence', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(response.headers.get('x-rate-limit')).toBe('ok')
        expect(mockWithPanelGuard).toHaveBeenCalledWith({ requiredFlag: 'enable_sales_channels' })
        expect(mockCreateBns360SalesChannelsPrimaryClient).toHaveBeenCalledWith('tenant-1')
        expect(mockRunBns360SalesChannelsPrimaryJourney).toHaveBeenCalledWith({
            tenantId: 'tenant-1',
            client: { client: 'config' },
        })
        expect(json).toMatchObject({
            schema: 'bootandstrap.template.bns-360.sales-channels-primary/v1',
            status: 'verified',
            runtime: { channelConfig: { whatsappGreetingRedacted: true } },
            cleanup: { status: 'verified', restored: true },
        })
        expect(JSON.stringify(json)).not.toContain('password')
        expect(JSON.stringify(json)).not.toContain('token')
        expect(JSON.stringify(json)).not.toContain('BNS360 sales channel')
    })

    it('returns 409 when rollback cannot prove restored config', async () => {
        mockRunBns360SalesChannelsPrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.sales-channels-primary/v1',
            status: 'blocked',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            cleanup: { status: 'failed', restored: false },
        })

        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(409)
        expect(json.status).toBe('blocked')
        expect(json.cleanup.status).toBe('failed')
    })

    it('uses the authenticated server Supabase client and tenant config boundary', () => {
        const source = readFileSync(join(__dirname, '../route-support.ts'), 'utf8')

        expect(source).toContain("from '@/lib/supabase/server'")
        expect(source).toContain('const supabase = await createClient()')
        expect(source).toContain(".from('config')")
        expect(source).toContain(".select('id')")
        expect(source).toContain('.update(payload)')
        expect(source).toContain(".eq('id', existing.id)")
        expect(source).toContain(".eq('tenant_id', tenantId)")
        expect(source).not.toContain("from '@/lib/supabase/admin'")
        expect(source).not.toContain('createAdminClient()')
    })

    it('does not execute real payments or external messaging', () => {
        const routeSource = readFileSync(join(__dirname, '../route.ts'), 'utf8')
        const supportSource = readFileSync(join(__dirname, '../route-support.ts'), 'utf8')

        expect(routeSource).not.toContain('stripe')
        expect(routeSource).not.toContain('fetch(')
        expect(supportSource).not.toContain('stripe')
        expect(supportSource).not.toContain('createPayment')
        expect(supportSource).not.toContain('testNotification')
        expect(supportSource).not.toContain('fetch(')
    })
})
