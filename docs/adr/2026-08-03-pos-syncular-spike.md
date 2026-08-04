# ADR: Bounded POS/Syncular comparison spike

- Date: 2026-08-03
- Status: doctrine accepted; runtime dependency deferred
- Scope: disposable comparison only, outside production import paths

## Question

Should BootAndStrap integrate Syncular as POS runtime now, or retain the local
protocol while adopting the spec-first/conformance/fault-injection doctrine?

## Method and evidence

No package was installed and no production import path was changed. The spike
used the committed synthetic vectors and deterministic fault transport:

```text
pnpm --filter=storefront exec vitest run \
  src/lib/pos/offline/__tests__/pos-sync-conformance.test.ts \
  src/lib/pos/offline/__tests__/pos-sync-mutation-canary.test.ts
```

Result on template revision `19e493c48bc0c0a98b130c6e335fc24b2e7744cd`:
2 files passed, 16 tests passed, duration 101 ms. The inputs contain only
synthetic tenants, operations, amounts in integer minor units, and explicit
`beforeCommit`, `afterCommit`, and `beforeAck` barriers.

The rating below scores the committed BootAndStrap protocol evidence from 0 to
5. A Syncular package score is deliberately `N/V` where this all-local session
had no pinned, license-reviewed source artifact. Unknown evidence cannot be
upgraded into a pass.

| Criterion | Local score | Executable proof | Syncular runtime finding |
| --- | ---: | --- | --- |
| Tenant isolation | 5 | Cross-tenant record is permanently rejected before transport; comparator inversion canary is detected | N/V; doctrine is relevant, implementation not locally verified |
| Server authority | 5 | Server sequence drives acknowledgement/conflict; clock-skew vector ignores client wall-clock ordering | N/V |
| Idempotency | 5 | Stable operation/idempotency key and duplicate replay vector; duplicate-acceptance canary | N/V |
| Replay | 5 | Timeout-before-commit and timeout-after-commit/before-ack vectors converge without a second committed sale | N/V |
| Conflict semantics | 4 | Conflict is explicit and deterministic sequence resolution is tested | Product policy for automatic conflict resolution remains intentionally narrow |
| OPFS/browser support | 2 | IndexedDB is the current supported durable queue; unsupported storage reports unavailable | Syncular OPFS/browser behavior N/V; no adoption claim |
| Bundle/runtime impact | 5 | Zero new runtime dependency and zero Syncular bytes | Candidate impact N/V until a pinned bundle measurement exists |
| Maturity/operability | 3 | Versioned vectors and fault semantics are executable; real physical POS and commercial activation remain out of scope | Release cadence, license, upgrade and rollback evidence N/V |
| Failure semantics | 5 | Auth loss, timeout, conflict, tenant mismatch, unavailable state, retry class, and mutation sensitivity are explicit | N/V |

Local evidence score: 39/45. This is a confidence score for the bounded local
protocol, not a production-readiness or commercial-readiness score.

## Decision

Keep the local authoritative protocol. Adopt the Syncular-inspired discipline:
specification first, golden vectors, conformance, deterministic barriers,
mutation sensitivity, and fail-closed unavailable states. Do not add Syncular
to `package.json`, the lockfile, browser bundle, server runtime, or tenant.

A later adoption ADR must first provide a pinned and license-reviewed source
artifact, run the same ten vectors against a disposable adapter, measure browser
and server bundle cost, prove OPFS/IndexedDB fallback and multi-tab behavior,
exercise upgrade/rollback, and kill the four critical mutations. Any missing
item is a rejection, not an assumed capability.
