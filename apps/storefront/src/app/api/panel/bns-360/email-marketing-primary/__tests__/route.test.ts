import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockRunBns360EmailMarketingPrimaryJourney = vi.fn()
const mockCreateBns360EmailMarketingPrimaryClient = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { key: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/bns-360/email-marketing-primary-journey', () => ({
    runBns360EmailMarketingPrimaryJourney: mockRunBns360EmailMarketingPrimaryJourney,
}))

vi.mock('../route-support', () => ({
    createBns360EmailMarketingPrimaryClient: mockCreateBns360EmailMarketingPrimaryClient,
}))

function makeRequest(url = 'https://tenant.example.com/api/panel/bns-360/email-marketing-primary') {
    return new Request(url, { method: 'POST' }) as unknown as NextRequest
}

describe('POST /api/panel/bns-360/email-marketing-primary', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false, response: null, headers: { 'x-rate-limit': 'ok' } })
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant-1' })
        mockCreateBns360EmailMarketingPrimaryClient.mockReturnValue({ client: 'email-marketing' })
        mockRunBns360EmailMarketingPrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.email-marketing-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                preferences: { templateDesign: 'branded' },
                automation: { reviewRequestEnabled: true },
                limits: { maxEmailSendsMonth: 1000 },
                secretRedacted: true,
            },
            cleanup: { status: 'verified', restored: true },
        })
    })

    it('runs behind owner email notifications guard and returns redacted verified evidence', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(response.headers.get('x-rate-limit')).toBe('ok')
        expect(mockWithPanelGuard).toHaveBeenCalledWith({ requiredFlag: 'enable_email_notifications' })
        expect(mockCreateBns360EmailMarketingPrimaryClient).toHaveBeenCalledWith('tenant-1')
        expect(mockRunBns360EmailMarketingPrimaryJourney).toHaveBeenCalledWith({
            tenantId: 'tenant-1',
            client: { client: 'email-marketing' },
        })
        expect(json).toMatchObject({
            schema: 'bootandstrap.template.bns-360.email-marketing-primary/v1',
            status: 'verified',
            runtime: { secretRedacted: true },
            cleanup: { status: 'verified', restored: true },
        })
        expect(JSON.stringify(json)).not.toContain('password')
        expect(JSON.stringify(json)).not.toContain('token')
        expect(JSON.stringify(json)).not.toContain('api_key')
    })

    it('returns 409 when cleanup cannot prove restored email config', async () => {
        mockRunBns360EmailMarketingPrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.email-marketing-primary/v1',
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

    it('uses the owner guard plus a server-only privileged client for service-only email tables', () => {
        const routeSource = readFileSync(join(__dirname, '../route.ts'), 'utf8')
        const source = readFileSync(join(__dirname, '../route-support.ts'), 'utf8')

        expect(routeSource).toContain("withPanelGuard({ requiredFlag: 'enable_email_notifications' })")
        expect(source).toContain('GOVERNANCE_SUPABASE_SERVICE_KEY')
        expect(source).toContain('SUPABASE_SERVICE_ROLE_KEY')
        expect(source).toContain('createSupabaseClient')
        expect(source).toContain(".from('email_preferences')")
        expect(source).toContain(".from('email_automation_config')")
        expect(source).toContain(".from('plan_limits')")
        expect(source).toContain(".eq('tenant_id', tenantId)")
        expect(source).not.toContain("from '@/lib/supabase/server'")
        expect(source).not.toContain("from '@/lib/supabase/admin'")
        expect(source).not.toContain('await createClient()')
        expect(source).not.toContain('createAdminClient()')
    })

    it('does not send external emails or read provider secrets', () => {
        const routeSource = readFileSync(join(__dirname, '../route.ts'), 'utf8')
        const supportSource = readFileSync(join(__dirname, '../route-support.ts'), 'utf8')

        expect(routeSource).not.toContain('sendEmailForTenant')
        expect(routeSource).not.toContain('fetch(')
        expect(supportSource).not.toContain('sendEmailForTenant')
        expect(supportSource).not.toContain('email_api_key')
        expect(supportSource).not.toContain('resend')
        expect(supportSource).not.toContain('mailchimp')
    })
})
