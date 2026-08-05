# Local Assurance Claim Integrity Design

Date: 2026-08-05
Status: approved by Principal Engineer continuity mandate
Owner: `ecommerce-template` for reusable receipts; `BOOTANDSTRAP_WEB` for consumption

## Problem

The current full local profile uses the claim boundary
`functional_system_without_commercial_activation`. That label is broader than
the evidence: the profile proves the reusable runtime source, deterministic
POS/offline protocol, local PostgreSQL persistence, static security gates,
tests, coverage ratchets and a build, but it explicitly does not prove a
deployed control-plane-to-tenant system. The generated BSWEB receipt reinforces
the contradiction by combining that claim with `deployment: not_claimed`.

The consumer also accepts any non-empty map of passed tasks. A malformed full
summary containing only one passed task can therefore satisfy the cross-repo
consumer. Finally, `risk-domain-evidence` writes a normalized summary outside
the task's declared outputs, so its bytes are not bound to the task receipt.

## Considered approaches

1. Keep the existing claim name and validate only the task count. This is the
   smallest change, but preserves an over-broad claim and leaves internal
   evidence unbound.
2. Sign local receipts. This protects against hostile mutation but introduces
   key ownership and rotation without solving the semantic boundary.
3. Separate local and system claims, require the exact full task set, and bind
   every declared evidence output. This is the selected approach because it
   closes accidental promotion without a new trust service.

## Contract

The reusable full profile emits
`local_runtime_assurance_without_commercial_activation`. The fast profile
remains `changed_scope_feedback_only`. BSWEB emits
`bootandstrap.local-system-assurance/v2` with the local claim and continues to
state `deployment: not_claimed` and `commercialActivation: not_claimed`.

`functional_system_without_commercial_activation` remains a separate BSWEB
claim requiring deployed canary/runtime evidence, exact revisions and cleanup
proof. A local v2 receipt is supporting source evidence only and cannot promote
that claim by itself.

For each template and tenant summary, BSWEB must:

- resolve the exact `full.tasks` definition;
- require summary task keys and receipt keys to equal that set exactly;
- require every task outcome to be `passed`;
- load every referenced task receipt through a repository-safe path;
- verify schema, task id, profile, claim boundary, revision, clean-tree hash,
  status, output declarations and output hashes;
- reject missing, malformed, extra or path-traversing receipts;
- retain policy/profile/task/impact hash equality across template and tenant.

`risk-domain-evidence` moves its local default summary under
`.artifacts/assurance/` and declares it as a hashed output. CI may keep its
existing explicit upload path when configured by environment.

## Failure semantics

Legacy v1 local summaries remain historical evidence but are not accepted by
the v2 consumer. Missing tasks, stale receipts, output mismatch, unavailable
required evidence or definition drift fail closed. Legitimate optional runtime
absence remains represented inside risk-domain evidence and does not become a
deployed-system claim.

