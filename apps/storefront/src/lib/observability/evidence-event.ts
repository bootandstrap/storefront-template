export const EVIDENCE_EVENT_SCHEMA = 'bootandstrap.evidence-event/v1' as const

export type EvidenceAttributeValue = string | number | boolean | null

export interface EvidenceEventInput {
    trace_id: string
    tenant_id: string | null
    revision: string
    operation: string
    outcome: string
    duration_ms: number
    error_class: string
    attributes?: Record<string, EvidenceAttributeValue>
}

export interface EvidenceEvent extends EvidenceEventInput {
    schema: typeof EVIDENCE_EVENT_SCHEMA
    timestamp: string
}

export interface EvidenceSink {
    emit(event: EvidenceEvent): void | Promise<void>
}

export interface InMemoryEvidenceSink extends EvidenceSink {
    readonly events: EvidenceEvent[]
    clear(): void
}

export interface OTLPEvidenceRecord {
    name: string
    traceId: string
    timestamp: string
    durationMs: number
    attributes: Record<string, EvidenceAttributeValue>
}

const MAX_ATTRIBUTES = 16
const MAX_ATTRIBUTE_STRING_LENGTH = 256
const ALLOWED_INPUT_KEYS = new Set([
    'trace_id',
    'tenant_id',
    'revision',
    'operation',
    'outcome',
    'duration_ms',
    'error_class',
    'attributes',
])
const SECRET_KEY_PATTERN = /(?:authorization|cookie|password|passwd|secret|token|api[_-]?key|private[_-]?key|sentry[_-]?dsn)/i
const RAW_PAYLOAD_KEY_PATTERN = /^(?:body|headers|payload|request|response|stack|raw)$/i
const SECRET_VALUE_PATTERNS = [
    /\bBearer\s+\S+/i,
    /\bsk_(?:live|test)_\S+/i,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
]

function requireText(value: string, field: string): void {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`${field} must be a non-empty string`)
    }
}

function rejectSecretValue(value: string, field: string): void {
    if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
        throw new Error(`${field} contains a secret-shaped value`)
    }
}

function validateAttributeKey(key: string): void {
    requireText(key, 'attribute key')
    if (SECRET_KEY_PATTERN.test(key)) {
        throw new Error(`attribute ${key} is secret-shaped`)
    }
    if (RAW_PAYLOAD_KEY_PATTERN.test(key)) {
        throw new Error(`attribute ${key} is a raw payload field`)
    }
    if (key.startsWith('bootandstrap.')) {
        throw new Error(`attribute ${key} uses a reserved evidence namespace`)
    }
}

function validateAttributeValue(key: string, value: EvidenceAttributeValue): void {
    if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) {
        throw new Error(`attribute ${key} must be a primitive value`)
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
        throw new Error(`attribute ${key} must be finite`)
    }
    if (typeof value !== 'string') return
    if (value.length > MAX_ATTRIBUTE_STRING_LENGTH) {
        throw new Error(`attribute ${key} exceeds the cardinality-safe length`)
    }
    rejectSecretValue(value, `attribute ${key}`)
}

function validateAttributes(
    attributes: Record<string, EvidenceAttributeValue> | undefined,
): Record<string, EvidenceAttributeValue> | undefined {
    if (attributes === undefined) return undefined
    if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
        throw new Error('attributes must be a flat object')
    }

    const entries = Object.entries(attributes)
    if (entries.length > MAX_ATTRIBUTES) {
        throw new Error(`attributes exceed the cardinality limit of ${MAX_ATTRIBUTES}`)
    }
    for (const [key, value] of entries) {
        validateAttributeKey(key)
        validateAttributeValue(key, value)
    }
    return { ...attributes }
}

export function createEvidenceEvent(
    input: EvidenceEventInput,
    now: () => string = () => new Date().toISOString(),
): EvidenceEvent {
    for (const key of Object.keys(input)) {
        if (!ALLOWED_INPUT_KEYS.has(key)) {
            throw new Error(`unknown evidence field ${key}; raw payloads are forbidden`)
        }
    }
    requireText(input.trace_id, 'trace_id')
    requireText(input.revision, 'revision')
    requireText(input.operation, 'operation')
    requireText(input.outcome, 'outcome')
    requireText(input.error_class, 'error_class')
    rejectSecretValue(input.trace_id, 'trace_id')
    if (input.tenant_id !== null) {
        requireText(input.tenant_id, 'tenant_id')
        rejectSecretValue(input.tenant_id, 'tenant_id')
    }
    if (!Number.isFinite(input.duration_ms) || input.duration_ms < 0) {
        throw new Error('duration_ms must be a non-negative finite number')
    }

    return {
        schema: EVIDENCE_EVENT_SCHEMA,
        timestamp: now(),
        trace_id: input.trace_id,
        tenant_id: input.tenant_id,
        revision: input.revision,
        operation: input.operation,
        outcome: input.outcome,
        duration_ms: input.duration_ms,
        error_class: input.error_class,
        attributes: validateAttributes(input.attributes),
    }
}

export function createInMemoryEvidenceSink(): InMemoryEvidenceSink {
    const events: EvidenceEvent[] = []
    return {
        events,
        emit(event) {
            events.push(event)
        },
        clear() {
            events.length = 0
        },
    }
}

export function createOTLPEvidenceSink(
    exportRecord: (record: OTLPEvidenceRecord) => void | Promise<void>,
): EvidenceSink {
    return {
        emit(event) {
            return exportRecord({
                name: event.operation,
                traceId: event.trace_id,
                timestamp: event.timestamp,
                durationMs: event.duration_ms,
                attributes: {
                    'bootandstrap.schema': event.schema,
                    'bootandstrap.tenant_id': event.tenant_id,
                    'bootandstrap.revision': event.revision,
                    'bootandstrap.outcome': event.outcome,
                    'bootandstrap.error_class': event.error_class,
                    ...event.attributes,
                },
            })
        },
    }
}

export async function emitEvidence(
    input: EvidenceEventInput,
    sink: EvidenceSink,
): Promise<EvidenceEvent> {
    const event = createEvidenceEvent(input)
    try {
        await sink.emit(event)
    } catch {
        // Observability must not change the result of the observed operation.
    }
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
            outcome: 'failure',
            error_class: error instanceof Error ? error.name : 'UnknownError',
        }, sink)
        throw error
    }
}
