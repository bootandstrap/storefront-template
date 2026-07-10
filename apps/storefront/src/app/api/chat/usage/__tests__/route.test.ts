import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mockWithRateLimit = vi.fn()
const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockEqMonth = vi.fn(() => ({ single: mockSingle }))
const mockEqUser = vi.fn(() => ({ eq: mockEqMonth }))
const mockEqTenant = vi.fn(() => ({ eq: mockEqUser }))
const mockSelect = vi.fn(() => ({ eq: mockEqTenant }))
const mockChatUsageTable = vi.fn(() => ({ select: mockSelect }))
const mockGetConfig = vi.fn()

vi.mock('@/lib/security/api-rate-guard', () => ({
    API_GUARD: { name: 'api' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => ({
        auth: { getUser: mockGetUser },
    })),
}))

vi.mock('@/lib/chat/db', () => ({
    chatUsageTable: mockChatUsageTable,
}))

vi.mock('@/lib/config', () => ({
    getConfig: mockGetConfig,
}))

function makeRequest(): NextRequest {
    return new Request('http://localhost:3000/api/chat/usage') as unknown as NextRequest
}

describe('GET /api/chat/usage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.TENANT_ID = 'tenant-chat-1'
        mockWithRateLimit.mockResolvedValue({ limited: false })
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-chat-1' } } })
        mockSingle.mockResolvedValue({ data: { message_count: 42 } })
        mockGetConfig.mockResolvedValue({
            planLimits: { max_chatbot_messages_month: 500 },
        })
    })

    it('returns authenticated usage with the materialized chatbot message limit', async () => {
        const { GET } = await import('../route')

        const res = await GET(makeRequest())
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body).toMatchObject({
            messageCount: 42,
            authenticated: true,
            limit: 500,
        })
        expect(body.month).toMatch(/^\d{4}-\d{2}$/)
        expect(mockEqTenant).toHaveBeenCalledWith('tenant_id', 'tenant-chat-1')
        expect(mockEqUser).toHaveBeenCalledWith('user_id', 'user-chat-1')
    })
})
