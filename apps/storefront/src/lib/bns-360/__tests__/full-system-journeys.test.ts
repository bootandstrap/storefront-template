import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    addToCart: vi.fn(),
    adminFetch: vi.fn(),
    authenticatedMedusaFetch: vi.fn(),
    confirmBns360CanaryCustomerAuthUser: vi.fn(),
    createBns360CanaryCustomerAuthUser: vi.fn(),
    createAuthAddress: vi.fn(),
    createCart: vi.fn(),
    deleteAuthAddress: vi.fn(),
    executeFullBackup: vi.fn(),
    getAdminCustomers: vi.fn(),
    downloadBackup: vi.fn(),
    getAdminOrders: vi.fn(),
    getAuthCustomerOrders: vi.fn(),
    getProducts: vi.fn(),
    getTenantMedusaScope: vi.fn(),
    getTenantSlug: vi.fn(),
    orderBelongsToScope: vi.fn(),
    remove: vi.fn(),
    setCartAddress: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    submitCODOrder: vi.fn(),
    updateAuthAddress: vi.fn(),
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

vi.mock('@/lib/medusa/admin', () => ({
    adminFetch: mocks.adminFetch,
    getAdminCustomers: mocks.getAdminCustomers,
    getAdminOrders: mocks.getAdminOrders,
    orderBelongsToScope: mocks.orderBelongsToScope,
}))

vi.mock('@/lib/medusa/auth-medusa', () => ({
    authenticatedMedusaFetch: mocks.authenticatedMedusaFetch,
    createAuthAddress: mocks.createAuthAddress,
    deleteAuthAddress: mocks.deleteAuthAddress,
    getAuthCustomerOrders: mocks.getAuthCustomerOrders,
    updateAuthAddress: mocks.updateAuthAddress,
}))

vi.mock('@/lib/bns-360/customer-auth-admin', () => ({
    confirmBns360CanaryCustomerAuthUser: mocks.confirmBns360CanaryCustomerAuthUser,
    createBns360CanaryCustomerAuthUser: mocks.createBns360CanaryCustomerAuthUser,
}))

vi.mock('@/lib/supabase/server', () => ({
    createClient: () => ({
        auth: {
            signUp: mocks.signUp,
            signInWithPassword: mocks.signInWithPassword,
            signOut: mocks.signOut,
        },
    }),
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

function mockCheckoutDefaults() {
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
}

function mockCustomerAccountDefaults() {
    mocks.signUp.mockResolvedValue({ data: { user: { id: 'auth_customer_1' } }, error: null })
    mocks.createBns360CanaryCustomerAuthUser.mockResolvedValue('auth_customer_1')
    mocks.signInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'redacted-test-token' } },
        error: null,
    })
    mocks.confirmBns360CanaryCustomerAuthUser.mockResolvedValue(undefined)
    mocks.signOut.mockResolvedValue({ error: null })
    mocks.authenticatedMedusaFetch.mockResolvedValue({
        customer: {
            id: 'cus_1',
            email: 'bns360-customer+run-1@bootandstrap.com',
        },
    })
    mocks.createAuthAddress.mockResolvedValue({
        id: 'addr_1',
        first_name: 'BNS',
        last_name: '360',
        city: 'Valencia',
        country_code: 'es',
    })
    mocks.updateAuthAddress.mockResolvedValue({
        id: 'addr_1',
        first_name: 'BNS',
        last_name: '360',
        city: 'Madrid',
        country_code: 'es',
    })
    mocks.deleteAuthAddress.mockResolvedValue(undefined)
    mocks.getAuthCustomerOrders.mockResolvedValue({ orders: [], count: 0, offset: 0, limit: 10 })
    mocks.getAdminCustomers.mockResolvedValue({
        customers: [{ id: 'cus_1', email: 'bns360-customer+run-1@bootandstrap.com' }],
        count: 1,
    })
    mocks.adminFetch.mockResolvedValue({ data: { id: 'cus_1', deleted: true }, error: null })
    mocks.getAdminOrders.mockResolvedValue({
        orders: [mockTenantOrder()],
        count: 1,
    })
    mocks.orderBelongsToScope.mockReturnValue(true)
}

