import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockRunBns360SeoPrimaryJourney = vi.fn()
const mockCreateBns360SeoPrimaryClient = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { key: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/bns-360/seo-primary-journey', () => ({
    runBns360SeoPrimaryJourney: mockRunBns360SeoPrimaryJourney,
}))

vi.mock('../route-support', () => ({
    createBns360SeoPrimaryClient: mockCreateBns360SeoPrimaryClient,
}))

function makeRequest(url = 'https://tenant.example.com/api/panel/bns-360/seo-primary') {
    return new Request(url, { method: 'POST' }) as unknown as NextRequest
}

describe('POST /api/panel/bns-360/seo-primary', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false, response: null, headers: { 'x-rate-limit': 'ok' } })
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant-1' })
        mockCreateBns360SeoPrimaryClient.mockReturnValue({ client: 'config' })
        mockRunBns360SeoPrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.seo-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                metaTitle: 'BNS360 SEO run-1',
                metaDescription: 'BNS360 metadata run-1',
                publicTitle: 'BNS360 SEO run-1',
                publicDescription: 'BNS360 metadata run-1',
            },
            cleanup: { status: 'verified', restored: true },
        })
    })

    it('runs behind owner SEO guard and returns redacted verified evidence', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(response.headers.get('x-rate-limit')).toBe('ok')
        expect(mockWithPanelGuard).toHaveBeenCalledWith({ requiredFlag: 'enable_seo' })
        expect(mockCreateBns360SeoPrimaryClient).toHaveBeenCalledWith('tenant-1', 'https://tenant.example.com')
        expect(mockRunBns360SeoPrimaryJourney).toHaveBeenCalledWith({
            tenantId: 'tenant-1',
            client: { client: 'config' },
        })
        expect(json).toMatchObject({
            schema: 'bootandstrap.template.bns-360.seo-primary/v1',
            status: 'verified',
            cleanup: { status: 'verified', restored: true },
        })
        expect(JSON.stringify(json)).not.toContain('password')
        expect(JSON.stringify(json)).not.toContain('token')
    })

    it('returns 409 when rollback cannot prove restored config', async () => {
        mockRunBns360SeoPrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.seo-primary/v1',
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

    it('reads only SEO metadata fields durably', () => {
        const source = readFileSync(join(__dirname, '../route-support.ts'), 'utf8')

        expect(source).toContain(".select('meta_title,meta_description')")
        expect(source).not.toContain('google_analytics_id')
        expect(source).not.toContain('facebook_pixel_id')
        expect(source).not.toContain('sentry_dsn')
    })

    it('passes the public home path through internal render headers', () => {
        const source = readFileSync(join(__dirname, '../route-support.ts'), 'utf8')

        expect(source).toContain("'x-bns-360-probe': 'seo-primary'")
        expect(source).toContain("'x-invoke-path': path")
        expect(source).toContain("'x-matched-path': path")
        expect(source).toContain("process.env.PORT || '3000'")
        expect(source).toContain("'x-forwarded-host': publicUrl.host")
        expect(source).toContain("'x-forwarded-proto': publicUrl.protocol.replace(':', '')")
    })
})
