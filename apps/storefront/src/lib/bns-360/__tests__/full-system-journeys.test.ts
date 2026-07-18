import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    executeFullBackup: vi.fn(),
    downloadBackup: vi.fn(),
    getTenantMedusaScope: vi.fn(),
    getTenantSlug: vi.fn(),
    remove: vi.fn(),
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

describe('BNS 360 full-system journeys', () => {
    beforeEach(() => {
        vi.clearAllMocks()
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

    it('blocks checkout PaymentCollection certification when no runtime runner is wired', async () => {
        const result = await runBns360CheckoutPrimaryJourney({ tenantId: 'tenant-1', runId: 'run-1' })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.checkout-primary/v1',
            status: 'blocked',
            runtime: {
                cart: { created: false, itemAttached: false },
                paymentCollection: {
                    status: 'blocked',
                    providerMode: 'simulator',
                    paymentSessionInitialized: false,
                    liveMutation: false,
                },
                order: { completed: false },
            },
            cleanup: { status: 'failed' },
            residue: { zero: true },
        })
        expect(result.error).toContain('not wired')
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
