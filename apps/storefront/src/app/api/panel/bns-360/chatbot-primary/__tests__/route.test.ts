import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockRunBns360ChatbotPrimaryJourney = vi.fn()
const mockCreateBns360ChatbotPrimaryClient = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { key: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/bns-360/chatbot-primary-journey', () => ({
    runBns360ChatbotPrimaryJourney: mockRunBns360ChatbotPrimaryJourney,
}))

vi.mock('../route-support', () => ({
    createBns360ChatbotPrimaryClient: mockCreateBns360ChatbotPrimaryClient,
}))

function makeRequest(url = 'https://tenant.example.com/api/panel/bns-360/chatbot-primary') {
    return new Request(url, { method: 'POST' }) as unknown as NextRequest
}

describe('POST /api/panel/bns-360/chatbot-primary', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false, response: null, headers: { 'x-rate-limit': 'ok' } })
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant-1' })
        mockCreateBns360ChatbotPrimaryClient.mockReturnValue({ client: 'config' })
        mockRunBns360ChatbotPrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.chatbot-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: { chatbotName: 'BNS360 run-1', welcomeMessage: 'BNS360 welcome run-1' },
            usage: { limit: 250 },
            cleanup: { status: 'verified', restored: true },
        })
    })

    it('runs behind owner chatbot guard and returns redacted verified evidence', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(response.headers.get('x-rate-limit')).toBe('ok')
        expect(mockWithPanelGuard).toHaveBeenCalledWith({ requiredFlag: 'enable_chatbot' })
        expect(mockCreateBns360ChatbotPrimaryClient).toHaveBeenCalledWith('tenant-1')
        expect(mockRunBns360ChatbotPrimaryJourney).toHaveBeenCalledWith({
            tenantId: 'tenant-1',
            client: { client: 'config' },
        })
        expect(json).toMatchObject({
            schema: 'bootandstrap.template.bns-360.chatbot-primary/v1',
            status: 'verified',
            cleanup: { status: 'verified', restored: true },
        })
        expect(JSON.stringify(json)).not.toContain('password')
        expect(JSON.stringify(json)).not.toContain('token')
    })

    it('returns 409 when rollback cannot prove restored config', async () => {
        mockRunBns360ChatbotPrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.chatbot-primary/v1',
            status: 'blocked',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: { chatbotName: 'BNS360 run-1', welcomeMessage: 'BNS360 welcome run-1' },
            usage: { limit: 250 },
            cleanup: { status: 'failed', restored: false },
        })

        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(409)
        expect(json.status).toBe('blocked')
        expect(json.cleanup.status).toBe('failed')
    })

    it('uses the authenticated server Supabase client for owner config writes', () => {
        const source = readFileSync(join(__dirname, '../route-support.ts'), 'utf8')

        expect(source).toContain("from '@/lib/supabase/server'")
        expect(source).toContain('const supabase = await createClient()')
        expect(source).not.toContain("from '@/lib/supabase/admin'")
        expect(source).not.toContain('createAdminClient()')
    })

    it('updates chatbot module config through the same RLS boundary as panel module config', () => {
        const source = readFileSync(join(__dirname, '../route-support.ts'), 'utf8')

        expect(source).toContain(".from('config')")
        expect(source).toContain(".select('id')")
        expect(source).toContain('.update(payload)')
        expect(source).toContain(".eq('id', existing.id)")
        expect(source).toContain(".eq('tenant_id', tenantId)")
        expect(source).not.toContain('update_owner_config')
    })

    it('reads durable chatbot config and limits through the owner panel boundary', () => {
        const source = readFileSync(join(__dirname, '../route-support.ts'), 'utf8')

        expect(source).toContain(".from('config')")
        expect(source).toContain(
            ".select('chatbot_name,chatbot_welcome_message,chatbot_auto_open_delay,chatbot_tone,chatbot_knowledge_scope')"
        )
        expect(source).toContain(".from('plan_limits')")
        expect(source).toContain(".select('max_chatbot_messages_month')")
        expect(source).not.toContain('getConfigForTenant')
    })
})
