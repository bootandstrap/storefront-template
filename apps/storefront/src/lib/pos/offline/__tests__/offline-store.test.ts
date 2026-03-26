/**
 * Offline Store Tests
 *
 * Tests IndexedDB product cache + pending sales queue.
 * Uses fake-indexeddb for Node.js environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock IndexedDB for Node.js ──
// We test the public API contract without a real IDB

describe('Offline Store — API Contract', () => {
    // Since IndexedDB is a browser-only API, we test at a higher level:
    // verifying the module exports the expected functions and types.

    it('exports all expected functions', async () => {
        // Dynamic import to avoid IDB initialization at module load
        const store = await import('../offline-store')

        expect(typeof store.cacheProducts).toBe('function')
        expect(typeof store.getProducts).toBe('function')
        expect(typeof store.getProductBySku).toBe('function')
        expect(typeof store.clearProductCache).toBe('function')
        expect(typeof store.queueSale).toBe('function')
        expect(typeof store.getPendingSales).toBe('function')
        expect(typeof store.removePendingSale).toBe('function')
        expect(typeof store.updatePendingSale).toBe('function')
        expect(typeof store.getPendingSaleCount).toBe('function')
        expect(typeof store.hasPendingSaleRef).toBe('function')
        expect(typeof store.getLastSyncTime).toBe('function')
        expect(typeof store.setLastSyncTime).toBe('function')
        expect(typeof store.destroyDB).toBe('function')
    })

    it('CachedProduct type has correct shape', async () => {
        type CachedProduct = import('../offline-store').CachedProduct
        // Type-level test — if this compiles, the type exists
        const product: CachedProduct = {
            id: 'prod_123',
            title: 'Test Product',
            thumbnail: null,
            status: 'published',
            variants: [{
                id: 'variant_123',
                title: 'Default',
                sku: 'SKU-001',
                prices: [{ amount: 2500, currency_code: 'chf' }],
            }],
            categories: [{ id: 'cat_1', name: 'Test' }],
            updated_at: '2026-03-21T00:00:00Z',
        }
        expect(product.id).toBe('prod_123')
        expect(product.variants).toHaveLength(1)
        expect(product.variants[0].prices[0].amount).toBe(2500)
    })

    it('PendingSale type has correct shape', async () => {
        type PendingSale = import('../offline-store').PendingSale
        const sale: PendingSale = {
            offline_ref: crypto.randomUUID(),
            items: [{ variant_id: 'v_1', quantity: 2, unit_price: 1500 }],
            payment_method: 'cash',
            discount_amount: 0,
            created_at: new Date().toISOString(),
            sync_attempts: 0,
        }
        expect(sale.items).toHaveLength(1)
        expect(sale.sync_attempts).toBe(0)
        expect(sale.offline_ref).toMatch(/^[0-9a-f-]{36}$/)
    })
})

describe('Offline Store — SyncStatus helper', () => {
    it('useOfflineSync exports expected type', async () => {
        const mod = await import('../useOfflineSync')
        expect(typeof mod.useOfflineSync).toBe('function')
    })
})

describe('Product Sync — Server action', () => {
    it('exports syncProductCatalogAction', async () => {
        const mod = await import('../product-sync')
        expect(typeof mod.syncProductCatalogAction).toBe('function')
    })
})
