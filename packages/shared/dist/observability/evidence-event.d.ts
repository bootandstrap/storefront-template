export declare const EVIDENCE_EVENT_SCHEMA: "bootandstrap.evidence-event/v3";
export declare const EVIDENCE_REDACTION_POLICY: "bootandstrap.evidence-redaction/v1";
export declare const CORRELATION_HEADERS: readonly ["x-trace-id", "x-request-id", "x-tenant-id", "x-principal-id", "x-operation-id"];
export type EvidenceAttributeValue = string | number | boolean | null;
export interface CorrelationContext {
    trace_id: string;
    request_id: string;
    tenant_id: string;
    principal_id: string;
    operation_id: string;
}
export interface EvidenceEventInput extends CorrelationContext {
    service: string;
    revision: string;
    event_name: string;
    outcome: string;
    error_code: string;
    attributes?: Record<string, EvidenceAttributeValue>;
}
export interface EvidenceEvent extends EvidenceEventInput {
    schema: typeof EVIDENCE_EVENT_SCHEMA;
    redaction_policy: typeof EVIDENCE_REDACTION_POLICY;
    event_id: string;
    occurred_at: string;
}
export interface EvidenceSink {
    emit(event: EvidenceEvent): void | Promise<void>;
}
export interface InMemoryEvidenceSink extends EvidenceSink {
    readonly events: EvidenceEvent[];
    query(filter: {
        trace_id?: string;
        operation_id?: string;
    }): EvidenceEvent[];
    clear(): void;
}
export interface OTLPEvidenceRecord {
    name: string;
    traceId: string;
    timestamp: string;
    attributes: Record<string, EvidenceAttributeValue>;
}
type HeadersRecord = Record<string, string | string[] | undefined>;
export declare function createCorrelationContext(authority: {
    tenant_id: string;
    principal_id: string;
    operation_id: string;
}, ids?: {
    traceId?: () => string;
    requestId?: () => string;
}): CorrelationContext;
export declare function correlationHeaders(context: CorrelationContext): Record<(typeof CORRELATION_HEADERS)[number], string>;
export declare function acceptCorrelationHeaders(headers: HeadersRecord, authority: {
    tenant_id: string;
    principal_id: string;
}): CorrelationContext;
export declare function createEvidenceEvent(input: EvidenceEventInput, now?: () => string, eventId?: () => string): EvidenceEvent;
export declare function createInMemoryEvidenceSink(): InMemoryEvidenceSink;
export declare function createOTLPEvidenceSink(exportRecord: (record: OTLPEvidenceRecord) => void | Promise<void>): EvidenceSink;
export declare function emitEvidence(input: EvidenceEventInput, sink: EvidenceSink, now?: () => string, eventId?: () => string): Promise<EvidenceEvent>;
export declare function runWithEvidence<T>(input: EvidenceEventInput, sink: EvidenceSink, operation: () => Promise<T>): Promise<T>;
export {};
//# sourceMappingURL=evidence-event.d.ts.map