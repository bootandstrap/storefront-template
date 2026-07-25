import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRpc = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockLoggerWarn = vi.fn()
const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => ({
        rpc: mockRpc,
        from: vi.fn((table: string) => ({
            update: mockUpdate,
            insert: table === 'tenant_errors' ? mockInsert : vi.fn(),
            select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: { email_sends_this_month: 1 } })) })) })),
        })),
    }),
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        warn: mockLoggerWarn,
        info: mockLoggerInfo,
        error: mockLoggerError,
    },
}))

function resendPayload(type = 'email.delivered') {
    return {
        type,
        created_at: '2026-07-25T00:00:00Z',
        data: {
            email_id: 'email_1',
            from: 'hello@example.com',
            to: ['buyer@example.com'],
            subject: 'Hello',
            created_at: '2026-07-25T00:00:00Z',
            tags: { tenant_id: 'tenant_123' },
        },
    }
}

describe('GET/POST /api/webhooks/resend', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        process.env.RESEND_WEBHOOK_SECRET = 'resend_secret'
        process.env.TENANT_ID = ''
        mockRpc.mockResolvedValue({ error: null })
        mockUpdate.mockReturnValue({
            eq: vi.fn(() => ({
                eq: vi.fn(async () => ({ error: null })),
            })),
        })
        mockInsert.mockResolvedValue({ error: null })
    })

    it('returns a health probe response for uptime checks', async () => {
        const { GET } = await import('../route')

        const response = await GET()
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json).toEqual({ status: 'ok', handler: 'resend-webhook' })
    })

    it('rejects signed-mode webhooks without a signature', async () => {
        const { POST } = await import('../route')

        const response = await POST(new Request('https://tenant.example.com/api/webhooks/resend', {
            method: 'POST',
            body: JSON.stringify(resendPayload()),
        }))
        const json = await response.json()

        expect(response.status).toBe(401)
        expect(json.error).toBe('Invalid webhook signature')
        expect(mockRpc).not.toHaveBeenCalled()
    })

    it('increments tenant email counters for delivered events', async () => {
        const { POST } = await import('../route')

        const response = await POST(new Request('https://tenant.example.com/api/webhooks/resend', {
            method: 'POST',
            headers: { 'svix-signature': 'sig_test' },
            body: JSON.stringify(resendPayload('email.delivered')),
        }))
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.received).toBe(true)
        expect(mockRpc).toHaveBeenCalledWith('increment_email_counter', { p_tenant_id: 'tenant_123' })
        expect(mockUpdate).toHaveBeenCalledWith({ status: 'delivered' })
    })
})
