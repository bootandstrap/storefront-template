export const EVIDENCE_EVENT_SCHEMA = "bootandstrap.evidence-event/v2" as const
export const EVIDENCE_REDACTION_POLICY = "bootandstrap.evidence-redaction/v1" as const
export const CORRELATION_HEADERS = [
    "x-trace-id",
    "x-request-id",
    "x-tenant-id",
    "x-operation-id",
] as const

export type EvidenceAttributeValue = string | number | boolean | null

export interface CorrelationContext {
    trace_id: string
    request_id: string
    tenant_id: string
    operation_id: string
}

export interface EvidenceEventInput extends CorrelationContext {
    service: string
    revision: string
    event_name: string
    outcome: string
    error_code: string
    attributes?: Record<string, EvidenceAttributeValue>
}

export interface EvidenceEvent extends EvidenceEventInput {
    schema: typeof EVIDENCE_EVENT_SCHEMA
    redaction_policy: typeof EVIDENCE_REDACTION_POLICY
    event_id: string
    occurred_at: string
}

export interface EvidenceSink {
    emit(event: EvidenceEvent): void | Promise<void>
}

export interface InMemoryEvidenceSink extends EvidenceSink {
    readonly events: EvidenceEvent[]
    query(filter: { trace_id?: string; operation_id?: string }): EvidenceEvent[]
    clear(): void
}

export interface OTLPEvidenceRecord {
    name: string
    traceId: string
    timestamp: string
    attributes: Record<string, EvidenceAttributeValue>
}

type HeadersRecord = Record<string, string | string[] | undefined>

const MAX_ATTRIBUTES = 16
const MAX_ATTRIBUTE_STRING_LENGTH = 256
const MAX_CORRELATION_LENGTH = 128
const ALLOWED_INPUT_KEYS = new Set([
    "trace_id", "request_id", "tenant_id", "operation_id", "service", "revision",
    "event_name", "outcome", "error_code", "attributes",
])
const SECRET_KEY_PATTERN = /(?:authorization|cookie|password|passwd|secret|token|api[_-]?key|private[_-]?key|sentry[_-]?dsn)/i
const RAW_PAYLOAD_KEY_PATTERN = /^(?:body|headers|payload|request|response|stack|raw)$/i
const SECRET_VALUE_PATTERNS = [
    /\bBearer\s+\S+/i,
    /\bsk_(?:live|test)_\S+/i,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
]

