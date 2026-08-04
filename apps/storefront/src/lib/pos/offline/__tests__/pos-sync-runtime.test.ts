import { describe, expect, it, vi } from 'vitest'

import { createPOSSyncTransport, syncPendingSaleWithProtocol } from '../useOfflineSync'
import type { PendingSale } from '../offline-store'
import type { POSSyncCommitRequest } from '../pos-sync-protocol'
import { POSSyncFaultTransport } from './pos-sync-fault-transport'

function pendingSale(overrides: Partial<PendingSale> = {}): PendingSale {
    return {
        id: 1,
        offline_ref: 'offline-runtime-1',
        tenant_id: 'tenant-alpha',
        operation_id: 'operation-runtime-1',
        client_id: 'client-runtime',
        client_sequence: 1,
        known_server_sequence: 4,
        sync_state: 'queued',
        items: [{ variant_id: 'variant-1', quantity: 2, unit_price: 1250 }],
        payment_method: 'cash',
        discount_amount: 100,
        created_at: '2026-08-03T08:00:00.000Z',
        sync_attempts: 0,
        ...overrides,
    }
}

describe('POS offline runtime protocol adapter', () => {
    const request: POSSyncCommitRequest = {
        operation: {
            tenantId: 'tenant-alpha',
            operationId: 'operation-runtime-1',
            idempotencyKey: 'offline-runtime-1',
            clientId: 'client-runtime',
            clientSequence: 1,
            createdAt: '2026-08-03T08:00:00.000Z',
            amountMinor: 2400,
            payload: {
                items: [{ variant_id: 'variant-1', quantity: 2, unit_price: 1250 }],
                payment_method: 'cash',
                discount_amount: 100,
            },
        },
        knownServerSequence: 4,
    }

    it('uses durable queue metadata and integer minor totals on the authoritative protocol path', async () => {
        const transport = new POSSyncFaultTransport('tenant-alpha', 4, 0, [])

        const result = await syncPendingSaleWithProtocol(
            pendingSale(),
            'tenant-alpha',
            transport,
        )

        expect(result.state).toBe('acknowledged')
        expect(result.serverSequence).toBe(5)
        expect(transport.committed.get('offline-runtime-1')).toMatchObject({
            clientSequence: 1,
        })
    })

    it('fails closed on missing durable metadata without calling transport', async () => {
        const transport = new POSSyncFaultTransport('tenant-alpha', 4, 0, [])
        const legacy = pendingSale({ tenant_id: '' })

        await expect(syncPendingSaleWithProtocol(legacy, 'tenant-alpha', transport))
            .rejects.toThrow(/unavailable.*tenant/i)
        expect(transport.calls).toBe(0)
    })

    it('rejects cross-tenant queue records before server commit', async () => {
        const transport = new POSSyncFaultTransport('tenant-alpha', 4, 0, [])

        const result = await syncPendingSaleWithProtocol(
            pendingSale({ tenant_id: 'tenant-beta' }),
            'tenant-alpha',
            transport,
        )

        expect(result).toMatchObject({
            state: 'rejected',
            outcome: 'tenant_mismatch',
            retryClassification: 'permanent',
        })
        expect(transport.calls).toBe(0)
    })

    it('passes the complete durable envelope and rejects an uncorroborated sale success', async () => {
        const createSale = vi.fn().mockResolvedValue({ success: true, display_id: 42 })
        const transport = createPOSSyncTransport(createSale)

        await expect(transport.commit(request)).rejects.toMatchObject({
            code: 'unavailable',
            classification: 'permanent',
            barrier: 'afterCommit',
        })
        expect(createSale).toHaveBeenCalledWith(expect.objectContaining({
            sync: {
                tenant_id: 'tenant-alpha',
                operation_id: 'operation-runtime-1',
                idempotency_key: 'offline-runtime-1',
                client_id: 'client-runtime',
                client_sequence: 1,
                known_server_sequence: 4,
            },
        }))
    })

    it('accepts only a correlated authoritative server acknowledgement', async () => {
        const createSale = vi.fn().mockResolvedValue({
            success: true,
            display_id: 42,
            sync: {
                outcome: 'committed',
                operation_id: 'operation-runtime-1',
                idempotency_key: 'offline-runtime-1',
                server_sequence: 5,
                last_client_sequence: 1,
            },
        })
        const transport = createPOSSyncTransport(createSale)

        await expect(transport.commit(request)).resolves.toEqual({
            outcome: 'committed',
            serverSequence: 5,
            lastClientSequence: 1,
        })
    })

    it('rejects malformed outcomes and incoherent authoritative sequences', async () => {
        const valid = {
            outcome: 'committed',
            operation_id: 'operation-runtime-1',
            idempotency_key: 'offline-runtime-1',
            server_sequence: 5,
            last_client_sequence: 1,
        }
        for (const sync of [
            { ...valid, outcome: 'accepted' },
            { ...valid, server_sequence: -1 },
            { ...valid, server_sequence: 4 },
            { ...valid, last_client_sequence: 0 },
        ]) {
            const transport = createPOSSyncTransport(
                vi.fn().mockResolvedValue({ success: true, display_id: 42, sync }),
            )
            await expect(transport.commit(request)).rejects.toMatchObject({
                code: 'unavailable',
                barrier: 'afterCommit',
            })
        }
    })
})
