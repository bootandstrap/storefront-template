# SOTA Assurance Feedback Loop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace BootAndStrap's repetitive local assurance loop with a fast/full, evidence-driven system while preserving fail-closed critical guarantees and establishing a deterministic POS/offline conformance model.

**Architecture:** `ecommerce-template` remains the canonical owner of reusable runtime assurance. A small Node.js DAG runner will select a bounded `fast` or exhaustive `full` profile, execute independent work in parallel, reuse revision-bound receipts instead of rerunning the same suite, and keep the existing risk and coverage ratchets as non-regression evidence rather than treating blanket coverage as the definition of correctness. POS/offline assurance becomes specification-first with golden vectors and fault injection; the tenant proves exact propagation, and BSWEB consumes normalized receipts without becoming the source of runtime fixes.

**Tech Stack:** Node.js 20 ESM, pnpm 9, Turborepo 2, Vitest 4/V8 coverage, Playwright, Jest, PostgreSQL 16, Docker Compose, `compose-lint` 0.14.1 via `uvx`, existing Sentry/OpenTelemetry surfaces, JSON evidence receipts.

---

## Scope and non-goals

- This plan supersedes Tasks 4–9 of `docs/plans/2026-08-03-airtight-assurance-implementation.md`. Keep the completed commits from Tasks 1–4; do not restart or reproduce them.
- All implementation and verification in this plan is local first.
- Do not use Stripe live mode, perform real payments/refunds, register Stripe Tax, operate physical POS hardware, deploy, merge, or push unless a later task explicitly receives separate authorization.
- Do not claim commercial or production readiness. The strongest permitted claim is `functional_system_without_commercial_activation` and only when its required evidence is current.
- Do not modify Sentrux baselines and never run `sentrux gate --save .`. A proposed baseline delta may be generated only in an isolated temporary path for review.
- Do not use Campifruit or the tenant proof as the source of reusable architecture.
- Keep BSWEB as the only control plane. Do not adopt Dockhand or Openship as an additional orchestrator.
- Preserve current ratchets. A fast profile may report full-only evidence as `deferred`; it must never report it as passed.

## Approved technology decisions

