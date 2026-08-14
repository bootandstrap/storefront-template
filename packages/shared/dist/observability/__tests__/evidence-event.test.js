import { describe, expect, it, vi } from "vitest";
import { CORRELATION_HEADERS, EVIDENCE_EVENT_SCHEMA, acceptCorrelationHeaders, correlationHeaders, createCorrelationContext, createEvidenceEvent, createInMemoryEvidenceSink, createOTLPEvidenceSink, emitEvidence, } from "../evidence-event";
const context = {
    trace_id: "0123456789abcdef0123456789abcdef",
    request_id: "request-cross-plane-1",
    tenant_id: "tenant-cross-plane-1",
    principal_id: "principal-cross-plane-1",
    operation_id: "operation-cross-plane-1",
};
const input = {
    ...context,
    service: "storefront",
    revision: "a".repeat(40),
    event_name: "storefront.synthetic.forwarded",
    outcome: "forwarded",
    error_code: "none",
    attributes: { attempt: 1 },
};
describe("vendor-neutral evidence event v3", () => {
    it("requires the complete correlation and outcome contract", () => {
        const event = createEvidenceEvent(input, () => "2026-08-06T20:00:00.000Z", () => "event-1");
        expect(event).toEqual({
            schema: "bootandstrap.evidence-event/v3",
            redaction_policy: "bootandstrap.evidence-redaction/v1",
            event_id: "event-1",
            occurred_at: "2026-08-06T20:00:00.000Z",
            ...input,
        });
        expect(EVIDENCE_EVENT_SCHEMA).toBe("bootandstrap.evidence-event/v3");
    });
    it.each([
        "trace_id", "request_id", "tenant_id", "principal_id", "operation_id", "service",
        "revision", "event_name", "outcome", "error_code",
    ])("fails closed when %s is missing", (field) => {
        expect(() => createEvidenceEvent({ ...input, [field]: "" })).toThrow(new RegExp(field, "i"));
    });
    it.each([
        { attributes: { authorization: "Bearer synthetic" } },
        { attributes: { response: "raw provider response" } },
        { attributes: { note: "sk_live_synthetic" } },
        { error_code: "Bearer synthetic" },
    ])("rejects secrets and raw bodies: %o", (unsafe) => {
        expect(() => createEvidenceEvent({ ...input, ...unsafe })).toThrow(/secret|raw payload/i);
    });
    it("lets only the control plane create IDs and makes downstream services preserve them", () => {
        expect(CORRELATION_HEADERS).toEqual([
            "x-trace-id", "x-request-id", "x-tenant-id", "x-principal-id", "x-operation-id",
        ]);
        const created = createCorrelationContext({
            tenant_id: context.tenant_id,
            principal_id: context.principal_id,
            operation_id: context.operation_id,
        }, {
            traceId: () => context.trace_id,
            requestId: () => context.request_id,
        });
        const headers = {
            ...correlationHeaders(created),
            authorization: "Bearer must-not-propagate",
            cookie: "must-not-propagate",
        };
        expect(correlationHeaders(created)).toEqual({
            "x-trace-id": context.trace_id,
            "x-request-id": context.request_id,
            "x-tenant-id": context.tenant_id,
            "x-principal-id": context.principal_id,
            "x-operation-id": context.operation_id,
        });
        expect(acceptCorrelationHeaders(headers, {
            tenant_id: context.tenant_id,
            principal_id: context.principal_id,
        })).toEqual(context);
        expect(() => acceptCorrelationHeaders(headers, {
            tenant_id: "tenant-other", principal_id: context.principal_id,
        })).toThrow(/tenant_mismatch/i);
        expect(() => acceptCorrelationHeaders(headers, {
            tenant_id: context.tenant_id, principal_id: "principal-other",
        })).toThrow(/principal_mismatch/i);
        expect(() => acceptCorrelationHeaders({ ...headers, "x-trace-id": "" }, {
            tenant_id: context.tenant_id, principal_id: context.principal_id,
        }))
            .toThrow(/trace_id.*missing/i);
    });
    it("queries an ordered in-memory chain by trace or operation", async () => {
        const sink = createInMemoryEvidenceSink();
        await emitEvidence({ ...input, event_name: "event.second" }, sink, () => "2026-08-06T20:00:02.000Z", () => "event-2");
        await emitEvidence({ ...input, event_name: "event.first" }, sink, () => "2026-08-06T20:00:01.000Z", () => "event-1");
        expect(sink.query({ trace_id: context.trace_id }).map((event) => event.event_name))
            .toEqual(["event.first", "event.second"]);
        expect(sink.query({ operation_id: context.operation_id })).toHaveLength(2);
        expect(sink.query({ trace_id: "f".repeat(32) })).toEqual([]);
    });
    it("maps every correlation field to an OTLP-compatible record", async () => {
        const exporter = vi.fn();
        await emitEvidence(input, createOTLPEvidenceSink(exporter), undefined, () => "event-1");
        expect(exporter).toHaveBeenCalledWith(expect.objectContaining({
            name: input.event_name,
            traceId: input.trace_id,
            attributes: expect.objectContaining({
                "bootandstrap.event_id": "event-1",
                "bootandstrap.request_id": input.request_id,
                "bootandstrap.tenant_id": input.tenant_id,
                "bootandstrap.principal_id": input.principal_id,
                "bootandstrap.operation_id": input.operation_id,
                "service.name": "storefront",
            }),
        }));
    });
});
//# sourceMappingURL=evidence-event.test.js.map