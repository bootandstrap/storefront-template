import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SCHEMA_VERSION } from '@/lib/supabase/schema-version'

const limit = vi.fn()
const select = vi.fn(() => ({ limit }))
const from = vi.fn(() => ({ select }))
const createClient = vi.fn(async () => ({ from }))
const getEmailProviderName = vi.fn(() => 'console')

vi.mock('@/lib/supabase/server', () => ({
    createClient,
}))

vi.mock('@/lib/email', () => ({
    getEmailProviderName,
}))

describe('/api/health', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        limit.mockResolvedValue({ error: null })
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200 })))
    })

    it('reports the synced schemaVersion in quick health responses', async () => {
        const route = await import('../route')
        const response = await route.GET(new Request('https://tenant.test/api/health'))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.status).toBe('ok')
        expect(payload.schemaVersion).toBe(SCHEMA_VERSION)
    })
})
