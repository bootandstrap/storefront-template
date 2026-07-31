# Cart Hydration Runtime Evidence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Distinguish cart hydration loading/error from a genuinely empty cart and prove both states with safe runtime evidence.

**Architecture:** `CartContext` becomes the sole hydration owner and exposes retryable failure state. Cart consumers render provider state, while Playwright intercepts the hydration Server Action so no real mutation occurs.

**Tech Stack:** Next.js App Router, React 19 context, TypeScript, Vitest contract tests, Playwright, axe-core.

---

### Task 1: Define the hydration state contract

**Files:**
- Modify: `apps/storefront/src/contexts/__tests__/cart-context-hydration-contract.test.ts`
- Modify: `apps/storefront/src/contexts/CartContext.tsx`

1. Add failing assertions for `hydrationError`, `retryHydration`, retained cart ID, and `null` result handling.
2. Run the focused Vitest file and confirm the new assertions fail because the API is absent.
3. Implement the smallest provider-owned retryable state machine.
4. Run the focused Vitest file and confirm it passes.
5. Commit the provider contract and implementation.

### Task 2: Make cart consumers fail closed

**Files:**
- Modify: `apps/storefront/src/contexts/__tests__/cart-context-hydration-contract.test.ts`
- Modify: `apps/storefront/src/app/[lang]/(shop)/carrito/page.tsx`
- Modify: `apps/storefront/src/components/cart/CartDrawer.tsx`
- Modify: `apps/storefront/src/lib/i18n/dictionaries/{es,en,fr,it,de}.json`

1. Add failing contract assertions that page and drawer consume provider loading/error/retry state and no longer import `getCartAction`.
2. Verify the focused test fails for the expected missing UI markers.
3. Add accessible loading/error panels, stable test IDs, retry buttons, and localized error copy.
4. Re-run focused contracts and i18n completeness tests.
5. Commit the consumer behavior.

### Task 3: Add safe runtime evidence

**Files:**
- Modify: `apps/storefront/src/lib/__tests__/ci-artifacts-contract.test.ts`
- Modify: `apps/storefront/e2e/runtime-visual-evidence.spec.ts`
- Modify: `scripts/risk-test-matrix.json`

1. Add failing contract assertions for required cart hydration loading/error evidence and non-mutating interception.
2. Verify the evidence contract fails for the missing scenario.
3. Add Playwright setup that stores a synthetic cart ID, holds the hydration Server Action, captures loading, aborts it, and captures error plus retry.
4. Run contract, type-check, lint, risk matrix, and the targeted Playwright scenario.
5. Commit the evidence increment.

### Task 4: Release and propagate

**Files:**
- Update generated evidence only under ignored `.artifacts/`.

1. Run `bash scripts/release-gate.sh` and `git diff --check` from the canonical template checkout.
2. Push the template commit, propagate the same patch to the tenant, and run its release gate.
3. Push tenant, wait for exact-SHA CI/deploy/health, and run remote Playwright with required cart states.
4. Record only functional-green evidence; make no commercial/live-readiness claim.

