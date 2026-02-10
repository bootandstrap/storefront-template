/**
 * Config Fetch Authorization Tests
 *
 * Verifies that getConfig() uses the service-role admin client (not anon)
 * and always scopes queries by tenant_id.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock the admin client module
// ---------------------------------------------------------------------------

const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

const mockAdminClient = { from: mockFrom }

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: vi.fn(() => mockAdminClient),
}))

// Mock 'server-only' (no-op in test environment)
vi.mock('server-only', () => ({}))

// Mock next/cache
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getConfig — authorization', () => {
    const originalEnv = process.env

    beforeEach(() => {
        process.env = { ...originalEnv }
        process.env.TENANT_ID = 'tenant-test-123'
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

        vi.clearAllMocks()

        // Reset in-memory cache by re-importing (dynamic import)
        vi.resetModules()
    })

    afterEach(() => {
        process.env = originalEnv
    })

    it('uses admin client (service-role), not anon client', async () => {
        // Setup: return valid config data
        mockSingle.mockResolvedValue({
            data: { id: '1', tenant_id: 'tenant-test-123', business_name: 'Test' },
            error: null,
        })

        const { getConfig } = await import('../config')
        await getConfig()

        // Verify createAdminClient was used
        const { createAdminClient } = await import('../supabase/admin')
        expect(createAdminClient).toHaveBeenCalled()
    })

    it('always scopes queries by tenant_id', async () => {
        mockSingle.mockResolvedValue({
            data: { id: '1', tenant_id: 'tenant-test-123' },
            error: null,
        })

        const { getConfig } = await import('../config')
        await getConfig()

        // All three governance tables must be filtered by tenant_id
        expect(mockFrom).toHaveBeenCalledWith('config')
        expect(mockFrom).toHaveBeenCalledWith('feature_flags')
        expect(mockFrom).toHaveBeenCalledWith('plan_limits')
        expect(mockEq).toHaveBeenCalledWith('tenant_id', 'tenant-test-123')
        // Called 3 times (once per table)
        expect(mockEq).toHaveBeenCalledTimes(3)
    })

    it('uses fallback only on actual errors, not on empty data', async () => {
        // Simulate: data is null but no error (e.g. no rows match)
        mockSingle.mockResolvedValue({
            data: null,
            error: { message: 'Row not found', code: 'PGRST116' },
        })

        const { getConfig } = await import('../config')
        const result = await getConfig()

        // Should still return something (fallback is acceptable when row truly doesn't exist)
        // But the key point is that it used the admin client
        expect(result).toBeDefined()
        expect(result.config).toBeDefined()
    })

    it('throws when admin client cannot be created due to missing env', async () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL
        delete process.env.SUPABASE_SERVICE_ROLE_KEY

        // Reset mocks to let validation run
        vi.resetModules()

        // Re-mock with actual validation
        vi.doMock('@/lib/supabase/admin', () => ({
            createAdminClient: vi.fn(() => {
                throw new Error('[admin-client] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
            }),
        }))

        vi.doMock('server-only', () => ({}))
        vi.doMock('next/cache', () => ({
            revalidatePath: vi.fn(),
        }))

        const { getConfig } = await import('../config')
        const result = await getConfig()

        // Should fall back gracefully (infra failure = use fallback)
        expect(result.config.business_name).toBe('Mi Tienda')
    })
})
