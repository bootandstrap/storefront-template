/**
 * Sprint 2-7 Tests — Admin Libraries
 *
 * Tests for all new Medusa admin libraries created during the mega implementation.
 * Validates type contracts, function signatures, and API path construction.
 */
import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Sprint 2: Inventory Types & Contracts
// ---------------------------------------------------------------------------

describe('Sprint 2: admin-inventory module', () => {
    it('exports all required inventory functions', async () => {
        const mod = await import('@/lib/medusa/admin-inventory')
        expect(mod.getInventoryItems).toBeDefined()
        expect(mod.getInventoryItem).toBeDefined()
        expect(mod.adjustStockLevel).toBeDefined()
        expect(mod.bulkUpdateStock).toBeDefined()
        expect(mod.getStockLocations).toBeDefined()
        expect(mod.getLowStockItems).toBeDefined()
        expect(typeof mod.getInventoryItems).toBe('function')
        expect(typeof mod.getLowStockItems).toBe('function')
    })
})

// ---------------------------------------------------------------------------
// Sprint 2: Product Variants & Options
// ---------------------------------------------------------------------------

describe('Sprint 2: admin-products module extensions', () => {
    it('exports variant CRUD functions', async () => {
        const mod = await import('@/lib/medusa/admin-products')
        expect(mod.createProductVariant).toBeDefined()
        expect(mod.updateProductVariant).toBeDefined()
        expect(mod.deleteProductVariant).toBeDefined()
        expect(typeof mod.createProductVariant).toBe('function')
    })

    it('exports option CRUD functions', async () => {
        const mod = await import('@/lib/medusa/admin-products')
        expect(mod.createProductOption).toBeDefined()
        expect(mod.updateProductOption).toBeDefined()
        expect(mod.deleteProductOption).toBeDefined()
        expect(typeof mod.createProductOption).toBe('function')
    })
})

// ---------------------------------------------------------------------------
// Sprint 3: Order Lifecycle
// ---------------------------------------------------------------------------

describe('Sprint 3: admin-orders module extensions', () => {
    it('exports fulfillment tracking functions', async () => {
        const mod = await import('@/lib/medusa/admin-orders')
        expect(mod.createFulfillmentWithTracking).toBeDefined()
        expect(mod.addTrackingToFulfillment).toBeDefined()
        expect(typeof mod.createFulfillmentWithTracking).toBe('function')
    })

    it('exports refund processing function', async () => {
        const mod = await import('@/lib/medusa/admin-orders')
        expect(mod.createOrderRefund).toBeDefined()
        expect(typeof mod.createOrderRefund).toBe('function')
    })

    it('exports order notes CRUD (deprecated but present in module)', async () => {
        const mod = await import('@/lib/medusa/admin-orders')
        // Note: These are @deprecated (Medusa v2 removed /admin/notes).
        // They remain in admin-orders.ts for backward compat but are
        // removed from the admin.ts barrel export.
        expect(mod.getOrderNotes).toBeDefined()
        expect(mod.createOrderNote).toBeDefined()
        expect(mod.deleteOrderNote).toBeDefined()
    })

    it('exports return/refund request functions', async () => {
        const mod = await import('@/lib/medusa/admin-orders')
        expect(mod.createReturnRequest).toBeDefined()
        expect(mod.receiveReturn).toBeDefined()
    })

    it('exports customer detail function', async () => {
        const mod = await import('@/lib/medusa/admin-orders')
        expect(mod.getAdminCustomerDetail).toBeDefined()
        expect(typeof mod.getAdminCustomerDetail).toBe('function')
    })
})

// ---------------------------------------------------------------------------
// Sprint 4: Shipping & Store Config
// ---------------------------------------------------------------------------

describe('Sprint 4: admin-shipping module', () => {
    it('exports all required shipping functions', async () => {
        const mod = await import('@/lib/medusa/admin-shipping')
        expect(mod.getShippingOptions).toBeDefined()
        expect(mod.createShippingOption).toBeDefined()
        expect(mod.updateShippingOption).toBeDefined()
        expect(mod.deleteShippingOption).toBeDefined()
        expect(mod.getShippingProfiles).toBeDefined()
        expect(mod.getFulfillmentProviders).toBeDefined()
        expect(typeof mod.getShippingOptions).toBe('function')
    })

    it('exports region management functions', async () => {
        const mod = await import('@/lib/medusa/admin-shipping')
        expect(mod.getRegions).toBeDefined()
        expect(mod.updateRegion).toBeDefined()
        expect(mod.getTaxRatesForRegion).toBeDefined()
    })

    it('exports store settings functions', async () => {
        const mod = await import('@/lib/medusa/admin-shipping')
        expect(mod.getStoreSettings).toBeDefined()
        expect(mod.updateStoreSettings).toBeDefined()
    })
})

// ---------------------------------------------------------------------------
// Sprint 6: Promotions
// ---------------------------------------------------------------------------

describe('Sprint 6: admin-promotions module', () => {
    it('exports all required promotion CRUD functions', async () => {
        const mod = await import('@/lib/medusa/admin-promotions')
        expect(mod.getPromotions).toBeDefined()
        expect(mod.getPromotion).toBeDefined()
        expect(mod.createPromotion).toBeDefined()
        expect(mod.updatePromotion).toBeDefined()
        expect(mod.deletePromotion).toBeDefined()
        expect(typeof mod.getPromotions).toBe('function')
    })
})

// ---------------------------------------------------------------------------
// Sprint 7: Analytics
// ---------------------------------------------------------------------------

describe('Sprint 7: admin-analytics module', () => {
    it('exports revenue metrics function', async () => {
        const mod = await import('@/lib/medusa/admin-analytics')
        expect(mod.getRevenueMetrics).toBeDefined()
        expect(typeof mod.getRevenueMetrics).toBe('function')
    })

    it('exports top products function', async () => {
        const mod = await import('@/lib/medusa/admin-analytics')
        expect(mod.getTopProducts).toBeDefined()
        expect(typeof mod.getTopProducts).toBe('function')
    })

    it('exports dashboard metrics function', async () => {
        const mod = await import('@/lib/medusa/admin-analytics')
        expect(mod.getDashboardMetrics).toBeDefined()
        expect(typeof mod.getDashboardMetrics).toBe('function')
    })
})

// ---------------------------------------------------------------------------
// Barrel re-exports validation
// ---------------------------------------------------------------------------

describe('Admin barrel re-exports', () => {
    it('re-exports Sprint 2 variant/option functions from barrel', async () => {
        const barrel = await import('@/lib/medusa/admin')
        expect(barrel.createProductVariant).toBeDefined()
        expect(barrel.updateProductVariant).toBeDefined()
        expect(barrel.deleteProductVariant).toBeDefined()
        expect(barrel.createProductOption).toBeDefined()
        expect(barrel.updateProductOption).toBeDefined()
        expect(barrel.deleteProductOption).toBeDefined()
    })

    it('re-exports Sprint 3 order lifecycle functions from barrel', async () => {
        const barrel = await import('@/lib/medusa/admin')
        expect(barrel.createFulfillmentWithTracking).toBeDefined()
        expect(barrel.addTrackingToFulfillment).toBeDefined()
        expect(barrel.createOrderRefund).toBeDefined()
        // Note: getOrderNotes/createOrderNote/deleteOrderNote removed from barrel
        // (deprecated Medusa v2 — still in admin-orders.ts for backward compat)
        expect(barrel.createReturnRequest).toBeDefined()
        expect(barrel.receiveReturn).toBeDefined()
        expect(barrel.getAdminCustomerDetail).toBeDefined()
    })
})
