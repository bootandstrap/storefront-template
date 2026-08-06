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

/** Storefront hop used by the local cross-plane proof; no external call is made. */
export async function runStorefrontSyntheticFailure(input: {
    headers: CorrelationHeaders
    tenant_id: string
    revision: string
    sink: EvidenceSink
    callMedusa: (headers: Record<string, string>) => Promise<unknown>
    now?: () => string
    eventId?: () => string
}): Promise<unknown> {
    const correlation = acceptCorrelationHeaders(input.headers, { tenant_id: input.tenant_id })
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
