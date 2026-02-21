import { describe, expect, it } from 'vitest'
import { assertTenantMedusaScopeRow } from '../tenant-scope'

describe('tenant-scope', () => {
    it('returns normalized scope when row is valid', () => {
        const scope = assertTenantMedusaScopeRow('tenant-1', {
            tenant_id: 'tenant-1',
            medusa_sales_channel_id: 'sc_123',
        })

        expect(scope).toEqual({
            tenantId: 'tenant-1',
            medusaSalesChannelId: 'sc_123',
        })
    })

    it('throws when mapping row is missing', () => {
        expect(() => assertTenantMedusaScopeRow('tenant-1', null)).toThrow(
            'Missing Medusa tenant scope mapping for tenant tenant-1'
        )
    })

    it('throws when row belongs to another tenant', () => {
        expect(() => assertTenantMedusaScopeRow('tenant-1', {
            tenant_id: 'tenant-2',
            medusa_sales_channel_id: 'sc_999',
        })).toThrow('Tenant scope mismatch')
    })

    it('throws when sales channel id is empty', () => {
        expect(() => assertTenantMedusaScopeRow('tenant-1', {
            tenant_id: 'tenant-1',
            medusa_sales_channel_id: '',
        })).toThrow('Invalid Medusa sales channel mapping')
    })
})
