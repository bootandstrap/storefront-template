import { describe, expect, it } from 'vitest'
import { resolveTenantContext } from '@bootandstrap/tenant-context'

describe('resolveTenantContext', () => {
    it('prefers auth-scoped profile tenant for owner users', () => {
        const context = resolveTenantContext({
            profileRole: 'owner',
            profileTenantId: 'tenant-profile',
            envTenantId: 'tenant-env',
            ownerExperienceMode: 'starter_collaborative',
        })

        expect(context.role).toBe('owner')
        expect(context.isPanelRole).toBe(true)
        expect(context.tenantId).toBe('tenant-profile')
        expect(context.ownerExperienceMode).toBe('starter_collaborative')
        expect(context.defaultPostLoginPath).toBe('/panel')
    })

    it('falls back to env tenant only for super_admin panel contexts', () => {
        const context = resolveTenantContext({
            metadataRole: 'super_admin',
            envTenantId: 'tenant-env',
        })

        expect(context.role).toBe('super_admin')
        expect(context.isPanelRole).toBe(true)
        expect(context.tenantId).toBe('tenant-env')
        expect(context.defaultPostLoginPath).toBe('/panel')
    })

    it('preserves auth-scoped tenant identity for non-panel actors while keeping them on cuenta', () => {
        const context = resolveTenantContext({
            profileRole: 'customer',
            profileTenantId: 'tenant-profile',
            envTenantId: 'tenant-env',
            ownerExperienceMode: 'starter_collaborative',
        })

        expect(context.role).toBe('customer')
        expect(context.isPanelRole).toBe(false)
        expect(context.tenantId).toBe('tenant-profile')
        expect(context.ownerExperienceMode).toBe('starter_collaborative')
        expect(context.defaultPostLoginPath).toBe('/cuenta')
    })
})
