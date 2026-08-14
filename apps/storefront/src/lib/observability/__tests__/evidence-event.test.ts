import { describe, expect, it, vi } from 'vitest'

import {
    EVIDENCE_EVENT_SCHEMA,
    createEvidenceEvent,
    createInMemoryEvidenceSink,
    createOTLPEvidenceSink,
    emitEvidence,
    type EvidenceEventInput,
} from '../evidence-event'

const validInput: EvidenceEventInput = {
    trace_id: '0123456789abcdef0123456789abcdef',
    request_id: 'request-storefront-test',
    tenant_id: 'tenant-storefront-test',
    principal_id: 'principal-storefront-test',
    operation_id: 'operation-storefront-test',
    service: 'storefront',
    revision: 'a'.repeat(40),
    event_name: 'storefront.pos.synthetic',
    outcome: 'failure',
    error_code: 'synthetic_failure',
}

describe('storefront shared evidence boundary', () => {
    it('re-exports the complete v3 contract without a local fork', () => {
        const event = createEvidenceEvent(validInput, () => '2026-08-06T20:00:00.000Z', () => 'event-1')
        expect(EVIDENCE_EVENT_SCHEMA).toBe('bootandstrap.evidence-event/v3')
        expect(event).toMatchObject({
            schema: EVIDENCE_EVENT_SCHEMA,
            event_id: 'event-1',
            occurred_at: '2026-08-06T20:00:00.000Z',
            ...validInput,
        })
    })

    it('keeps loopback and OTLP sinks deterministic and sink-neutral', async () => {
        const memory = createInMemoryEvidenceSink()
        await emitEvidence(validInput, memory, undefined, () => 'event-memory')
        expect(memory.query({ operation_id: validInput.operation_id })).toHaveLength(1)

        const exporter = vi.fn()
        await emitEvidence(validInput, createOTLPEvidenceSink(exporter), undefined, () => 'event-otlp')
        expect(exporter).toHaveBeenCalledWith(expect.objectContaining({
            traceId: validInput.trace_id,
            name: validInput.event_name,
        }))
    })

    it('rejects raw response bodies and secret-shaped values', () => {
        expect(() => createEvidenceEvent({
            ...validInput,
            attributes: { response: 'raw body' },
        })).toThrow(/raw payload/i)
        expect(() => createEvidenceEvent({
            ...validInput,
            attributes: { detail: 'Bearer synthetic' },
        })).toThrow(/secret/i)
    })
})
