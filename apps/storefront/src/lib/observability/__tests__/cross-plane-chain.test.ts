import { describe, expect, it } from 'vitest'

import {
    correlationHeaders,
    createCorrelationContext,
    createInMemoryEvidenceSink,
} from '@bootandstrap/shared/observability'

import { runMedusaSyntheticFailure } from '../../../../../medusa/src/lib/observability/synthetic-failure'
import { runStorefrontSyntheticFailure } from '../synthetic-failure'

const revision = 'a'.repeat(40)
const tenantId = 'tenant-observability-proof'
const principalId = 'principal-observability-proof'
const context = createCorrelationContext({
    tenant_id: tenantId,
    principal_id: principalId,
    operation_id: 'operation-observability-proof',
}, {
    traceId: () => '0123456789abcdef0123456789abcdef',
    requestId: () => 'request-observability-proof',
})

function sequence(values: string[]) {
    let index = 0
    return () => values[index++]
}

describe('cross-plane synthetic observability chain', () => {
    it('correlates a redacted storefront to Medusa failure', async () => {
        const sink = createInMemoryEvidenceSink()
        const now = sequence([
            '2026-08-06T20:00:01.000Z',
            '2026-08-06T20:00:02.000Z',
            '2026-08-06T20:00:03.000Z',
        ])
        const eventId = sequence(['event-storefront-forward', 'event-medusa-failure', 'event-storefront-failure'])
        const headers = {
            ...correlationHeaders(context),
            authorization: 'Bearer must-not-cross-plane',
            cookie: 'must-not-cross-plane',
        }

        await expect(runStorefrontSyntheticFailure({
            headers,
            tenant_id: tenantId,
            principal_id: principalId,
            revision,
            sink,
            now,
            eventId,
            callMedusa: (forwardedHeaders) => runMedusaSyntheticFailure({
                headers: forwardedHeaders,
                tenant_id: tenantId,
                principal_id: principalId,
                revision,
                sink,
                now,
                eventId,
            }),
        })).rejects.toThrow('synthetic_medusa_failure')

        const chain = sink.query({ operation_id: context.operation_id })
        expect(chain.map(({ service, event_name, outcome, error_code }) => ({
            service, event_name, outcome, error_code,
        }))).toEqual([
            { service: 'storefront', event_name: 'storefront.synthetic.forwarded', outcome: 'forwarded', error_code: 'none' },
            { service: 'medusa', event_name: 'medusa.synthetic.failure', outcome: 'failure', error_code: 'synthetic_medusa_failure' },
            { service: 'storefront', event_name: 'storefront.synthetic.failure', outcome: 'failure', error_code: 'synthetic_medusa_failure' },
        ])
        for (const event of chain) {
            expect(event).toMatchObject(context)
            expect(JSON.stringify(event)).not.toMatch(/Bearer|cookie|must-not-cross-plane/)
        }
    })

    it('rejects tenant mismatch and missing trace before emitting', async () => {
        const sink = createInMemoryEvidenceSink()
        const headers = correlationHeaders(context)
        await expect(runStorefrontSyntheticFailure({
            headers,
            tenant_id: 'tenant-other',
            principal_id: principalId,
            revision,
            sink,
            callMedusa: async () => undefined,
        })).rejects.toThrow('tenant_mismatch')
        await expect(runStorefrontSyntheticFailure({
            headers: { ...headers, 'x-trace-id': '' },
            tenant_id: tenantId,
            principal_id: principalId,
            revision,
            sink,
            callMedusa: async () => undefined,
        })).rejects.toThrow('trace_id_missing')
        expect(sink.events).toEqual([])
    })

    it('maps a raw downstream error to a stable code without leaking its body', async () => {
        const sink = createInMemoryEvidenceSink()
        const raw = Object.assign(new Error('raw provider body: sk_live_synthetic'), {
            body: { authorization: 'Bearer synthetic' },
        })
        await expect(runStorefrontSyntheticFailure({
            headers: correlationHeaders(context),
            tenant_id: tenantId,
            principal_id: principalId,
            revision,
            sink,
            callMedusa: async () => { throw raw },
        })).rejects.toBe(raw)

        expect(sink.events.at(-1)?.error_code).toBe('downstream_failure')
        expect(JSON.stringify(sink.events)).not.toMatch(/sk_live|Bearer|raw provider body/)
    })
})
