import { describe, expect, it } from 'vitest'
import {
    buildScopedAdminHeaders,
    buildScopedAdminPath,
    orderBelongsToScope,
    type AdminOrderFull,
} from '../admin'

describe('admin tenant scoping helpers', () => {
    const scope = {
        tenantId: 'tenant-abc',
        medusaSalesChannelId: 'sc_abc',
    }

    it('returns path unchanged when scope is missing (graceful degradation)', () => {
        const result = buildScopedAdminPath('/admin/products?limit=20', undefined as never)
        expect(result).toBe('/admin/products?limit=20')
    })

    it('injects sales_channel_id in list endpoints', () => {
        const scoped = buildScopedAdminPath('/admin/products?limit=20&offset=40', scope)

        expect(scoped).toContain('/admin/products?')
        expect(scoped).toContain('limit=20')
        expect(scoped).toContain('offset=40')
        expect(scoped).toContain('sales_channel_id=sc_abc')
    })

    it('adds tenant scope headers to every request', () => {
        const headers = buildScopedAdminHeaders(scope)
        expect(headers).toEqual({
            'x-tenant-id': 'tenant-abc',
            'x-medusa-sales-channel-id': 'sc_abc',
        })
    })

    it('considers an order owned when metadata tenant_id matches', () => {
        const order = {
            metadata: { tenant_id: 'tenant-abc' },
        } as Pick<AdminOrderFull, 'sales_channel_id' | 'metadata'>

        expect(orderBelongsToScope(order, scope)).toBe(true)
    })

    it('fails closed when order has no tenant signals', () => {
        const order = {
            metadata: null,
            sales_channel_id: null,
        } as Pick<AdminOrderFull, 'sales_channel_id' | 'metadata'>

        expect(orderBelongsToScope(order, scope)).toBe(false)
    })
})
