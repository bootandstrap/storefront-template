import { describe, expect, it } from 'vitest'

import {
    runBns360BackupRestorePrimaryJourney,
    runBns360CheckoutPrimaryJourney,
    runBns360CustomerAccountPrimaryJourney,
    runBns360OrderLifecyclePrimaryJourney,
} from '../full-system-journeys'

describe('BNS 360 full-system journeys', () => {
    it('verifies checkout PaymentCollection semantics without live money movement', async () => {
        const result = await runBns360CheckoutPrimaryJourney({ tenantId: 'tenant-1', runId: 'run-1' })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.checkout-primary/v1',
            status: 'verified',
            runtime: {
                cart: { created: true, itemAttached: true },
                paymentCollection: {
                    status: 'verified',
                    providerMode: 'simulator',
                    liveMutation: false,
                },
                order: { completed: true },
            },
            cleanup: { status: 'verified' },
            residue: { zero: true },
        })
        expect(JSON.stringify(result)).not.toContain('client_secret')
        expect(JSON.stringify(result)).not.toContain('password')
        expect(JSON.stringify(result)).not.toContain('token')
    })

    it('verifies customer auth/address/order scope without cross-tenant leakage', async () => {
        const result = await runBns360CustomerAccountPrimaryJourney({ tenantId: 'tenant-1', runId: 'run-1' })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.customer-account-primary/v1',
            status: 'verified',
            runtime: {
                customer: { canaryCreated: true, authenticated: true },
                address: { created: true, updated: true, deleted: true },
                orderRead: { tenantScoped: true },
                crossTenantLeakage: false,
            },
            cleanup: { status: 'verified' },
            residue: { zero: true },
        })
    })

    it('verifies order lifecycle boundaries with simulator payment evidence', async () => {
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
    })

    it('verifies backup metadata and restore dry-run safety without mutating tenant data', async () => {
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
    })
})
