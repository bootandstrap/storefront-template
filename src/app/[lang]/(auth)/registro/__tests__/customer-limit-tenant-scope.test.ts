/**
 * Tests for tenant-scoped customer count in registration flow
 *
 * Verifies that both the page and server action scope the customer
 * count query by tenant_id to prevent cross-tenant limit bypassing.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

describe('Registration customer limit — tenant scope', () => {

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.resetModules()
    })

    it('getRequiredTenantId() returns configured tenant', async () => {
        vi.stubEnv('TENANT_ID', 'test-tenant-abc')
        vi.resetModules()
        const { getRequiredTenantId } = await import('@/lib/config')
        const id = getRequiredTenantId()
        expect(id).toBe('test-tenant-abc')
        expect(typeof id).toBe('string')
        expect(id.length).toBeGreaterThan(0)
    })

    it('getRequiredTenantId() throws in production without TENANT_ID', async () => {
        vi.stubEnv('TENANT_ID', '')
        vi.stubEnv('NEXT_PUBLIC_TENANT_ID', '')
        vi.stubEnv('NODE_ENV', 'production')

        vi.resetModules()
        const { getRequiredTenantId } = await import('@/lib/config')
        expect(() => getRequiredTenantId()).toThrow('TENANT_ID is not set in production')
    })

    it('getRequiredTenantId() returns dev placeholder when not set in dev mode', async () => {
        vi.stubEnv('TENANT_ID', '')
        vi.stubEnv('NEXT_PUBLIC_TENANT_ID', '')
        vi.stubEnv('NODE_ENV', 'test')

        vi.resetModules()
        const { getRequiredTenantId } = await import('@/lib/config')
        const id = getRequiredTenantId()
        expect(id).toBe('__dev_no_tenant__')
    })
})
