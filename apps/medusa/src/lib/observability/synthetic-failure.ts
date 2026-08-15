import type { EvidenceSink } from "@bootandstrap/shared/observability" with { "resolution-mode": "import" }

type CorrelationHeaders = Record<string, string | string[] | undefined>

export class SyntheticMedusaFailure extends Error {
    readonly error_code = "synthetic_medusa_failure"

    constructor() {
        super("synthetic_medusa_failure")
        this.name = "SyntheticMedusaFailure"
    }
}

/** Deterministic local-only mutation seam. No database or provider mutation is performed. */
export async function runMedusaSyntheticMutation(input: {
    headers: CorrelationHeaders
    tenant_id: string
    principal_id: string
    revision: string
    sink: EvidenceSink
    mutationState: Map<string, string>
    now?: () => string
    eventId?: () => string
}): Promise<{ mutation_id: "synthetic-local-mutation"; committed: true; rollback_verified: true }> {
    const { acceptCorrelationHeaders, emitEvidence } = await import("@bootandstrap/shared/observability")
    const correlation = acceptCorrelationHeaders(input.headers, {
        tenant_id: input.tenant_id,
        principal_id: input.principal_id,
    })
    const mutationId = "synthetic-local-mutation"
    if (input.mutationState.has(mutationId)) throw new Error("synthetic_mutation_state_not_clean")
    input.mutationState.set(mutationId, correlation.operation_id)
    try {
        if (input.mutationState.get(mutationId) !== correlation.operation_id) {
            throw new Error("synthetic_mutation_not_observed")
        }
        await emitEvidence({
            ...correlation,
            service: "medusa",
            revision: input.revision,
            event_name: "medusa.synthetic.mutation_committed",
            outcome: "committed",
            error_code: "none",
        }, input.sink, input.now, input.eventId)
    } finally {
        input.mutationState.delete(mutationId)
    }
    if (input.mutationState.has(mutationId)) throw new Error("synthetic_mutation_rollback_failed")
    return { mutation_id: mutationId, committed: true, rollback_verified: true }
}

/** Deterministic local-only fault seam. It performs no payment or provider mutation. */
export async function runMedusaSyntheticFailure(input: {
    headers: CorrelationHeaders
    tenant_id: string
    principal_id: string
    revision: string
    sink: EvidenceSink
    now?: () => string
    eventId?: () => string
}): Promise<never> {
    const { acceptCorrelationHeaders, emitEvidence } = await import("@bootandstrap/shared/observability")
    const correlation = acceptCorrelationHeaders(input.headers, {
        tenant_id: input.tenant_id,
        principal_id: input.principal_id,
    })
    await emitEvidence({
        ...correlation,
        service: "medusa",
        revision: input.revision,
        event_name: "medusa.synthetic.failure",
        outcome: "failure",
        error_code: "synthetic_medusa_failure",
    }, input.sink, input.now, input.eventId)
    throw new SyntheticMedusaFailure()
}
