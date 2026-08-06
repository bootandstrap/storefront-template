export interface POSRefundItemReservation {
    item_id: string
    quantity: number
    ordered_quantity: number
}

export interface POSRefundOperationInput {
    tenant_id: string
    order_id: string
    operation_id: string
    idempotency_key: string
    payload_sha256: string
    amount_minor: number
    items: POSRefundItemReservation[]
}

export interface POSRefundOperationResult {
    outcome: string
    status: 'pending' | 'acknowledged' | 'failed'
    refund_id: string | null
    failure_code?: string | null
}

export interface POSRefundExecutionDependencies {
    ledger: {
        reserve(input: POSRefundOperationInput): Promise<POSRefundOperationResult>
        acknowledge(input: POSRefundOperationInput, refundId: string): Promise<POSRefundOperationResult>
        fail(input: POSRefundOperationInput, failureCode: string): Promise<POSRefundOperationResult>
    }
    payment: {
        findCommittedRefund(input: POSRefundOperationInput): Promise<{ refund_id: string } | null>
        refund(input: POSRefundOperationInput): Promise<{ refund_id: string }>
    }
}

export class POSRefundExecutionError extends Error {
    constructor(
        readonly code: string,
        readonly definitive: boolean,
    ) {
        super(code)
        this.name = 'POSRefundExecutionError'
    }
}

export async function executePOSRefundOperation(
    input: POSRefundOperationInput,
    dependencies: POSRefundExecutionDependencies,
): Promise<POSRefundOperationResult> {
    const reservation = await dependencies.ledger.reserve(input)

    if (reservation.outcome === 'replay_pending') {
        const committed = await dependencies.payment.findCommittedRefund(input)
        return committed
            ? dependencies.ledger.acknowledge(input, committed.refund_id)
            : reservation
    }
    if (reservation.outcome !== 'reserved') return reservation

    let committed: { refund_id: string }
    try {
        committed = await dependencies.payment.refund(input)
    } catch (error) {
        if (error instanceof POSRefundExecutionError && error.definitive) {
            return dependencies.ledger.fail(input, error.code)
        }
        // An unknown/provider transport failure can occur after the provider committed.
        // Keep the ledger pending so replay can reconcile Medusa metadata without a
        // second mutation. Never turn an ambiguous outcome into a definitive failure.
        throw error
    }
    return dependencies.ledger.acknowledge(input, committed.refund_id)
}
