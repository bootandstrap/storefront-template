import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockRunBns360RrssPrimaryJourney = vi.fn()
const mockCreateBns360RrssPrimaryClient = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { key: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/bns-360/rrss-primary-journey', () => ({
    runBns360RrssPrimaryJourney: mockRunBns360RrssPrimaryJourney,
}))

vi.mock('../route-support', () => ({
    createBns360RrssPrimaryClient: mockCreateBns360RrssPrimaryClient,
}))

function makeRequest(url = 'https://tenant.example.com/api/panel/bns-360/rrss-primary') {
    return new Request(url, { method: 'POST' }) as unknown as NextRequest
}

describe('POST /api/panel/bns-360/rrss-primary', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false, response: null, headers: { 'x-rate-limit': 'ok' } })
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant-1' })
        mockCreateBns360RrssPrimaryClient.mockReturnValue({ client: 'config' })
        mockRunBns360RrssPrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.rrss-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                socialFacebook: 'https://facebook.com/bns360-run-1',
                socialInstagram: 'https://instagram.com/bns360-run-1',
                sameAs: [
                    'https://instagram.com/bns360-run-1',
                    'https://facebook.com/bns360-run-1',
                ],
            },
            cleanup: { status: 'verified', restored: true },
        })
    })

    it('runs behind owner RRSS guard and returns redacted verified evidence', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(response.headers.get('x-rate-limit')).toBe('ok')
        expect(mockWithPanelGuard).toHaveBeenCalledWith({ requiredFlag: 'enable_social_media' })
        expect(mockCreateBns360RrssPrimaryClient).toHaveBeenCalledWith('tenant-1', 'https://tenant.example.com')
        expect(mockRunBns360RrssPrimaryJourney).toHaveBeenCalledWith({
            tenantId: 'tenant-1',
            client: { client: 'config' },
        })
        expect(json).toMatchObject({
            schema: 'bootandstrap.template.bns-360.rrss-primary/v1',
            status: 'verified',
            cleanup: { status: 'verified', restored: true },
        })
        expect(JSON.stringify(json)).not.toContain('password')
        expect(JSON.stringify(json)).not.toContain('token')
    })

    it('returns 409 when rollback cannot prove restored config', async () => {
        mockRunBns360RrssPrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.rrss-primary/v1',
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

    it('uses the authenticated server Supabase client and config RLS boundary', () => {
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

    it('reads only social link fields that exist in the deployed config table', () => {
        const source = readFileSync(join(__dirname, '../route-support.ts'), 'utf8')

        expect(source).toContain(".select('social_facebook,social_instagram')")
        expect(source).not.toContain('social_tiktok')
        expect(source).not.toContain('social_twitter')
        expect(source).not.toContain('google_analytics_id')
        expect(source).not.toContain('facebook_pixel_id')
        expect(source).not.toContain('sentry_dsn')
    })

    it('passes the public home path through internal render headers', () => {
        const source = readFileSync(join(__dirname, '../route-support.ts'), 'utf8')

        expect(source).toContain("'x-bns-360-probe': 'rrss-primary'")
        expect(source).toContain("'x-invoke-path': path")
        expect(source).toContain("'x-matched-path': path")
        expect(source).toContain("process.env.PORT || '3000'")
        expect(source).toContain("'x-forwarded-host': publicUrl.host")
        expect(source).toContain("'x-forwarded-proto': publicUrl.protocol.replace(':', '')")
    })
})
