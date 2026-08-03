# Airtight Local Assurance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fail-closed, risk-weighted local assurance gate across the reusable storefront, Medusa runtime, tenant proof and BSWEB certification.

**Architecture:** The template owns a versioned assurance policy and deterministic runners. Unit suites stay repo-hermetic; critical domains prove real source execution and mutation sensitivity, while BSWEB consumes normalized cross-repo receipts.

**Tech Stack:** Node.js ESM, Vitest/V8 coverage, Jest/SWC coverage, Playwright, PostgreSQL 16, Git, GitHub Actions contract tests.

---

### Task 1: Make the reusable unit suite hermetic

**Files:**
- Create: `apps/storefront/src/lib/__tests__/unit-suite-hermeticity.test.ts`
- Modify: `apps/storefront/src/lib/__tests__/admin-owner-crud-contract.test.ts`

**Steps:**
1. Add a failing test that rejects direct `BSWEB_ROOT` and `BOOTANDSTRAP_WEB` reads from normal storefront unit tests.
2. Run the focused test and confirm it fails on `admin-owner-crud-contract.test.ts`.
3. Replace its BSWEB assertions with equivalent template-local RLS, rate-limit, idempotency and secret-storage contracts.
4. Run both files and then the full suite without `BSWEB_ROOT`.
5. Commit the hermeticity fix.

### Task 2: Introduce the versioned assurance policy

**Files:**
- Create: `scripts/assurance-policy.json`
- Create: `scripts/check-assurance-policy.mjs`
- Create: `apps/storefront/src/lib/__tests__/assurance-policy-contract.test.ts`

**Steps:**
1. Add failing schema and completeness tests for source-universe classification, critical ownership and explicit exclusions.
2. Run the focused test and confirm the policy is missing.
3. Add the minimal policy and validator that classify every eligible storefront source file.
4. Require exact critical operational source lists for auth/isolation, checkout/payment, POS, provisioning/cleanup and release evidence.
5. Run the validator and focused tests; commit.

### Task 3: Replace warning-only coverage with a normalized fail-closed gate

**Files:**
- Create: `scripts/run-assurance-coverage.mjs`
- Create: `scripts/lib/coverage-assurance.mjs`
- Create: `scripts/__tests__/coverage-assurance.test.mjs`
- Modify: `apps/storefront/vitest.config.ts`
- Modify: `scripts/release-gate.sh`
- Modify: `.github/workflows/ci.yml`
- Modify: `apps/storefront/src/lib/__tests__/ci-artifacts-contract.test.ts`

**Steps:**
1. Add failing tests for stale/missing reports, global regression, unclassified source and critical-domain threshold failures.
2. Implement pure report parsing and deterministic policy evaluation.
3. Add a runner that deletes only its own old report, executes full coverage, validates it and emits a revision-bound JSON receipt.
4. Change release/CI coverage from warning-only `70%` to the assurance runner.
5. Verify RED/GREEN cases and commit.

### Task 4: Close critical storefront execution gaps

**Files:**
- Test/modify as indicated by the policy under `apps/storefront/src/lib/security/**`, `panel-auth.ts`, `panel-guard.ts`, `pos/**`, `backup/**` and payment/checkout modules.

**Steps for each critical file:**
1. Add one behavioral test for an uncovered success or failure branch.
2. Run it and confirm the expected RED behavior or coverage threshold failure.
3. Add only the fixture seam or production fix required by the test.
4. Re-run the domain and assurance coverage gate.
5. Raise the domain/global ratchet and commit the slice.

### Task 5: Add mutation canaries for critical decisions

**Files:**
- Create: `scripts/critical-mutation-canaries.json`
- Create: `scripts/run-critical-mutation-canaries.mjs`
- Create: `scripts/__tests__/critical-mutation-canaries.test.mjs`
- Modify: `scripts/release-gate.sh`
- Modify: `.github/workflows/ci.yml`

**Steps:**
1. Add failing runner tests proving a surviving mutation blocks the gate.
2. Define bounded mutations for authorization inversion, limit comparison, idempotency duplicate handling, payment-method enablement and cleanup residue.
3. Run mutants in isolated temporary copies and require every mutant to be killed.
4. Add the runner to local/CI gates and commit.

### Task 6: Cover Medusa and shared packages

**Files:**
- Modify: `apps/medusa/jest.config.js`
- Modify: `apps/medusa/package.json`
- Add focused tests under `apps/medusa/src/**/__tests__/`
- Modify package-level Vitest configs/scripts where required.

**Steps:**
1. Generate truthful unit coverage for Medusa source and identify critical zero-coverage modules.
2. Add a ratchet and per-module thresholds for POS, tenant isolation and event/subscriber behavior.
3. Preserve the real PostgreSQL module integration as separate evidence.
4. Add coverage for `packages/shared` and `packages/platform-contract`; fail if a package silently has no tests.
5. Verify and commit.

### Task 7: Propagate to the tenant proof

**Files:**
- Propagate the exact reusable commits to `store-tenant-1-0-test`.

**Steps:**
1. Verify the sync manifest contains every assurance file.
2. Apply the template commits without tenant-authored architecture divergence.
3. Run policy, coverage, mutation, Medusa/PostgreSQL and release gates locally.
4. Confirm receipt policy hashes match the template; commit propagation.

### Task 8: Make BSWEB consume system assurance evidence

**Files:**
- Create/modify under `scripts/` and `src/lib/governance/certification/` based on existing certification generators.
- Add tests under `src/lib/governance/certification/__tests__/`.

**Steps:**
1. Add failing tests for missing, stale, revision-mismatched or regressed template/tenant assurance receipts.
2. Extend certification to ingest normalized receipts without changing Sentrux baselines.
3. Require policy hash equality between template and tenant.
4. Run functional-confidence, artifact leak scan, Sentrux and Fallow checks; commit.

### Task 9: Final local closure LOOP

**Files:**
- Create final receipts under the existing governed artifact location.
- Update the local closure document.

**Steps:**
1. Run all full builds, test suites, assurance coverage and mutation gates from clean worktrees.
2. Run PostgreSQL integration, verify zero residue and remove the exact ephemeral container.
3. Run browser/runtime evidence with explicit unavailable-state semantics.
4. Verify all worktrees are clean and no secrets or baseline files changed.
5. Report remaining non-critical ratchet debt explicitly; make no commercial-readiness claim.
