import { describe, expect, it } from 'vitest'

import { seedCatalog } from '../seeders/seed-catalog'
import type { IndustryTemplate } from '../types'

const template: IndustryTemplate = {
    id: 'test',
    name: 'Test',
    industry: 'Test',
    description: 'Test',
    emoji: 'T',
    currency: 'eur',
    country: 'es',
    regionName: 'Europe',
    timezone: 'Europe/Madrid',
    countryPrefix: '+34',
    categories: [{ name: 'Fruit', handle: 'fruit' }],
    products: [{
        title: 'Naranjas',
        handle: 'naranjas',
        description: 'Fresh oranges',
        category: 'fruit',
        variants: [{ title: '1kg', sku: 'NAR-1KG', prices: [{ amount: 100, currency_code: 'eur' }] }],
    }],
    customers: [],
    orderPattern: { count: 0, daysSpread: 0, statusDistribution: {}, itemsPerOrder: [0, 0], quantityPerItem: [0, 0] },
    governance: { modules: [], flagOverrides: {}, limitOverrides: {}, storeConfig: {} },
}

describe('seedCatalog', () => {
    it('fails the template apply when products cannot be created', async () => {
        const client = {
            getCategories: async () => [],
            getProducts: async () => [],
            request: async (endpoint: string) => {
                if (endpoint === '/admin/product-categories') return { product_category: { id: 'pcat_1' } }
                if (endpoint === '/admin/products') throw new Error('Inventory item with sku: NAR-1KG, already exists.')
                return {}
            },
        }

        await expect(seedCatalog(client as never, template, 'sc_1', 'sp_1', () => {}))
            .rejects
            .toThrow(/Product seed failed/)
    })

    it('creates sellable variants by default when the template does not opt into inventory management', async () => {
        const productBodies: Array<Record<string, any>> = []
        const client = {
            getCategories: async () => [{ id: 'pcat_1', handle: 'fruit', name: 'Fruit' }],
            getProducts: async () => [],
            request: async (endpoint: string, options?: { body?: Record<string, any> }) => {
                if (endpoint === '/admin/products') {
                    productBodies.push(options?.body ?? {})
                    return { product: { id: 'prod_1', variants: [{ id: 'var_1' }] } }
                }
                return {}
            },
        }

        await seedCatalog(client as never, template, 'sc_1', 'sp_1', () => {})

        expect(productBodies[0]?.variants).toEqual([
            expect.objectContaining({ manage_inventory: false }),
        ])
    })

    it('binds created products to the provisioned shipping profile', async () => {
        const productBodies: Array<Record<string, any>> = []
        const client = {
            getCategories: async () => [{ id: 'pcat_1', handle: 'fruit', name: 'Fruit' }],
            getProducts: async () => [],
            request: async (endpoint: string, options?: { body?: Record<string, any> }) => {
                if (endpoint === '/admin/products') {
                    productBodies.push(options?.body ?? {})
                    return { product: { id: 'prod_1', variants: [{ id: 'var_1' }] } }
                }
                return {}
            },
        }

        await seedCatalog(client as never, template, 'sc_1', 'sp_1', () => {})

        expect(productBodies[0]).toMatchObject({
            shipping_profile_id: 'sp_1',
        })
    })
})
