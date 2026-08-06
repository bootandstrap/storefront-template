# Cross-plane observability contract

Date: 2026-08-06

Schema: `bootandstrap.evidence-event/v2`

Redaction policy: `bootandstrap.evidence-redaction/v1`

## Authority and propagation

- BSWEB is the ingress authority for a local synthetic proof. It creates `trace_id`, `request_id`, and `operation_id` only when they are absent at the trusted ingress and obtains `tenant_id` from its authorized tenant context.
- The only correlation headers are `x-trace-id`, `x-request-id`, `x-tenant-id`, and `x-operation-id`.
- Storefront and Medusa preserve all four identifiers. They reject a missing identifier or a `tenant_id` that differs from their server-side tenant authority before emitting an event or doing work.
- A downstream component cannot replace an accepted identifier. A new request may create a new `request_id`; this proof is a single request chain and therefore preserves it.

## Required event fields

Every producer emits `event_id`, `trace_id`, `request_id`, `tenant_id`, `operation_id`, `service`, `revision`, `event_name`, `outcome`, `error_code`, and `occurred_at`, plus the versioned schema and redaction policy. `trace_id` is 32 lowercase hexadecimal characters. Each `revision` is the exact 40-character producer commit used by the proof.

Attributes are optional, flat, primitive, bounded to 16 fields and 256 characters per string. Secret-shaped keys or values, raw bodies, headers, requests, responses, payloads, stacks, authorization, cookies and provider credentials are rejected rather than sanitized after persistence.

## Deterministic local sink and controlled failure

The canonical contract supplies an in-memory loopback sink and an OTLP-compatible adapter. The loopback sink supports exact `trace_id` and `operation_id` queries and orders results by `occurred_at`, then `event_id`. Sentry remains the error sink and is not replaced by this evidence channel.

The local proof performs no network or provider mutation. It emits a storefront forward event, injects `synthetic_medusa_failure` in the Medusa local-only seam, then emits the storefront failure observation. Raw downstream exceptions are reduced to an allowlisted stable `error_code`; error messages and bodies never enter evidence.

## Fail-closed outcomes

- Missing correlation identifier: reject before event emission.
- Tenant mismatch: reject before event emission.
- Unknown or raw event field: reject before sink emission.
- Secret-shaped attribute: reject before sink emission.
- Sink failure: does not change the business result, but cannot produce a passed assurance receipt.
- Empty query result: valid only as a query result; it is insufficient for the three-event synthetic-chain claim.
- Wrong order, revision, hash, service, outcome or error code: receipt generation fails.

`scripts/generate-cross-plane-runtime-evidence.mjs` executes the actual storefront and Medusa hop functions and writes `bootandstrap.cross-plane-runtime-observability/v1` atomically. BSWEB may consume and aggregate that receipt, but must not recreate either runtime producer's events.