function requireText(value: unknown, field: string): asserts value is string {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty string`)
    if (value.length > MAX_CORRELATION_LENGTH) throw new Error(`${field} exceeds the cardinality-safe length`)
}

function rejectSecretValue(value: string, field: string): void {
    if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
        throw new Error(`${field} contains a secret-shaped value`)
    }
}

function validateAttributeKey(key: string): void {
    requireText(key, "attribute key")
    if (SECRET_KEY_PATTERN.test(key)) throw new Error(`attribute ${key} is secret-shaped`)
    if (RAW_PAYLOAD_KEY_PATTERN.test(key)) throw new Error(`attribute ${key} is a raw payload field`)
    if (key.startsWith("bootandstrap.")) throw new Error(`attribute ${key} uses a reserved evidence namespace`)
}

function validateAttributes(attributes: Record<string, EvidenceAttributeValue> | undefined) {
    if (attributes === undefined) return undefined
    if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
        throw new Error("attributes must be a flat object")
    }
    const entries = Object.entries(attributes)
    if (entries.length > MAX_ATTRIBUTES) throw new Error(`attributes exceed the cardinality limit of ${MAX_ATTRIBUTES}`)
    for (const [key, value] of entries) {
        validateAttributeKey(key)
        if (value !== null && !["string", "number", "boolean"].includes(typeof value)) {
            throw new Error(`attribute ${key} must be a primitive value`)
        }
        if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`attribute ${key} must be finite`)
        if (typeof value === "string") {
            if (value.length > MAX_ATTRIBUTE_STRING_LENGTH) throw new Error(`attribute ${key} exceeds the cardinality-safe length`)
            rejectSecretValue(value, `attribute ${key}`)
        }
    }
    return { ...attributes }
}

function defaultId(): string {
    if (!globalThis.crypto?.randomUUID) throw new Error("secure random UUID runtime is unavailable")
    return globalThis.crypto.randomUUID()
}

function defaultTraceId(): string {
    return defaultId().replaceAll("-", "")
}

function headerValue(headers: HeadersRecord, name: string): string {
    const raw = headers[name] ?? headers[name.toLowerCase()]
    return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? ""
}

export function createCorrelationContext(
    authority: { tenant_id: string; operation_id: string },
    ids: { traceId?: () => string; requestId?: () => string } = {},
): CorrelationContext {
    const context = {
        trace_id: (ids.traceId ?? defaultTraceId)(),
        request_id: (ids.requestId ?? defaultId)(),
        tenant_id: authority.tenant_id,
        operation_id: authority.operation_id,
    }
    validateCorrelation(context)
    return context
}

function validateCorrelation(context: CorrelationContext): void {
    requireText(context.trace_id, "trace_id")
    if (!/^[0-9a-f]{32}$/.test(context.trace_id)) throw new Error("trace_id must be 32 lowercase hexadecimal characters")
    for (const field of ["request_id", "tenant_id", "operation_id"] as const) {
        requireText(context[field], field)
        rejectSecretValue(context[field], field)
    }
}

export function correlationHeaders(context: CorrelationContext): Record<(typeof CORRELATION_HEADERS)[number], string> {
    validateCorrelation(context)
    return {
        "x-trace-id": context.trace_id,
        "x-request-id": context.request_id,
        "x-tenant-id": context.tenant_id,
        "x-operation-id": context.operation_id,
    }
}

export function acceptCorrelationHeaders(
    headers: HeadersRecord,
    authority: { tenant_id: string },
): CorrelationContext {
    const context = {
        trace_id: headerValue(headers, "x-trace-id"),
        request_id: headerValue(headers, "x-request-id"),
        tenant_id: headerValue(headers, "x-tenant-id"),
        operation_id: headerValue(headers, "x-operation-id"),
    }
    for (const field of ["trace_id", "request_id", "tenant_id", "operation_id"] as const) {
        if (!context[field]) throw new Error(`${field}_missing`)
    }
    validateCorrelation(context)
    if (context.tenant_id !== authority.tenant_id) throw new Error("tenant_mismatch")
    return context
}

export function createEvidenceEvent(
    input: EvidenceEventInput,
    now: () => string = () => new Date().toISOString(),
    eventId: () => string = defaultId,
): EvidenceEvent {
    for (const key of Object.keys(input)) {
        if (!ALLOWED_INPUT_KEYS.has(key)) throw new Error(`unknown evidence field ${key}; raw payloads are forbidden`)
    }
    validateCorrelation(input)
    for (const field of ["service", "revision", "event_name", "outcome", "error_code"] as const) {
        requireText(input[field], field)
        rejectSecretValue(input[field], field)
    }
    const event_id = eventId()
    const occurred_at = now()
    requireText(event_id, "event_id")
    if (!Number.isFinite(Date.parse(occurred_at))) throw new Error("occurred_at must be an ISO timestamp")
    return {
        schema: EVIDENCE_EVENT_SCHEMA,
        redaction_policy: EVIDENCE_REDACTION_POLICY,
        event_id,
        occurred_at,
        trace_id: input.trace_id,
        request_id: input.request_id,
        tenant_id: input.tenant_id,
        operation_id: input.operation_id,
        service: input.service,
        revision: input.revision,
        event_name: input.event_name,
        outcome: input.outcome,
        error_code: input.error_code,
        attributes: validateAttributes(input.attributes),
    }
}

export function createInMemoryEvidenceSink(): InMemoryEvidenceSink {
    const events: EvidenceEvent[] = []
    return {
        events,
        emit(event) { events.push(event) },
        query(filter) {
            return events
                .filter((event) => (!filter.trace_id || event.trace_id === filter.trace_id)
                    && (!filter.operation_id || event.operation_id === filter.operation_id))
                .slice()
                .sort((left, right) => left.occurred_at.localeCompare(right.occurred_at)
                    || left.event_id.localeCompare(right.event_id))
        },
        clear() { events.length = 0 },
    }
}

export function createOTLPEvidenceSink(exportRecord: (record: OTLPEvidenceRecord) => void | Promise<void>): EvidenceSink {
    return {
        emit(event) {
            return exportRecord({
                name: event.event_name,
                traceId: event.trace_id,
                timestamp: event.occurred_at,
                attributes: {
                    "bootandstrap.schema": event.schema,
                    "bootandstrap.redaction_policy": event.redaction_policy,
                    "bootandstrap.event_id": event.event_id,
                    "bootandstrap.request_id": event.request_id,
                    "bootandstrap.tenant_id": event.tenant_id,
                    "bootandstrap.operation_id": event.operation_id,
                    "bootandstrap.revision": event.revision,
                    "bootandstrap.outcome": event.outcome,
                    "bootandstrap.error_code": event.error_code,
                    "service.name": event.service,
                    ...event.attributes,
                },
            })
        },
    }
}

export async function emitEvidence(
    input: EvidenceEventInput,
    sink: EvidenceSink,
    now?: () => string,
    eventId?: () => string,
): Promise<EvidenceEvent> {
    const event = createEvidenceEvent(input, now, eventId)
    try { await sink.emit(event) } catch { /* evidence never changes business outcome */ }
    return event
}

export async function runWithEvidence<T>(
    input: EvidenceEventInput,
    sink: EvidenceSink,
    operation: () => Promise<T>,
): Promise<T> {
    try {
        const result = await operation()
        await emitEvidence(input, sink)
        return result
    } catch (error) {
        await emitEvidence({
            ...input,
            outcome: "failure",
            error_code: error instanceof Error && error.name ? error.name : "unknown_error",
        }, sink)
        throw error
    }
}
