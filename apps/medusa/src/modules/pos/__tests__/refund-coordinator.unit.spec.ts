import {
    executePOSRefundOperation,
    POSRefundExecutionError,
    type POSRefundExecutionDependencies,
    type POSRefundOperationInput,
    type POSRefundOperationResult,
} from '../refund-coordinator'

const vectors = require('./fixtures/pos-refund-golden-vectors.json') as { vectors: Array<{ id: string }> }

function input(overrides: Partial<POSRefundOperationInput> = {}): POSRefundOperationInput {
    return {
        tenant_id: 'tenant-a',
        order_id: 'order-a',
        operation_id: 'operation-a',
        idempotency_key: 'key-a',
        payload_sha256: 'a'.repeat(64),
        amount_minor: 1_000,
        items: [{ item_id: 'line-a', quantity: 1, ordered_quantity: 2 }],
        ...overrides,
    }
}

function harness() {
    let state: 'missing' | 'pending' | 'acknowledged' | 'failed' = 'missing'
    let refundId: string | null = null
    let committedRefund: string | null = null
    let failNextAcknowledgement = false
    const deps: POSRefundExecutionDependencies = {
        ledger: {
            reserve: jest.fn(async (): Promise<POSRefundOperationResult> => {
                if (state === 'missing') {
                    state = 'pending'
                    return { outcome: 'reserved', status: 'pending', refund_id: null }
                }
                return { outcome: `replay_${state}` as const, status: state, refund_id: refundId }
            }),
            acknowledge: jest.fn(async (_request, id) => {
                if (failNextAcknowledgement) {
                    failNextAcknowledgement = false
                    throw new Error('synthetic_ack_timeout')
                }
                state = 'acknowledged'
                refundId = id
                return { outcome: 'acknowledged', status: state, refund_id: id }
            }),
            fail: jest.fn(async () => {
                state = 'failed'
                return { outcome: 'failed', status: state, refund_id: null }
            }),
        },
        payment: {
            findCommittedRefund: jest.fn(async () => committedRefund ? { refund_id: committedRefund } : null),
            refund: jest.fn(async () => {
                committedRefund = 'refund-a'
                return { refund_id: committedRefund }
            }),
        },
    }
    return {
        deps,
        failAcknowledgementOnce: () => { failNextAcknowledgement = true },
        providerCalls: () => (deps.payment.refund as jest.Mock).mock.calls.length,
    }
}

describe('POS refund golden-vector coordinator', () => {
    it('keeps the required conformance vectors executable', () => {
        expect(vectors.vectors.map((vector) => vector.id)).toEqual([
            'first_refund', 'exact_replay', 'conflicting_replay', 'partial_then_remaining',
            'over_refund', 'concurrent_last_quantity', 'timeout_before_commit', 'timeout_after_commit',
        ])
    })

    it('acknowledges the first refund and replays without a second provider call', async () => {
        const test = harness()

        await expect(executePOSRefundOperation(input(), test.deps)).resolves.toMatchObject({
            status: 'acknowledged', refund_id: 'refund-a',
        })
        await expect(executePOSRefundOperation(input(), test.deps)).resolves.toMatchObject({
            outcome: 'replay_acknowledged', status: 'acknowledged', refund_id: 'refund-a',
        })
        expect(test.providerCalls()).toBe(1)
    })

    it('reconciles a provider commit after acknowledgement timeout without double refund', async () => {
        const test = harness()
        test.failAcknowledgementOnce()

        await expect(executePOSRefundOperation(input(), test.deps)).rejects.toThrow('synthetic_ack_timeout')
        await expect(executePOSRefundOperation(input(), test.deps)).resolves.toMatchObject({
            status: 'acknowledged', refund_id: 'refund-a',
        })
        expect(test.providerCalls()).toBe(1)
    })

    it('records provider rejection as failed and never acknowledges it', async () => {
        const test = harness()
        ;(test.deps.payment.refund as jest.Mock).mockRejectedValueOnce(
            new POSRefundExecutionError('provider_rejected', true),
        )

        await expect(executePOSRefundOperation(input(), test.deps)).resolves.toMatchObject({
            outcome: 'failed', status: 'failed', refund_id: null,
        })
        expect(test.deps.ledger.acknowledge).not.toHaveBeenCalled()
    })

    it('keeps ambiguous provider timeouts pending for metadata reconciliation', async () => {
        const test = harness()
        ;(test.deps.payment.refund as jest.Mock).mockRejectedValueOnce(new Error('transport_timeout'))

        await expect(executePOSRefundOperation(input(), test.deps)).rejects.toThrow('transport_timeout')
        expect(test.deps.ledger.fail).not.toHaveBeenCalled()
        expect(test.deps.ledger.acknowledge).not.toHaveBeenCalled()
    })
})
