import { describe, expect, it } from 'vitest'

import { deepClean } from '../cleaners'

describe('template engine cleaners', () => {
    it('removes orphan inventory items after deleting products', async () => {
        const calls: string[] = []
        const client = {
            getDraftOrders: async () => [],
            getOrders: async () => [],
            getCarts: async () => [],
            getCustomers: async () => [],
            getProducts: async () => [{ id: 'prod_1' }],
            getInventoryItems: async () => [{ id: 'iitem_1', sku: 'SKU-1' }],
            getCategories: async () => [],
            bulkDelete: async (entity: string, ids: string[]) => {
                calls.push(`${entity}:${ids.join(',')}`)
                return { deleted: ids.length, failed: 0 }
            },
        }

        await deepClean(client as never, () => {})

        expect(calls).toEqual([
            'products:prod_1',
            'inventory-items:iitem_1',
        ])
    })
})
