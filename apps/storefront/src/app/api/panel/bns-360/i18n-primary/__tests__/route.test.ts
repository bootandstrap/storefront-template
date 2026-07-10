import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockRunBns360I18nPrimaryJourney = vi.fn()
const mockCreateBns360I18nPrimaryClient = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { key: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/bns-360/i18n-primary-journey', () => ({
    runBns360I18nPrimaryJourney: mockRunBns360I18nPrimaryJourney,
}))

vi.mock('../route-support', () => ({
    createBns360I18nPrimaryClient: mockCreateBns360I18nPrimaryClient,
}))

function makeRequest(url = 'https://tenant.example.com/api/panel/bns-360/i18n-primary') {
    return new Request(url, { method: 'POST' }) as unknown as NextRequest
}

describe('POST /api/panel/bns-360/i18n-primary', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false, response: null, headers: { 'x-rate-limit': 'ok' } })
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant-1' })
        mockCreateBns360I18nPrimaryClient.mockReturnValue({ client: 'config' })
        mockRunBns360I18nPrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.i18n-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                language: 'de',
                storefrontLanguage: 'de',
                defaultCurrency: 'chf',
                publicPath: '/de',
                publicHtmlLang: 'de',
            },
            cleanup: { status: 'verified', restored: true },
        })
    })

    it('runs behind owner i18n guard and returns redacted verified evidence', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(response.headers.get('x-rate-limit')).toBe('ok')
        expect(mockWithPanelGuard).toHaveBeenCalledWith({ requiredFlag: 'enable_multi_language' })
        expect(mockCreateBns360I18nPrimaryClient).toHaveBeenCalledWith('tenant-1', 'https://tenant.example.com')
        expect(mockRunBns360I18nPrimaryJourney).toHaveBeenCalledWith({
            tenantId: 'tenant-1',
            client: { client: 'config' },
        })
        expect(json).toMatchObject({
            schema: 'bootandstrap.template.bns-360.i18n-primary/v1',
            status: 'verified',
            cleanup: { status: 'verified', restored: true },
        })
        expect(JSON.stringify(json)).not.toContain('password')
        expect(JSON.stringify(json)).not.toContain('token')
    })

    it('returns 409 when rollback cannot prove restored config', async () => {
        mockRunBns360I18nPrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.i18n-primary/v1',
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

    it('uses the authenticated server Supabase client and module config RLS boundary', () => {
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
        expect(source).not.toContain('update_owner_config')
    })

    it('reads only i18n config and limit fields durably', () => {
        const source = readFileSync(join(__dirname, '../route-support.ts'), 'utf8')

        expect(source).toContain(
            ".select('language,storefront_language,active_languages,default_currency,active_currencies,timezone')"
        )
        expect(source).toContain(".from('plan_limits')")
        expect(source).toContain(".select('max_languages,max_currencies')")
        expect(source).not.toContain('getConfigForTenant')
    })

    it('passes the localized public path through internal render headers', () => {
        const source = readFileSync(join(__dirname, '../route-support.ts'), 'utf8')

        expect(source).toContain("'x-bns-360-probe': 'i18n-primary'")
        expect(source).toContain("'x-invoke-path': path")
        expect(source).toContain("'x-matched-path': path")
        expect(source).toContain("process.env.PORT || '3000'")
        expect(source).toContain("'x-forwarded-host': publicUrl.host")
        expect(source).toContain("'x-forwarded-proto': publicUrl.protocol.replace(':', '')")
    })
})
