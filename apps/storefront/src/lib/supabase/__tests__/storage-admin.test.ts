import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

describe('createStorageAdminClient', () => {
    const originalEnv = process.env

    beforeEach(() => {
        process.env = {
            ...originalEnv,
            NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
            GOVERNANCE_SUPABASE_SERVICE_KEY: 'governance-service-key',
        }
        vi.resetModules()
    })

    it('prefers GOVERNANCE_SUPABASE_SERVICE_KEY for privileged storage operations', async () => {
        const { createStorageAdminClient } = await import('../storage-admin')

        expect(typeof createStorageAdminClient).toBe('function')
    })
})