- Adopt [`compose-lint`](https://github.com/tmatens/compose-lint) as a pinned, read-only Compose security gate.
- Adopt the specification/golden-vector/conformance/fault-injection design demonstrated by [`syncular`](https://github.com/syncular/syncular), but do not add Syncular as a runtime dependency in this plan.
- Keep Sentry. Standardize an observability event contract before considering [`OpenObserve`](https://github.com/openobserve/openobserve) as an optional local OTLP sink.
- Evaluate [`crawlseo`](https://github.com/crawlseo/crawlseo) only as later black-box/full-profile evidence.
- Reject Dockhand and Openship as BootAndStrap architecture; record only the useful deployment patterns in an ADR.

## Required initial checkpoint

Start from template commit `2483e942` or a descendant containing it. Confirm:

```bash
git merge-base --is-ancestor 2483e942 HEAD
git status --short
```

Expected: the ancestry command exits `0`; the worktree is clean before implementation begins.

### Task 1: Freeze profile semantics with executable tests

**Files:**
- Create: `scripts/assurance-profiles.json`
- Create: `scripts/lib/assurance-profile.mjs`
- Create: `scripts/assurance-profile.test.mjs`
- Modify: `scripts/assurance-policy.json`

**Step 1: Write failing profile-contract tests**

Define tests for these invariants:

```js
test('fast never claims full functional assurance', () => {
  const result = resolveProfile(profiles, 'fast', changedFiles)
  assert.equal(result.claimBoundary, 'changed_scope_feedback_only')
  assert.ok(result.deferred.includes('full-storefront-assurance'))
})

test('critical POS changes select POS behavioral evidence', () => {
  const result = resolveProfile(profiles, 'fast', [
    'apps/storefront/src/lib/pos/offline/offline-store.ts',
  ])
  assert.ok(result.tasks.includes('pos-unit'))
})

test('full profile contains every current release gate exactly once', () => {
  const result = resolveProfile(profiles, 'full', [])
  assert.deepEqual(duplicates(result.tasks), [])
  assert.ok(REQUIRED_FULL_TASKS.every((task) => result.tasks.includes(task)))
})
```

The fast profile must always include policy validation, RLS, audit policy, schema ownership, Compose security, lint/typecheck for affected packages, and risk-selected tests. The full profile must include all current 11 release checks plus POS conformance, without duplicate unit/build executions.

**Step 2: Verify RED**

Run:

```bash
node --test scripts/assurance-profile.test.mjs
```

Expected: FAIL because the profile and resolver do not exist.

**Step 3: Implement the smallest pure resolver**

Use ordered selector rules from JSON. Reject unknown profiles, unknown tasks, path traversal, overlapping rules with contradictory claims, and critical changed files that select no behavioral task. Do not execute commands in this module.

Add these claim boundaries to the policy:

```json
{
  "claimBoundaries": {
    "fast": "changed_scope_feedback_only",
    "full": "functional_system_without_commercial_activation"
  }
}
```

**Step 4: Verify GREEN**

```bash
node --test scripts/assurance-profile.test.mjs
node scripts/check-assurance-policy.mjs
```

Expected: both commands exit `0`.

**Step 5: Commit**

```bash
git add scripts/assurance-profiles.json scripts/lib/assurance-profile.mjs scripts/assurance-profile.test.mjs scripts/assurance-policy.json
git commit -m "Define fast and full assurance profiles"
```

### Task 2: Build a safe parallel assurance DAG and normalized receipts

**Files:**
- Create: `scripts/assurance-tasks.json`
- Create: `scripts/lib/assurance-dag.mjs`
- Create: `scripts/assurance-dag.test.mjs`
- Create: `scripts/run-assurance.mjs`
- Modify: `package.json`

**Step 1: Write failing DAG tests**

Cover topological ordering, parallel-ready batches, cycle detection, dependency failure propagation, unknown dependency rejection, and receipt invalidation. Each command must be stored as an argv array, never as a shell string.

The receipt contract is:

```json
{
  "schema": "bootandstrap.assurance-task/v1",
  "profile": "fast",
  "claimBoundary": "changed_scope_feedback_only",
  "taskId": "storefront-typecheck",
  "status": "passed",
  "revision": "<git sha>",
  "workingTreeSha256": "<sha256>",
  "inputsSha256": "<sha256>",
  "toolchainSha256": "<sha256>",
  "startedAt": "<ISO timestamp>",
  "completedAt": "<ISO timestamp>",
  "outputs": []
}
```

Environment variable values and command output must not be stored in receipts. Record only an allowlisted environment-key name list.

**Step 2: Verify RED**

```bash
node --test scripts/assurance-dag.test.mjs
```

Expected: FAIL because the DAG implementation is absent.

**Step 3: Implement execution and cache validity**

- Use `spawn` with `shell: false`.
- Limit parallelism to the number of ready tasks and a configurable
  `BNS_ASSURANCE_WORKERS`. The original default of `4` was superseded by `2`
  on 2026-08-05 after fresh full runs reproduced local lint process failures
  under concurrent coverage, Playwright and build load; the isolated lint input
  remained green.
- Cache only successful tasks whose revision, dirty-tree hash, inputs hash, toolchain hash, profile semantics, and declared outputs still match.
- Write receipts atomically under `.artifacts/assurance/tasks/<task-id>.json`.
- On `SIGINT`/`SIGTERM`, stop scheduling new tasks, terminate children, and write an interrupted summary.
- Exit non-zero if a required task fails, is missing, or produces a malformed receipt.

Add scripts:

```json
{
  "assurance:fast": "node scripts/run-assurance.mjs --profile fast",
  "assurance:full": "node scripts/run-assurance.mjs --profile full"
}
```

**Step 4: Verify GREEN and failure behavior**

```bash
node --test scripts/assurance-dag.test.mjs
pnpm assurance:fast -- --dry-run
```

Expected: tests pass; dry-run prints deterministic ready batches without executing tasks or claiming success.

**Step 5: Commit**

```bash
git add scripts/assurance-tasks.json scripts/lib/assurance-dag.mjs scripts/assurance-dag.test.mjs scripts/run-assurance.mjs package.json
git commit -m "Add parallel assurance DAG runner"
```

### Task 3: Execute storefront unit and coverage evidence once

**Files:**
- Create: `scripts/run-storefront-assurance.mjs`
- Create: `scripts/storefront-assurance.test.mjs`
- Modify: `scripts/run-assurance-coverage.mjs`
- Modify: `scripts/run-risk-domain-evidence.mjs`
- Modify: `scripts/coverage-assurance.test.mjs`
- Modify: `scripts/assurance-tasks.json`
- Modify: `scripts/release-gate.sh`

**Step 1: Add failing receipt-reuse tests**

Prove that:

- a single Vitest invocation can supply unit status, JSON test results, and V8 coverage;
- risk evidence may reuse only a passed receipt for the exact revision/dirty-tree/input hashes;
- a stale, missing, malformed, failed, or mismatched receipt fails closed;
- required test files absent from the Vitest result cannot be inferred as passed;
- Playwright evidence remains a separate task and is never skipped because unit evidence exists.

**Step 2: Verify RED**

```bash
node --test scripts/storefront-assurance.test.mjs scripts/coverage-assurance.test.mjs
```

Expected: FAIL on missing reuse behavior.

**Step 3: Implement a single full Vitest execution**

Run Vitest once with coverage plus machine-readable results. Validate the test result and coverage in the same process, then emit separate normalized outputs referenced by one task receipt. `run-risk-domain-evidence.mjs` must consume that receipt for Vitest-backed domains and execute only unique non-unit evidence such as Playwright.

Keep `scripts/release-gate.sh` as a compatibility wrapper:

```bash
exec node "$ROOT_DIR/scripts/run-assurance.mjs" --profile full "$@"
```

Do not weaken any existing failure condition.

**Step 4: Measure the improvement**

Run twice from the same clean revision:

```bash
/usr/bin/time -p pnpm assurance:full
/usr/bin/time -p pnpm assurance:full
```

Expected: first run has one full Vitest invocation and one storefront build; second run reuses valid receipts. Record both timings in `docs/assurance-feedback-benchmark.md`, including machine/worker context.

**Step 5: Commit**

```bash
git add scripts/run-storefront-assurance.mjs scripts/storefront-assurance.test.mjs scripts/run-assurance-coverage.mjs scripts/run-risk-domain-evidence.mjs scripts/coverage-assurance.test.mjs scripts/assurance-tasks.json scripts/release-gate.sh docs/assurance-feedback-benchmark.md
git commit -m "Deduplicate storefront assurance execution"
```

### Task 4: Integrate pinned Compose security evidence

**Files:**
- Create: `.compose-lint.yml`
- Create: `scripts/run-compose-assurance.mjs`
- Create: `scripts/compose-assurance.test.mjs`
- Modify: `scripts/assurance-tasks.json`
- Modify: `scripts/templates/docker-compose.client.yml` only if a confirmed reusable high/critical defect requires remediation

**Step 1: Write failing wrapper tests**

The wrapper must scan exactly:

```text
docker-compose.yml
docker-compose.dev.yml
scripts/templates/docker-compose.client.yml
```

Test missing files, `uvx` absence, tool-version mismatch, malformed JSON/SARIF, HIGH/CRITICAL findings, and suppressions without a non-empty reason. No test may invoke `fix --apply`.

**Step 2: Verify RED**

```bash
node --test scripts/compose-assurance.test.mjs
```

Expected: FAIL because the wrapper does not exist.

**Step 3: Implement the read-only pinned command**

Use the locally available cached runner:

```bash
uvx --from compose-lint==0.14.1 compose-lint check \
  --strict-config --fail-on high --format sarif \
  docker-compose.yml docker-compose.dev.yml scripts/templates/docker-compose.client.yml
```

Write SARIF under `.artifacts/assurance/compose-lint.sarif`. Never print environment values and never auto-apply remediation. A suppression must remain visible and carry a concrete reason/owner/review date.

**Step 4: Triage findings without weakening policy**

For each HIGH/CRITICAL finding, either make the smallest reusable Compose correction and verify stack behavior locally, or stop with a documented blocker. Do not suppress Docker socket, host networking, privileged mode, or plaintext credentials merely to turn the gate green.

**Step 5: Verify and commit**

```bash
node --test scripts/compose-assurance.test.mjs
node scripts/run-compose-assurance.mjs
git add .compose-lint.yml scripts/run-compose-assurance.mjs scripts/compose-assurance.test.mjs scripts/assurance-tasks.json scripts/templates/docker-compose.client.yml
git commit -m "Add pinned Compose security assurance"
```

### Task 5: Add change-impact selection for the fast loop

**Files:**
- Create: `scripts/assurance-impact.json`
- Create: `scripts/lib/assurance-impact.mjs`
- Create: `scripts/assurance-impact.test.mjs`
- Modify: `scripts/run-assurance.mjs`
- Modify: `scripts/assurance-profiles.json`

**Step 1: Write failing selector tests**

Include staged, unstaged, and untracked files. Test at least these mappings:

- `apps/storefront/src/lib/pos/**` → POS behavioral tests, typecheck, policy, Compose/static gates.
- `apps/storefront/src/lib/security/**` → security/auth domain tests and mutation canaries.
- `apps/storefront/src/lib/backup/**` → backup/restore tests and cleanup evidence.
- `docker-compose*.yml` or template Compose → Compose assurance.
- lockfile/package manifests → audit, lint, typecheck, affected tests, and build.
- assurance scripts/policy → all assurance contract tests plus a full-profile dry-run.
- unknown critical-classified source → fail closed, not “no tests needed.”

**Step 2: Verify RED**

```bash
node --test scripts/assurance-impact.test.mjs
```

**Step 3: Implement deterministic change discovery**

Use Git argv calls, not shell interpolation. The default comparison is merge-base against the configured base ref plus dirty/untracked files. Support `--base <sha>` for reproducible local checks. Print selected tasks and reasons before running them.

**Step 4: Verify the latency budget**

```bash
/usr/bin/time -p pnpm assurance:fast -- --base HEAD~1
```

Expected: under 90 seconds on the recorded development machine for a small POS-only change. If it exceeds the budget, record the slow tasks and fix selection/caching rather than deleting required evidence.

**Step 5: Commit**

```bash
git add scripts/assurance-impact.json scripts/lib/assurance-impact.mjs scripts/assurance-impact.test.mjs scripts/run-assurance.mjs scripts/assurance-profiles.json docs/assurance-feedback-benchmark.md
git commit -m "Select fast assurance by change impact"
```

### Task 6: Establish the POS/offline executable protocol

**Files:**
- Create: `apps/storefront/src/lib/pos/offline/pos-sync-protocol.ts`
- Create: `apps/storefront/src/lib/pos/offline/__tests__/fixtures/pos-sync-golden-vectors.json`
- Create: `apps/storefront/src/lib/pos/offline/__tests__/pos-sync-fault-transport.ts`
- Create: `apps/storefront/src/lib/pos/offline/__tests__/pos-sync-conformance.test.ts`
- Modify: `apps/storefront/src/lib/pos/offline/offline-store.ts`
- Modify: `apps/storefront/src/lib/pos/offline/useOfflineSync.ts`
- Modify: `apps/storefront/src/lib/pos/usePOSSync.ts`
- Modify: `scripts/risk-test-matrix.json`

**Step 1: Define golden-vector data without production changes**

Use integer minor currency units and synthetic tenant/order identifiers. Each vector declares initial server sequence, queued operations, injected fault points, and expected durable state. Include:

1. normal ordered commit;
2. duplicate replay with the same idempotency key;
3. tenant mismatch rejection;
4. authentication loss before commit;
5. timeout before server commit;
6. timeout after server commit but before client acknowledgement;
7. crash after local persistence;
8. server conflict and deterministic resolution;
9. backoff/retry without duplicate sale;
10. clock skew with server ordering authoritative.

**Step 2: Write the failing conformance harness**

The fault transport exposes explicit barriers such as `beforeCommit`, `afterCommit`, and `beforeAck`. Tests advance barriers directly; `setTimeout`, polling sleeps, wall-clock waits, real Stripe calls, and physical hardware are forbidden.

```bash
pnpm --filter=storefront exec vitest run src/lib/pos/offline/__tests__/pos-sync-conformance.test.ts
```

Expected: RED for missing protocol semantics.

**Step 3: Implement one authoritative path**

Create a minimal protocol around tenant ID, operation ID/idempotency key, client sequence, authoritative server sequence, state, and retry classification. Adapt the existing IndexedDB queue to the protocol. Unsupported environments must return an explicit unavailable/error result; they must not silently report success.

**Step 4: Mutation-check critical decisions**

Add or extend the existing mutation-canary task so that tenant comparison inversion, duplicate acceptance, sequence comparison inversion, and retryable/permanent classification changes are killed by the conformance tests.

**Step 5: Verify and commit**

```bash
pnpm --filter=storefront exec vitest run src/lib/pos/offline/__tests__/pos-sync-conformance.test.ts
pnpm assurance:fast
git add apps/storefront/src/lib/pos/offline apps/storefront/src/lib/pos/usePOSSync.ts scripts/risk-test-matrix.json
git commit -m "Define POS offline sync conformance"
```

### Task 7: Normalize observability as testable evidence

**Files:**
- Create: `apps/storefront/src/lib/observability/evidence-event.ts`
- Create: `apps/storefront/src/lib/observability/__tests__/evidence-event.test.ts`
- Modify: `apps/storefront/src/lib/logger.ts`
- Modify: `apps/storefront/src/lib/observability/report-error.ts`
- Modify: `apps/storefront/src/instrumentation.ts`
- Modify: `apps/medusa/instrumentation.ts`

**Step 1: Write failing schema/redaction tests**

Require `trace_id`, non-secret `tenant_id`, revision, operation, outcome, duration, and error class. Reject secret-shaped keys/values and high-cardinality raw payloads. Prove that a sink failure never changes the business result.

**Step 2: Verify RED**

```bash
pnpm --filter=storefront exec vitest run src/lib/observability/__tests__/evidence-event.test.ts
```

**Step 3: Implement a sink-neutral event contract**

Keep Sentry behavior intact. Add an injectable in-memory sink for tests and a pluggable OTLP-compatible boundary; do not require OpenObserve to run tests. Correlate BSWEB → storefront → Medusa using the existing `trace_id` path and propagate only allowlisted fields.

**Step 4: Verify and commit**

```bash
pnpm --filter=storefront exec vitest run src/lib/observability/__tests__/evidence-event.test.ts src/lib/observability/__tests__/report-error.test.ts
pnpm assurance:fast
git add apps/storefront/src/lib/observability apps/storefront/src/lib/logger.ts apps/storefront/src/instrumentation.ts apps/medusa/instrumentation.ts
git commit -m "Standardize assurance observability events"
```

### Task 8: Record bounded external-tool and Sentrux decisions

**Files:**
- Create: `docs/adr/2026-08-03-assurance-tooling-boundaries.md`
- Create: `docs/adr/2026-08-03-pos-syncular-spike.md`
- Create: `docs/assurance/sentrux-baseline-review.md`

**Step 1: Capture accepted/rejected boundaries**

Document compose-lint adoption, OpenObserve local-sink prerequisites, CrawlSEO full-profile-only evaluation, and rejection of Dockhand/Openship as architecture. Include license and privileged-surface review requirements.

**Step 2: Run a bounded Syncular comparison without product integration**

Evaluate the committed POS golden vectors against a disposable spike outside production import paths. Score tenant isolation, server authority, idempotency, replay, conflicts, OPFS/browser support, bundle impact, maturity, and failure semantics. Do not add Syncular to runtime dependencies unless a later ADR explicitly accepts it.

**Step 3: Review Sentrux without mutating its baseline**

Run the normal read-only gate and capture findings:

```bash
sentrux gate .
```

If baseline experimentation is needed, create a validated `mktemp -d` target and keep the proposed delta outside the repo. Never use `sentrux gate --save .`. The review must distinguish code defects from proposed baseline-policy changes.

**Step 4: Commit documentation**

```bash
git add docs/adr/2026-08-03-assurance-tooling-boundaries.md docs/adr/2026-08-03-pos-syncular-spike.md docs/assurance/sentrux-baseline-review.md
git commit -m "Document assurance tooling boundaries"
```

### Task 9: Prove template completion locally

**Files:**
- Modify: `docs/assurance-feedback-benchmark.md`
- Generated only: `.artifacts/assurance/**` (do not commit unless existing governance explicitly requires it)

**Step 1: Run fresh contract checks**

```bash
node --test scripts/assurance-profile.test.mjs scripts/assurance-dag.test.mjs scripts/storefront-assurance.test.mjs scripts/compose-assurance.test.mjs scripts/assurance-impact.test.mjs scripts/coverage-assurance.test.mjs
```

**Step 2: Run both profiles**

```bash
pnpm assurance:fast
pnpm assurance:full -- --no-cache
```

Expected: fast emits only `changed_scope_feedback_only`; full emits `functional_system_without_commercial_activation`. Both fail if a required receipt is absent or stale.

**Step 3: Verify no hidden damage**

```bash
git diff --check
git status --short
git diff --name-only HEAD~1..HEAD
```

Confirm no secrets, Sentrux baseline changes, live Stripe configuration, deploy mutations, or unrelated BSWEB files exist.

**Step 4: Request code review and commit any evidence-doc corrections**

Use `requesting-code-review` before declaring the template phase complete. Apply only verified review findings, rerun the affected profile, and commit corrections separately.

### Task 10: Propagate and consume evidence without changing ownership

**Files:**
- Tenant: propagate exact reusable commits and sync-manifest entries to `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/store-tenant-1-0-test`
- BSWEB: add receipt consumers/tests under the existing certification ownership in `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/BOOTANDSTRAP_WEB/.worktrees/bns-360-program`

**Step 1: Check workspace ownership before editing BSWEB**

Inspect status and coordinate around the performance agent's files. If changes overlap, stop with the exact paths; do not combine the work.

**Step 2: Propagate template commits exactly**

Update the tenant through the existing template-sync mechanism. Verify policy/profile/task hashes and tool version are identical. Tenant-specific code may provide fixtures or environment bindings but may not redefine reusable thresholds or protocol semantics.

**Step 3: Run tenant local proof**

```bash
pnpm assurance:fast
pnpm assurance:full -- --no-cache
```

Add local PostgreSQL/Medusa integration and cleanup-residue checks required by the full profile. Remove only explicitly created ephemeral resources.

**Step 4: Add fail-closed BSWEB receipt consumption**

Write tests first for missing, stale, revision-mismatched, policy-hash-mismatched, profile-mismatched, or failed receipts. BSWEB orchestrates the claim; it does not rerun or own tenant runtime logic. Do not modify Sentrux baselines.

**Step 5: Run the three-repo local certification**

The final local receipt must identify exact template, tenant, and BSWEB revisions and must make no deployment or commercial-readiness claim. Real POS end-to-end remains a separately authorized phase after this local proof is reviewed.

## Completion criteria

- `assurance:fast` is measurably below the agreed local latency budget for a small change.
- `assurance:full` performs one storefront unit/coverage execution and one storefront build per input hash.
- Critical evidence remains fail-closed; deferred evidence is explicit and never represented as passed.
- Compose files have pinned, auditable high/critical security evidence.
- POS offline behavior is defined by executable golden vectors and deterministic fault injection.
- Observability evidence is correlated and testable without requiring a third-party backend.
- Template and tenant assurance definitions are hash-identical; BSWEB only consumes normalized receipts.
- No secrets, live Stripe/POS mutations, Sentrux baseline mutations, deployment, or commercial-readiness claim occurred.