function mockTenantOrder() {
    return {
        id: 'order_1',
        display_id: 1001,
        status: 'pending',
        email: 'bns360-checkout+run-1@bootandstrap.test',
        total: 1000,
        currency_code: 'eur',
        created_at: '2026-07-18T11:40:00.000Z',
        sales_channel_id: 'sc_1',
        metadata: { tenant_id: 'tenant-1' },
        items: [],
        fulfillments: [],
        payments: [],
        fulfillment_status: 'not_fulfilled',
        payment_status: 'captured',
        subtotal: 1000,
        tax_total: 0,
        shipping_total: 0,
        discount_total: 0,
        shipping_address: null,
        updated_at: '2026-07-18T11:40:00.000Z',
    }
}

function mockBackupDefaults() {
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
}

describe('BNS 360 full-system journeys', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.getTenantSlug.mockResolvedValue('tenant-slug')
        mocks.getTenantMedusaScope.mockResolvedValue({
            tenantId: 'tenant-1',
            medusaUrl: 'https://medusa.example.com',
            medusaSalesChannelId: 'sc_1',
        })
        mockCheckoutDefaults()
        mockCustomerAccountDefaults()
        mockBackupDefaults()
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

    it('verifies customer auth, address CRUD and tenant-scoped order read without leaking secrets', async () => {
        const result = await runBns360CustomerAccountPrimaryJourney({ tenantId: 'tenant-1', runId: 'run-1' })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.customer-account-primary/v1',
            status: 'verified',
            runtime: {
                customer: { canaryCreated: true, authenticated: true },
                address: { created: true, updated: true, deleted: true },
                orderRead: { tenantScoped: true, orderCountReadable: true },
                crossTenantLeakage: false,
            },
            cleanup: { status: 'verified' },
            residue: { zero: true },
        })
        expect(result.error).toBeUndefined()
        expect(mocks.createBns360CanaryCustomerAuthUser).toHaveBeenCalledWith(expect.objectContaining({
            email: 'bns360-customer+run-1@bootandstrap.com',
            tenantId: 'tenant-1',
            fullName: 'BNS 360 Customer',
        }))
        expect(mocks.signUp).not.toHaveBeenCalled()
        expect(mocks.signInWithPassword).toHaveBeenCalledWith(expect.objectContaining({
            email: 'bns360-customer+run-1@bootandstrap.com',
        }))
        expect(mocks.authenticatedMedusaFetch).toHaveBeenCalledWith('/store/customers', expect.objectContaining({
            method: 'POST',
        }))
        expect(mocks.createAuthAddress).toHaveBeenCalledWith(expect.objectContaining({
            address_1: 'BNS 360 Customer 1',
            country_code: 'es',
        }))
        expect(mocks.updateAuthAddress).toHaveBeenCalledWith('addr_1', expect.objectContaining({
            city: 'Madrid',
        }))
        expect(mocks.deleteAuthAddress).toHaveBeenCalledWith('addr_1')
        expect(mocks.getAuthCustomerOrders).toHaveBeenCalledWith({ limit: 10 })
        expect(mocks.getAdminOrders).toHaveBeenCalledWith({ limit: 10 }, expect.objectContaining({
            medusaSalesChannelId: 'sc_1',
        }))
        expect(mocks.getAdminCustomers).toHaveBeenCalledWith({ limit: 10, q: 'bns360-customer+run-1@bootandstrap.com' }, expect.objectContaining({
            medusaSalesChannelId: 'sc_1',
        }))
        expect(mocks.adminFetch).toHaveBeenCalledWith('/admin/customers/cus_1', { method: 'DELETE' }, expect.objectContaining({
            medusaSalesChannelId: 'sc_1',
        }))
        expect(mocks.orderBelongsToScope).toHaveBeenCalled()
        expect(mocks.signOut).toHaveBeenCalled()
        expect(JSON.stringify(result)).not.toContain('redacted-test-token')
        expect(JSON.stringify(result)).not.toContain('password')
        expect(JSON.stringify(result)).not.toContain('token')
    })

    it('creates the canary customer through Auth Admin without sending signup email', async () => {
        const result = await runBns360CustomerAccountPrimaryJourney({ tenantId: 'tenant-1', runId: 'run-1' })

        expect(result.status).toBe('verified')
        expect(mocks.createBns360CanaryCustomerAuthUser).toHaveBeenCalledWith(expect.objectContaining({
            email: 'bns360-customer+run-1@bootandstrap.com',
            tenantId: 'tenant-1',
            fullName: 'BNS 360 Customer',
            password: expect.any(String),
        }))
        expect(mocks.signUp).not.toHaveBeenCalled()
    })

    it('confirms the canary customer when production Supabase requires email confirmation', async () => {
        mocks.signInWithPassword
            .mockResolvedValueOnce({ data: null, error: { message: 'Email not confirmed' } })
            .mockResolvedValueOnce({
                data: { session: { access_token: 'redacted-test-token' } },
                error: null,
            })

        const result = await runBns360CustomerAccountPrimaryJourney({ tenantId: 'tenant-1', runId: 'run-1' })

        expect(result.status).toBe('verified')
        expect(result.runtime.customer.authenticated).toBe(true)
        expect(mocks.signInWithPassword).toHaveBeenCalledTimes(2)
        expect(mocks.confirmBns360CanaryCustomerAuthUser).toHaveBeenCalledWith(
            'auth_customer_1',
            'bns360-customer+run-1@bootandstrap.com',
        )
        expect(mocks.signInWithPassword).toHaveBeenNthCalledWith(2, expect.objectContaining({
            email: 'bns360-customer+run-1@bootandstrap.com',
        }))
        expect(JSON.stringify(result)).not.toContain('redacted-test-token')
        expect(JSON.stringify(result)).not.toContain('password')
        expect(JSON.stringify(result)).not.toContain('token')
    })

    it('verifies order lifecycle through COD simulator order placement and read-only boundaries', async () => {
        mocks.getAdminOrders.mockResolvedValue({
            orders: [{
                ...mockTenantOrder(),
                email: 'bns360-checkout+run-1@bootandstrap.test',
                payments: [{
                    id: 'pay_1',
                    provider_id: 'pp_system_default',
                    amount: 1000,
                    currency_code: 'eur',
                }],
            }],
            count: 1,
        })

        const result = await runBns360OrderLifecyclePrimaryJourney({ tenantId: 'tenant-1', runId: 'run-1' })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.order-lifecycle-primary/v1',
            status: 'verified',
            runtime: {
                orderPlaced: true,
                paymentCollectionLinked: true,
                fulfillmentBoundary: 'verified',
                cancelBoundary: 'verified',
                refundReturnBoundary: 'verified',
                subscriberEvents: {
                    orderPlaced: true,
                    analyticsRecorded: true,
                },
            },
            cleanup: { status: 'verified' },
            residue: { zero: true },
        })
        expect(result.error).toBeUndefined()
        expect(mocks.submitCODOrder).toHaveBeenCalledWith('cart_1', expect.objectContaining({
            email: 'bns360-checkout+run-1@bootandstrap.test',
            notes: 'BNS 360 functional checkout simulator. No real payment.',
        }))
        expect(mocks.getAdminOrders).toHaveBeenCalledWith({
            limit: 25,
            q: 'bns360-checkout+run-1@bootandstrap.test',
        }, expect.objectContaining({
            medusaSalesChannelId: 'sc_1',
        }))
        expect(mocks.orderBelongsToScope).toHaveBeenCalledWith(expect.objectContaining({
            id: 'order_1',
        }), expect.objectContaining({
            medusaSalesChannelId: 'sc_1',
        }))
        expect(mocks.adminFetch).not.toHaveBeenCalled()
        expect(JSON.stringify(result)).not.toContain('client_secret')
        expect(JSON.stringify(result)).not.toContain('password')
        expect(JSON.stringify(result)).not.toContain('token')
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
            expect.objectContaining({ medusaUrl: 'https://medusa.example.com' }),
        )
        expect(mocks.downloadBackup).toHaveBeenCalledWith('tenant-slug/2026-07-18T11-34-00_full.json.gz')
        expect(mocks.remove).toHaveBeenCalledWith(['tenant-slug/2026-07-18T11-34-00_full.json.gz'])
        expect(JSON.stringify(result)).not.toContain('client_secret')
        expect(JSON.stringify(result)).not.toContain('password')
        expect(JSON.stringify(result)).not.toContain('token')
    })
})
