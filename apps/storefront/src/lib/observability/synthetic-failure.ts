import {
    acceptCorrelationHeaders,
    correlationHeaders,
    emitEvidence,
    type EvidenceSink,
} from '@bootandstrap/shared/observability'

type CorrelationHeaders = Record<string, string | string[] | undefined>

function safeErrorCode(error: unknown): string {
    const candidate = error && typeof error === 'object' && 'error_code' in error
        ? (error as { error_code?: unknown }).error_code
        : null
    return typeof candidate === 'string' && /^[a-z][a-z0-9_]{1,63}$/.test(candidate)
        ? candidate
        : 'downstream_failure'
}

/** Storefront hop for a reversible in-memory mutation; no external call is made. */
export async function runStorefrontSyntheticMutation(input: {
    headers: CorrelationHeaders
    tenant_id: string
    principal_id: string
    revision: string
    sink: EvidenceSink
    callMedusa: (headers: Record<string, string>) => Promise<unknown>
    now?: () => string
    eventId?: () => string
}): Promise<{ mutation_id: 'synthetic-local-mutation'; committed: true; rollback_verified: true }> {
    const correlation = acceptCorrelationHeaders(input.headers, {
        tenant_id: input.tenant_id,
        principal_id: input.principal_id,
    })
    await emitEvidence({
        ...correlation,
        service: 'storefront',
        revision: input.revision,
        event_name: 'storefront.synthetic.mutation_forwarded',
        outcome: 'forwarded',
        error_code: 'none',
    }, input.sink, input.now, input.eventId)
    const result = await input.callMedusa(correlationHeaders(correlation))
    if (!result || typeof result !== 'object'
        || (result as { mutation_id?: unknown }).mutation_id !== 'synthetic-local-mutation'
        || (result as { committed?: unknown }).committed !== true
        || (result as { rollback_verified?: unknown }).rollback_verified !== true) {
        throw new Error('synthetic_mutation_result_invalid')
    }
    await emitEvidence({
        ...correlation,
        service: 'storefront',
        revision: input.revision,
        event_name: 'storefront.synthetic.mutation_acknowledged',
        outcome: 'committed',
        error_code: 'none',
    }, input.sink, input.now, input.eventId)
    return { mutation_id: 'synthetic-local-mutation', committed: true, rollback_verified: true }
}

/** Storefront hop used by the local cross-plane proof; no external call is made. */
export async function runStorefrontSyntheticFailure(input: {
    headers: CorrelationHeaders
    tenant_id: string
    principal_id: string
    revision: string
    sink: EvidenceSink
    callMedusa: (headers: Record<string, string>) => Promise<unknown>
    now?: () => string
    eventId?: () => string
}): Promise<unknown> {
    const correlation = acceptCorrelationHeaders(input.headers, {
        tenant_id: input.tenant_id,
        principal_id: input.principal_id,
    })
    await emitEvidence({
        ...correlation,
        service: 'storefront',
        revision: input.revision,
        event_name: 'storefront.synthetic.forwarded',
        outcome: 'forwarded',
        error_code: 'none',
    }, input.sink, input.now, input.eventId)

    try {
        return await input.callMedusa(correlationHeaders(correlation))
    } catch (error) {
        await emitEvidence({
            ...correlation,
            service: 'storefront',
            revision: input.revision,
            event_name: 'storefront.synthetic.failure',
            outcome: 'failure',
            error_code: safeErrorCode(error),
        }, input.sink, input.now, input.eventId)
        throw error
    }
}
