import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    addToCart: vi.fn(),
    createCart: vi.fn(),
    executeFullBackup: vi.fn(),
    downloadBackup: vi.fn(),
    getProducts: vi.fn(),
    getTenantMedusaScope: vi.fn(),
    getTenantSlug: vi.fn(),
    remove: vi.fn(),
    setCartAddress: vi.fn(),
    submitCODOrder: vi.fn(),
}))

import {
    runBns360BackupRestorePrimaryJourney,
    runBns360CheckoutPrimaryJourney,
    runBns360CustomerAccountPrimaryJourney,
    runBns360OrderLifecyclePrimaryJourney,
} from '../full-system-journeys'

vi.mock('@/lib/backup/backup-executor', () => ({
    executeFullBackup: mocks.executeFullBackup,
}))

vi.mock('@/lib/backup/backup-restore', () => ({
    downloadBackup: mocks.downloadBackup,
}))

vi.mock('@/lib/backup/tenant-slug', () => ({
    getTenantSlug: mocks.getTenantSlug,
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: mocks.getTenantMedusaScope,
}))

vi.mock('@/lib/supabase/storage-admin', () => ({
    createStorageAdminClient: () => ({
        storage: {
            from: () => ({
                remove: mocks.remove,
            }),
        },
    }),
}))

vi.mock('@/lib/medusa/client', () => ({
    addToCart: mocks.addToCart,
    createCart: mocks.createCart,
    getProducts: mocks.getProducts,
}))

vi.mock('@/app/[lang]/(shop)/checkout/checkout-shipping', () => ({
    setCartAddress: mocks.setCartAddress,
}))

vi.mock('@/app/[lang]/(shop)/checkout/checkout-orders', () => ({
    submitCODOrder: mocks.submitCODOrder,
}))

