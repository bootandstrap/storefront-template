import { describe, expect, it, vi } from 'vitest'

import {
    createEvidenceEvent,
    createInMemoryEvidenceSink,
    createOTLPEvidenceSink,
    emitEvidence,
    runWithEvidence,
    type EvidenceEventInput,
} from '../evidence-event'

const validInput: EvidenceEventInput = {
    trace_id: 'trace-01jz-assurance',
    tenant_id: 'tenant-synthetic-a',
    revision: '7aa1de7f3eedbd094302e29e5674de4e20640cfb',
    operation: 'pos.offline_sync',
    outcome: 'success',
    duration_ms: 17,
    error_class: 'none',
    attributes: {
        retry_classification: 'none',
        attempt: 1,
    },
}

const unsafeEvidenceOverrides: Array<Partial<EvidenceEventInput>> = [
    { attributes: { authorization: 'Bearer harmless-looking' } },
    { attributes: { note: 'sk_live_not-a-real-secret' } },
    { attributes: { payload: 'raw-request-body' } },
    { attributes: { 'bootandstrap.outcome': 'forged' } },
    { attributes: Object.fromEntries(Array.from({ length: 17 }, (_, index) => [`key_${index}`, index])) },
    { tenant_id: 'Bearer secret-shaped-tenant' },
]

describe('assurance evidence event contract', () => {
    it('normalizes required correlation and outcome fields without raw payloads', () => {
        const event = createEvidenceEvent(validInput, () => '2026-08-03T18:00:00.000Z')

        expect(event).toEqual({
            schema: 'bootandstrap.evidence-event/v1',
            timestamp: '2026-08-03T18:00:00.000Z',
            ...validInput,
        })
        expect(event).not.toHaveProperty('payload')
        expect(event).not.toHaveProperty('headers')
    })

    it.each([
        'trace_id',
        'revision',
        'operation',
        'outcome',
        'error_class',
    ] as const)('fails closed when %s is missing', (field) => {
        const input = { ...validInput, [field]: '' }
        expect(() => createEvidenceEvent(input)).toThrow(new RegExp(field, 'i'))
    })

    it('requires a non-negative finite duration', () => {
        expect(() => createEvidenceEvent({ ...validInput, duration_ms: -1 }))
            .toThrow(/duration_ms/i)
        expect(() => createEvidenceEvent({ ...validInput, duration_ms: Number.NaN }))
            .toThrow(/duration_ms/i)
    })

    it.each(unsafeEvidenceOverrides)('rejects secret-shaped or high-cardinality evidence: %o', (override) => {
        expect(() => createEvidenceEvent({ ...validInput, ...override }))
            .toThrow(/secret|raw payload|cardinality|reserved/i)
    })

    it('rejects unknown top-level raw fields instead of silently dropping them', () => {
        const input = {
            ...validInput,
            payload: { raw: true },
        } as unknown as EvidenceEventInput

        expect(() => createEvidenceEvent(input)).toThrow(/unknown.*payload|raw payload/i)
    })

    it('collects normalized events in an injectable in-memory sink', async () => {
        const sink = createInMemoryEvidenceSink()
        const event = await emitEvidence(validInput, sink)

        expect(sink.events).toEqual([event])
    })

    it('maps the normalized contract onto an OTLP-compatible sink boundary', async () => {
        const exportRecord = vi.fn().mockResolvedValue(undefined)
        const sink = createOTLPEvidenceSink(exportRecord)

        await emitEvidence(validInput, sink)

        expect(exportRecord).toHaveBeenCalledWith(expect.objectContaining({
            name: validInput.operation,
            traceId: validInput.trace_id,
            attributes: expect.objectContaining({
                'bootandstrap.tenant_id': validInput.tenant_id,
                'bootandstrap.outcome': 'success',
            }),
        }))
    })

    it('never lets a sink failure change a successful business result', async () => {
        const sink = { emit: vi.fn().mockRejectedValue(new Error('sink unavailable')) }
        const businessOperation = vi.fn().mockResolvedValue({ order_id: 'synthetic-order' })

        await expect(runWithEvidence(validInput, sink, businessOperation))
            .resolves.toEqual({ order_id: 'synthetic-order' })
        expect(businessOperation).toHaveBeenCalledOnce()
    })

    it('preserves the original business error when the evidence sink also fails', async () => {
        const original = new TypeError('synthetic business failure')
        const sink = { emit: vi.fn().mockRejectedValue(new Error('sink unavailable')) }

        await expect(runWithEvidence(validInput, sink, async () => { throw original }))
            .rejects.toBe(original)
    })
})
