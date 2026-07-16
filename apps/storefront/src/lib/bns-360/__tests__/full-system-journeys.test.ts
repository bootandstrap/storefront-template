import { describe, expect, it } from 'vitest'

import {
    runBns360BackupRestorePrimaryJourney,
    runBns360CheckoutPrimaryJourney,
    runBns360CustomerAccountPrimaryJourney,
    runBns360OrderLifecyclePrimaryJourney,
} from '../full-system-journeys'

describe('BNS 360 full-system journeys', () => {
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

    it('blocks backup metadata and restore certification when no runtime runner is wired', async () => {
        const result = await runBns360BackupRestorePrimaryJourney({ tenantId: 'tenant-1', runId: 'run-1' })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.backup-restore-primary/v1',
            status: 'blocked',
            runtime: {
                backup: { metadataReadable: false, payloadRedacted: true },
                restoreDryRun: { safe: false, mutation: false },
            },
            cleanup: { status: 'failed' },
            residue: { zero: true },
        })
        expect(result.error).toContain('not wired')
    })
})
