import type { EvidenceSink } from "@bootandstrap/shared/observability" with { "resolution-mode": "import" }

type CorrelationHeaders = Record<string, string | string[] | undefined>

export class SyntheticMedusaFailure extends Error {
    readonly error_code = "synthetic_medusa_failure"

    constructor() {
        super("synthetic_medusa_failure")
        this.name = "SyntheticMedusaFailure"
    }
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