describe('BNS 360 full-system journeys', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.getProducts.mockResolvedValue({
            products: [{
                id: 'prod_1',
                title: 'QA Product',
                status: 'published',
                variants: [{ id: 'variant_1' }],
            }],
        })
        mocks.createCart.mockResolvedValue({ id: 'cart_1', items: [] })
        mocks.addToCart.mockResolvedValue({ id: 'cart_1', items: [{ id: 'line_1' }] })
        mocks.setCartAddress.mockResolvedValue({ success: true })
        mocks.submitCODOrder.mockResolvedValue({
            order: {
                id: 'order_1',
                display_id: 1001,
                status: 'pending',
                email: 'bns360-checkout+run-1@bootandstrap.test',
            },
        })
        mocks.getTenantSlug.mockResolvedValue('tenant-slug')
        mocks.getTenantMedusaScope.mockResolvedValue({ medusaUrl: 'https://medusa.example.com' })
        mocks.executeFullBackup.mockResolvedValue({
            success: true,
            backup_key: 'tenant-slug/2026-07-18T11-34-00_full.json.gz',
            size_bytes: 512,
            duration_ms: 25,
            stats: {
                products_count: 1,
                orders_count: 0,
                customers_count: 0,
                categories_count: 1,
                promotions_count: 0,
                inventory_count: 0,
                total_size_bytes: 512,
                duration_ms: 25,
            },
        })
        mocks.downloadBackup.mockResolvedValue({
            version: '1.0',
            tenant_id: 'tenant-1',
            tenant_slug: 'tenant-slug',
            created_at: '2026-07-18T11:34:00.000Z',
            type: 'full',
            data: {
                products: [{ id: 'prod_1' }],
                orders: [],
                customers: [],
                categories: [{ id: 'cat_1' }],
                promotions: [],
                inventory: [],
                governance: {},
            },
            stats: {
                products_count: 1,
                orders_count: 0,
                customers_count: 0,
                categories_count: 1,
                promotions_count: 0,
                inventory_count: 0,
                total_size_bytes: 512,
                duration_ms: 25,
            },
            checksums: { products: 'hash', categories: 'hash' },
        })
        mocks.remove.mockResolvedValue({ data: [{ name: 'tenant-slug/2026-07-18T11-34-00_full.json.gz' }], error: null })
    })

    it('verifies checkout, simulator PaymentCollection and order completion without live mutation', async () => {
        const result = await runBns360CheckoutPrimaryJourney({ tenantId: 'tenant-1', runId: 'run-1' })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.checkout-primary/v1',
            status: 'verified',
            runtime: {
                cart: { created: true, itemAttached: true },
                paymentCollection: {
                    status: 'verified',
                    providerMode: 'simulator',
                    paymentSessionInitialized: true,
                    liveMutation: false,
                },
                order: { completed: true, resultType: 'order' },
            },
            cleanup: { status: 'verified' },
            residue: { zero: true },
        })
        expect(result.error).toBeUndefined()
        expect(mocks.getProducts).toHaveBeenCalledWith({ limit: 20 })
        expect(mocks.createCart).toHaveBeenCalled()
        expect(mocks.addToCart).toHaveBeenCalledWith('cart_1', 'variant_1', 1)
        expect(mocks.setCartAddress).toHaveBeenCalledWith('cart_1', expect.objectContaining({
            address_1: 'BNS 360 Simulator 1',
            country_code: 'es',
        }))
        expect(mocks.submitCODOrder).toHaveBeenCalledWith('cart_1', expect.objectContaining({
            email: 'bns360-checkout+run-1@bootandstrap.test',
        }))
        expect(JSON.stringify(result)).not.toContain('client_secret')
        expect(JSON.stringify(result)).not.toContain('password')
        expect(JSON.stringify(result)).not.toContain('token')
    })

    it('blocks customer auth/address/order certification when no runtime runner is wired', async () => {
        const result = await runBns360CustomerAccountPrimaryJourney({ tenantId: 'tenant-1', runId: 'run-1' })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.customer-account-primary/v1',
            status: 'blocked',
            runtime: {
                customer: { canaryCreated: false, authenticated: false },
                address: { created: false, updated: false, deleted: false },
                orderRead: { tenantScoped: false },
                crossTenantLeakage: false,
            },
            cleanup: { status: 'failed' },
            residue: { zero: true },
        })
        expect(result.error).toContain('not wired')
    })

    it('blocks order lifecycle certification when no runtime runner is wired', async () => {
        const result = await runBns360OrderLifecyclePrimaryJourney({ tenantId: 'tenant-1', runId: 'run-1' })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.order-lifecycle-primary/v1',
            status: 'blocked',
            runtime: {
                orderPlaced: false,
                paymentCollectionLinked: false,
                fulfillmentBoundary: 'blocked',
                cancelBoundary: 'blocked',
                refundReturnBoundary: 'blocked',
                subscriberEvents: {
                    orderPlaced: false,
                    analyticsRecorded: false,
                },
            },
            cleanup: { status: 'failed' },
            residue: { zero: true },
        })
        expect(result.error).toContain('not wired')
    })

    it('verifies backup metadata and restore dry-run without mutating tenant data', async () => {
        const result = await runBns360BackupRestorePrimaryJourney({ tenantId: 'tenant-1', runId: 'run-1' })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.backup-restore-primary/v1',
            status: 'verified',
            runtime: {
                backup: { metadataReadable: true, payloadRedacted: true },
                restoreDryRun: { safe: true, mutation: false },
            },
            cleanup: { status: 'verified' },
            residue: { zero: true },
        })
        expect(result.error).toBeUndefined()
        expect(mocks.executeFullBackup).toHaveBeenCalledWith(
            'tenant-1',
            'tenant-slug',
            { medusaUrl: 'https://medusa.example.com' },
        )
        expect(mocks.downloadBackup).toHaveBeenCalledWith('tenant-slug/2026-07-18T11-34-00_full.json.gz')
        expect(mocks.remove).toHaveBeenCalledWith(['tenant-slug/2026-07-18T11-34-00_full.json.gz'])
        expect(JSON.stringify(result)).not.toContain('client_secret')
        expect(JSON.stringify(result)).not.toContain('password')
        expect(JSON.stringify(result)).not.toContain('token')
    })
})
