import { describe, expect, it } from 'vitest'

import vectorsFixture from './fixtures/pos-sync-golden-vectors.json'
import { POSSyncFaultTransport, type POSSyncServerMutations } from './pos-sync-fault-transport'
import {
    createPOSSyncOperation,
    createPOSSyncSynchronizer,
    type POSSyncClientDecisions,
} from '../pos-sync-protocol'

const baseVector = vectorsFixture.vectors[0]

async function runCanary(options: {
    client?: Partial<POSSyncClientDecisions>
    server?: POSSyncServerMutations
    tenantId?: string
    serverTenantId?: string
}) {
    const operation = createPOSSyncOperation({
        tenantId: options.tenantId ?? baseVector.tenantId,
        operationId: 'operation-canary',
        idempotencyKey: 'idempotency-canary',
        clientId: 'client-canary',
        clientSequence: 1,
        createdAt: baseVector.queuedOperations[0].createdAt,
        amountMinor: baseVector.queuedOperations[0].amountMinor,
        payload: {},
    })
    const transport = new POSSyncFaultTransport(
        options.serverTenantId ?? baseVector.serverTenantId,
        baseVector.initialServerSequence,
        baseVector.initialLastClientSequence,
        [],
        options.server,
    )
    const synchronize = createPOSSyncSynchronizer(options.client)
    const first = await synchronize({
        operation,
        expectedTenantId: options.serverTenantId ?? baseVector.serverTenantId,
        knownServerSequence: baseVector.initialServerSequence,
    }, transport)
    const replay = await synchronize({
        operation,
        expectedTenantId: options.serverTenantId ?? baseVector.serverTenantId,
        knownServerSequence: first.serverSequence,
    }, transport)
    return { first, replay, transport }
}

describe('POS conformance mutation canaries', () => {
    it('kills tenant comparison inversion', async () => {
        const { first, transport } = await runCanary({
            tenantId: 'tenant-beta',
            serverTenantId: 'tenant-alpha',
            client: { tenantMatches: (left, right) => left !== right },
        })
        expect(first.outcome).not.toBe('tenant_mismatch')
        expect(transport.calls).toBeGreaterThan(0)
    })

    it('kills duplicate acceptance inversion', async () => {
        const { replay, transport } = await runCanary({
            server: { acceptDuplicateAsNew: true },
        })
        expect(replay.outcome).not.toBe('duplicate')
        expect(transport.committedCount).toBe(2)
    })

    it('kills sequence comparison inversion', async () => {
        const { first } = await runCanary({
            server: { invertSequenceComparison: true },
        })
        expect(first.outcome).toBe('conflict')
    })

    it('kills retryable/permanent classification inversion', async () => {
        const synchronize = createPOSSyncSynchronizer({
            classifyTransportError: () => 'permanent',
        })
        const transport = new POSSyncFaultTransport('tenant-alpha', 0, 0, [
            { attempt: 1, barrier: 'beforeCommit', effect: 'timeout' },
        ])
        const result = await synchronize({
            operation: createPOSSyncOperation({
                tenantId: 'tenant-alpha',
                operationId: 'operation-retry-canary',
                idempotencyKey: 'idempotency-retry-canary',
                clientId: 'client-canary',
                clientSequence: 1,
                createdAt: baseVector.queuedOperations[0].createdAt,
                amountMinor: 100,
                payload: {},
            }),
            expectedTenantId: 'tenant-alpha',
            knownServerSequence: 0,
        }, transport)

        expect(result.retryClassification).toBe('permanent')
        expect(result.state).toBe('rejected')
    })
})
