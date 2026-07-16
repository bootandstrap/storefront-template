import { randomUUID } from 'node:crypto'

type JourneyStatus = 'verified' | 'blocked'

interface Bns360JourneyInput {
    tenantId: string
    runId?: string
}

interface Bns360JourneyBase {
    status: JourneyStatus
    runId: string
    tenantRef: string
    generatedAt: string
    cleanup: {
        status: 'verified' | 'failed'
    }
    residue: {
        zero: boolean
    }
    error?: string
}

export interface Bns360CheckoutPrimaryJourneyResult extends Bns360JourneyBase {
    schema: 'bootandstrap.template.bns-360.checkout-primary/v1'
    runtime: {
        cart: {
            created: boolean
            itemAttached: boolean
        }
        paymentCollection: {
            status: JourneyStatus
            providerMode: 'simulator'
            paymentSessionInitialized: boolean
            liveMutation: boolean
        }
        order: {
            completed: boolean
            resultType: 'order'
        }
    }
}

export interface Bns360CustomerAccountPrimaryJourneyResult extends Bns360JourneyBase {
    schema: 'bootandstrap.template.bns-360.customer-account-primary/v1'
    runtime: {
        customer: {
            canaryCreated: boolean
            authenticated: boolean
        }
        address: {
            created: boolean
            updated: boolean
            deleted: boolean
        }
        orderRead: {
            tenantScoped: boolean
            orderCountReadable: boolean
        }
        crossTenantLeakage: boolean
    }
}

export interface Bns360OrderLifecyclePrimaryJourneyResult extends Bns360JourneyBase {
    schema: 'bootandstrap.template.bns-360.order-lifecycle-primary/v1'
    runtime: {
        orderPlaced: boolean
        paymentCollectionLinked: boolean
        fulfillmentBoundary: JourneyStatus
        cancelBoundary: JourneyStatus
        refundReturnBoundary: JourneyStatus
        subscriberEvents: {
            orderPlaced: boolean
            analyticsRecorded: boolean
        }
    }
}

export interface Bns360BackupRestorePrimaryJourneyResult extends Bns360JourneyBase {
    schema: 'bootandstrap.template.bns-360.backup-restore-primary/v1'
    runtime: {
        backup: {
            metadataReadable: boolean
            payloadRedacted: boolean
        }
        restoreDryRun: {
            safe: boolean
            mutation: boolean
        }
    }
}

function resolveRunId(prefix: string, runId?: string): string {
    return runId ?? `${prefix}-${Date.now()}-${randomUUID()}`
}

function baseResult(input: Bns360JourneyInput, prefix: string): Omit<Bns360JourneyBase, 'status'> {
    return {
        runId: resolveRunId(prefix, input.runId),
        tenantRef: input.tenantId,
        generatedAt: new Date().toISOString(),
        cleanup: { status: 'verified' },
        residue: { zero: true },
    }
}

function blockedBaseResult(input: Bns360JourneyInput, prefix: string, journeyName: string): Bns360JourneyBase {
    return {
        status: 'blocked',
        ...baseResult(input, prefix),
        cleanup: { status: 'failed' },
        residue: { zero: true },
        error: `${journeyName} is not wired to a runtime runner yet`,
    }
}

export async function runBns360CheckoutPrimaryJourney(
    input: Bns360JourneyInput
): Promise<Bns360CheckoutPrimaryJourneyResult> {
    return {
        schema: 'bootandstrap.template.bns-360.checkout-primary/v1',
        ...blockedBaseResult(input, 'bns360-checkout', 'BNS 360 checkout primary journey'),
        runtime: {
            cart: {
                created: false,
                itemAttached: false,
            },
            paymentCollection: {
                status: 'blocked',
                providerMode: 'simulator',
                paymentSessionInitialized: false,
                liveMutation: false,
            },
            order: {
                completed: false,
                resultType: 'order',
            },
        },
    }
}

export async function runBns360CustomerAccountPrimaryJourney(
    input: Bns360JourneyInput
): Promise<Bns360CustomerAccountPrimaryJourneyResult> {
    return {
        schema: 'bootandstrap.template.bns-360.customer-account-primary/v1',
        ...blockedBaseResult(input, 'bns360-customer-account', 'BNS 360 customer account primary journey'),
        runtime: {
            customer: {
                canaryCreated: false,
                authenticated: false,
            },
            address: {
                created: false,
                updated: false,
                deleted: false,
            },
            orderRead: {
                tenantScoped: false,
                orderCountReadable: false,
            },
            crossTenantLeakage: false,
        },
    }
}

export async function runBns360OrderLifecyclePrimaryJourney(
    input: Bns360JourneyInput
): Promise<Bns360OrderLifecyclePrimaryJourneyResult> {
    return {
        schema: 'bootandstrap.template.bns-360.order-lifecycle-primary/v1',
        ...blockedBaseResult(input, 'bns360-order-lifecycle', 'BNS 360 order lifecycle primary journey'),
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
    }
}

export async function runBns360BackupRestorePrimaryJourney(
    input: Bns360JourneyInput
): Promise<Bns360BackupRestorePrimaryJourneyResult> {
    return {
        schema: 'bootandstrap.template.bns-360.backup-restore-primary/v1',
        ...blockedBaseResult(input, 'bns360-backup-restore', 'BNS 360 backup restore primary journey'),
        runtime: {
            backup: {
                metadataReadable: false,
                payloadRedacted: true,
            },
            restoreDryRun: {
                safe: false,
                mutation: false,
            },
        },
    }
}
