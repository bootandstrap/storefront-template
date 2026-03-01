import { describe, expect, it } from 'vitest'
import { shouldPromoteLegacyOwner } from '../legacy-owner-auth'

describe('shouldPromoteLegacyOwner', () => {
    it('promotes when profile is non-panel role and owner email matches tenant owner email', () => {
        expect(
            shouldPromoteLegacyOwner({
                currentRole: 'customer',
                userEmail: 'admin@campifrut.com',
                tenantOwnerEmail: 'admin@campifrut.com',
                profileTenantId: null,
                ownerTenantId: 'tenant-1',
            })
        ).toBe(true)
    })

    it('does not promote if current role already has panel access', () => {
        expect(
            shouldPromoteLegacyOwner({
                currentRole: 'owner',
                userEmail: 'admin@campifrut.com',
                tenantOwnerEmail: 'admin@campifrut.com',
                profileTenantId: 'tenant-1',
                ownerTenantId: 'tenant-1',
            })
        ).toBe(false)
    })

    it('does not promote on tenant mismatch', () => {
        expect(
            shouldPromoteLegacyOwner({
                currentRole: 'customer',
                userEmail: 'admin@campifrut.com',
                tenantOwnerEmail: 'admin@campifrut.com',
                profileTenantId: 'tenant-2',
                ownerTenantId: 'tenant-1',
            })
        ).toBe(false)
    })

    it('does not promote when email does not match tenant owner', () => {
        expect(
            shouldPromoteLegacyOwner({
                currentRole: 'customer',
                userEmail: 'admin@campifrut.com',
                tenantOwnerEmail: 'owner@campifrut.com',
                profileTenantId: 'tenant-1',
                ownerTenantId: 'tenant-1',
            })
        ).toBe(false)
    })
})
