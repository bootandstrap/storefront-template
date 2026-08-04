import { describe, expect, it } from 'vitest'

import vectorsFixture from './fixtures/pos-sync-golden-vectors.json'
import { POSSyncFaultTransport, type InjectedFault } from './pos-sync-fault-transport'
import {
    createPOSSyncOperation,
    resolvePOSSyncConflict,
    retryDelayMs,
    synchronizePOSOperation,
    type POSSyncResult,
} from '../pos-sync-protocol'

interface GoldenVector {
    id: string
    tenantId: string
    serverTenantId: string
    initialServerSequence: number
    initialLastClientSequence: number
    queuedOperations: Array<{
        clientSequence: number
        createdAt: string
        amountMinor: number
    }>
    injectedFaults: InjectedFault[]
    maxAttempts: number
    replayCount: number
    resolveConflict: boolean
    crashAfterLocalPersistence: boolean
    expected: {
        outcome: POSSyncResult['outcome']
        durableState: {
            clientState: POSSyncResult['state']
            serverSequence: number
            committedCount: number
        }
        transportCalls: number
        retryDelaysMs: number[]
    }
}

const vectors = vectorsFixture.vectors as GoldenVector[]

async function runVector(vector: GoldenVector) {
    const queuedOperation = vector.queuedOperations[0]
    let operation = createPOSSyncOperation({
        tenantId: vector.tenantId,
        operationId: `operation-${vector.id}`,
        idempotencyKey: `idempotency-${vector.id}`,
        clientId: 'synthetic-pos-client',
        clientSequence: queuedOperation.clientSequence,
        createdAt: queuedOperation.createdAt,
        amountMinor: queuedOperation.amountMinor,
        payload: { syntheticOrderId: `order-${vector.id}` },
    })
    if (vector.crashAfterLocalPersistence) {
        operation = JSON.parse(JSON.stringify(operation))
    }

    const transport = new POSSyncFaultTransport(
        vector.serverTenantId,
        vector.initialServerSequence,
        vector.initialLastClientSequence,
        vector.injectedFaults,
    )
    const retryDelaysMs: number[] = []
    let result: POSSyncResult | undefined

    for (let attempt = 1; attempt <= vector.maxAttempts; attempt += 1) {
        result = await synchronizePOSOperation({
            operation,
            expectedTenantId: vector.serverTenantId,
            knownServerSequence: vector.initialServerSequence,
        }, transport)

        if (result.state === 'conflicted' && vector.resolveConflict) {
            operation = resolvePOSSyncConflict(operation, result.lastClientSequence!)
            continue
        }
        if (result.retryClassification === 'retryable' && attempt < vector.maxAttempts) {
            retryDelaysMs.push(retryDelayMs(attempt))
            continue
        }
        break
    }

    for (let replay = 0; replay < vector.replayCount; replay += 1) {
        result = await synchronizePOSOperation({
            operation,
            expectedTenantId: vector.serverTenantId,
            knownServerSequence: result!.serverSequence,
        }, transport)
    }

    return { result: result!, transport, retryDelaysMs }
}

describe('POS offline sync golden-vector conformance', () => {
    it('uses integer minor currency units in every vector', () => {
        expect(vectors).toHaveLength(10)
        expect(vectors.every((vector) =>
            vector.queuedOperations.length > 0
            && vector.queuedOperations.every((operation) => Number.isInteger(operation.amountMinor)),
        )).toBe(true)
    })

    for (const vector of vectors) {
        it(vector.id, async () => {
            const { result, transport, retryDelaysMs } = await runVector(vector)

            expect(result.state).toBe(vector.expected.durableState.clientState)
            expect(result.outcome).toBe(vector.expected.outcome)
            expect(result.serverSequence).toBe(vector.expected.durableState.serverSequence)
            expect(transport.committed.size).toBe(vector.expected.durableState.committedCount)
            expect(transport.calls).toBe(vector.expected.transportCalls)
            expect(retryDelaysMs).toEqual(vector.expected.retryDelaysMs)
            expect(transport.visitedBarriers.every(({ barrier }) =>
                ['beforeCommit', 'afterCommit', 'beforeAck'].includes(barrier),
            )).toBe(true)
        })
    }
})

describe('POS sync protocol validation', () => {
    it('rejects fractional minor units before transport', () => {
        expect(() => createPOSSyncOperation({
            tenantId: 'tenant-alpha',
            operationId: 'operation-fractional',
            idempotencyKey: 'idempotency-fractional',
            clientId: 'client-alpha',
            clientSequence: 1,
            createdAt: '2026-08-03T08:00:00.000Z',
            amountMinor: 10.5,
            payload: {},
        })).toThrow(/integer minor units/i)
    })
})
