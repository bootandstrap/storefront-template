import { describe, expect, it } from 'vitest'

import { syncPendingSaleWithProtocol } from '../useOfflineSync'
import type { PendingSale } from '../offline-store'
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
})
