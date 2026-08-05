# Local Assurance Claim Integrity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent local assurance from being promoted to a deployed-system claim and make BSWEB validate the exact task receipts and evidence outputs for template and tenant.

**Architecture:** The template owns a narrower local claim plus output-bound reusable receipts. The tenant receives those definitions unchanged. BSWEB consumes them fail-closed and keeps deployed functional-system evidence as a separate claim.

**Tech Stack:** Node.js ESM, TypeScript, Vitest, JSON receipts, SHA-256, pnpm 9.

---

### Task 1: Narrow the reusable full-profile claim

**Files:**
- Modify: `scripts/assurance-policy.json`
- Modify: `scripts/assurance-profiles.json`
- Modify: `scripts/assurance-profile.test.mjs`
- Modify: `scripts/storefront-assurance.test.mjs`
- Modify: `docs/assurance-feedback-benchmark.md`

1. Change tests first to require `local_runtime_assurance_without_commercial_activation` and confirm RED.
2. Update only the policy/profile definitions and fixtures.
3. Run profile, storefront-assurance and policy tests; expect GREEN.

### Task 2: Bind risk-domain evidence to its task receipt

**Files:**
- Modify: `scripts/run-risk-domain-evidence.mjs`
- Modify: `scripts/assurance-tasks.json`
- Modify: `scripts/storefront-assurance.test.mjs`

1. Add a failing contract test requiring the normalized risk summary as a task output.
2. Move the local default to `.artifacts/assurance/risk-domain-evidence.json`.
3. Declare that output on the task and verify the focused contracts.

### Task 3: Propagate the exact reusable contract

**Files:**
- Tenant: exact synchronized files from Tasks 1-2.

1. Use the existing template-sync scope and preserve tenant overlays.
2. Verify the four assurance definition hashes are identical.
3. Run focused reusable contract tests in the tenant.

### Task 4: Harden the BSWEB consumer

**Files:**
- Modify: `src/lib/governance/certification/__tests__/local-assurance-receipts.test.ts`
- Modify: `src/lib/governance/certification/local-assurance-receipts.ts`
- Modify: `scripts/generate-local-assurance-receipt.ts`

1. Add RED tests for omitted task, extra task, missing receipt, traversal path,
   receipt identity mismatch and output hash mismatch.
2. Implement exact task-set and task-receipt validation with repository-safe
   paths and SHA-256 output checks.
3. Emit schema `bootandstrap.local-system-assurance/v2` and the local claim.
4. Run focused Vitest plus TypeScript.

### Task 5: Fresh three-repo verification

**Files:**
- Generated only: `.artifacts/assurance/**`
- Create only through the governed generator: a redacted BSWEB local receipt.

1. Run template `pnpm assurance:full -- --no-cache`.
2. Run tenant `pnpm assurance:full -- --no-cache`.
3. Generate the BSWEB v2 receipt from clean exact revisions.
4. Run BSWEB focused consumer/harness tests and `git diff --check` in all repos.
5. Report local functional assurance only; retain commercial, deployment, real
   payment/refund and physical POS prohibitions.

