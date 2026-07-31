# Checkout Method Runtime Evidence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make payment-method discovery fail closed and prove its loading, error, and retry states without payment or order mutations.

**Architecture:** `CheckoutModal` owns a retryable method-loading callback and passes its explicit state to `CheckoutMethodStep`; Playwright intercepts only an availability Server Action on the disposable evidence cart.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest contract tests, Playwright, axe-core.

---

### Task 1: Define the fail-closed checkout method contract

**Files:**
- Add: `apps/storefront/src/components/checkout/__tests__/checkout-method-runtime-contract.test.ts`
- Modify: `apps/storefront/src/components/checkout/CheckoutModal.tsx`
- Modify: `apps/storefront/src/components/checkout/steps/CheckoutMethodStep.tsx`
- Modify: `apps/storefront/src/lib/i18n/dictionaries/{es,en,fr,it,de}.json`

1. Add failing assertions for caught method discovery, distinct error state,
   retry wiring, stable test IDs, and accessible semantics.
2. Run the focused Vitest file and confirm it fails for the missing contract.
3. Implement the smallest retryable method-loading state and visible UI.
4. Run focused checkout and i18n tests, type-check, and lint.
5. Commit the runtime behavior.

### Task 2: Add safe runtime evidence

**Files:**
- Modify: `apps/storefront/src/lib/__tests__/ci-artifacts-contract.test.ts`
- Modify: `apps/storefront/e2e/runtime-visual-evidence.spec.ts`
- Modify: `scripts/risk-test-matrix.json`

1. Add failing contract assertions for checkout method loading/error/retry
   evidence and availability-only interception.
2. Verify the evidence contract fails for the missing scenario.
3. Extend the existing disposable-cart checkout journey, hold and abort a
   payment availability action, capture loading/error, and prove retry.
4. Run focused contracts, risk matrix, type-check, lint, and targeted
   Playwright.
5. Commit the evidence increment.

### Task 3: Release and propagate

**Files:**
- Update generated evidence only under ignored `.artifacts/`.

1. Run `bash scripts/release-gate.sh` and `git diff --check` in the canonical
   template worktree.
2. Push template main, apply the exact source diff to the tenant, and run its
   release gate.
3. Push tenant, wait for exact-SHA CI/deploy/health, and run strict remote
   Playwright.
4. Record functional evidence only; do not claim commercial/live readiness.
