# Order Lookup Runtime Evidence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add fail-closed visual runtime evidence for guest order lookup loading and not-found/error states without real mutations.

**Architecture:** Extend the existing Playwright runtime visual spec to intercept the order lookup POST, hold it pending for loading evidence, then return a synthetic 404 for error evidence. Add only stable evidence hooks and an accessible alert to the existing page; keep the current risk-domain command and strengthen its contracts.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Playwright, Vitest, axe-core, pnpm.

---

### Task 1: Establish the fail-closed contract

**Files:**
- Modify: `apps/storefront/src/lib/__tests__/ci-artifacts-contract.test.ts`
- Modify: `scripts/risk-test-matrix.json`

**Step 1: Write the failing contract assertions**

Require the runtime visual spec to contain:

- `order-lookup-loading`
- `order-lookup-not-found`
- `/api/orders/lookup`
- `order-lookup-submit`
- `order-lookup-spinner`
- `order-lookup-error`
- dedicated loading and error evidence attachment names

Require the visual risk failure mode to mention order lookup loading and
not-found/error states.

**Step 2: Run the focused contract**

Run:

```bash
pnpm --filter=storefront exec vitest run src/lib/__tests__/ci-artifacts-contract.test.ts
```

Expected: FAIL because the order lookup runtime harness does not exist yet.

**Step 3: Commit the RED contract**

```bash
git add apps/storefront/src/lib/__tests__/ci-artifacts-contract.test.ts scripts/risk-test-matrix.json
git commit -m "test: require order lookup runtime evidence"
```

### Task 2: Expose real order lookup states

**Files:**
- Modify: `apps/storefront/src/app/[lang]/(shop)/pedido/page.tsx`

**Step 1: Add minimal stable evidence hooks**

Add testids to the email input, order ID input, submit button, loading spinner,
and error container. Add `role="alert"` to the error container. Do not change
copy, request behavior, or locale dictionaries.

**Step 2: Run the focused contract**

Run:

```bash
pnpm --filter=storefront exec vitest run src/lib/__tests__/ci-artifacts-contract.test.ts
```

Expected: still FAIL because the Playwright runtime harness is absent.

### Task 3: Implement loading and not-found runtime evidence

**Files:**
- Modify: `apps/storefront/e2e/runtime-visual-evidence.spec.ts`

**Step 1: Add the order lookup state definition**

Define a single order lookup state that targets `/es/pedido` and
`/api/orders/lookup`.

**Step 2: Add the deterministic request controller**

Intercept the next matching POST. Expose a release method that fulfills the
request with a synthetic 404 JSON response. Keep cleanup in `finally`.

**Step 3: Add visible assertions**

Fill the real form, submit, verify disabled button and visible spinner, capture
loading screenshot plus axe results, release the 404, verify the alert, and
capture error screenshot plus axe results.

**Step 4: Run the focused contract**

Run:

```bash
pnpm --filter=storefront exec vitest run src/lib/__tests__/ci-artifacts-contract.test.ts
```

Expected: PASS.

**Step 5: Run the risk matrix validator**

Run:

```bash
node scripts/check-risk-test-matrix.mjs
```

Expected: PASS.

**Step 6: Commit the implementation**

```bash
git add apps/storefront/src/app/[lang]/\\(shop\\)/pedido/page.tsx apps/storefront/e2e/runtime-visual-evidence.spec.ts
git commit -m "test: capture order lookup runtime states"
```

### Task 4: Record and verify template source

**Files:**
- Modify: `docs/operations/2026-07-13-bns-360-full-system-certification.md`

**Step 1: Record the evidence boundary**

Document that order lookup loading and synthetic not-found/error evidence is
non-mutating, template-owned, and does not imply commercial readiness.

**Step 2: Run focused verification**

```bash
pnpm --filter=storefront exec vitest run src/lib/__tests__/ci-artifacts-contract.test.ts
node scripts/check-risk-test-matrix.mjs
git diff --check
```

Expected: PASS.

**Step 3: Run the release gate**

```bash
bash scripts/release-gate.sh
```

Expected: PASS or an explicitly documented pre-existing coverage warning only.

**Step 4: Enforce tenant CI fail-closed**

Require `POST /api/orders/lookup`, wait until the route is intercepted, pass
`BNS_RUNTIME_REQUIRE_ORDER_LOOKUP_STATES` through the evidence runner, and set
that flag in tenant CI with the standard tenant Supabase Actions secrets and
tenant ID Actions variable. The contract test must reject removal of any of
these safeguards.

**Step 5: Commit documentation**

```bash
git add docs/operations/2026-07-13-bns-360-full-system-certification.md docs/plans/2026-07-31-order-lookup-runtime-evidence-design.md docs/plans/2026-07-31-order-lookup-runtime-evidence.md
git commit -m "docs: record order lookup runtime evidence"
```

### Task 5: Integrate template and propagate tenant proof

**Files:**
- Propagate the verified template files to `store-tenant-1-0-test`

**Step 1: Push the template feature branch**

```bash
git push -u origin feat/order-lookup-runtime-evidence
```

**Step 2: Integrate into template main**

Merge the verified feature branch without rewriting unrelated user changes,
then push `main`.

**Step 3: Propagate exact reusable files**

Copy the verified source changes from template main into the tenant proof,
preserving tenant-only overlays and excluding design-only implementation plans
unless the repo convention requires them.

**Step 4: Run tenant verification**

```bash
pnpm --filter=storefront exec vitest run src/lib/__tests__/ci-artifacts-contract.test.ts
node scripts/check-risk-test-matrix.mjs
bash scripts/release-gate.sh
git diff --check
```

Expected: PASS with the same allowed coverage warning boundary.

**Step 5: Commit and push tenant propagation**

Commit only the propagated reusable files and push tenant `main`.

### Task 6: Verify remote proof

**Files:**
- No source changes expected

**Step 1: Watch tenant workflows**

Use `gh run list` and `gh run watch` for CI, Build & Deploy, Governance Quality
Gate, Lighthouse Build, and Lighthouse Deploy associated with the tenant commit.

**Step 2: Verify public health**

```bash
curl -fsS https://tenant-1-0-test.bootandstrap.com/api/health | jq .
```

Expected: healthy response naming the propagated tenant commit.

**Step 3: Run remote runtime evidence**

```bash
BNS_360_BASE_URL=https://tenant-1-0-test.bootandstrap.com \
BNS_RUNTIME_REQUIRE_INTERACTIVE_STATES=1 \
pnpm --filter=storefront exec playwright test e2e/runtime-visual-evidence.spec.ts
```

Expected: all runtime visual tests pass, including order lookup loading and
not-found/error evidence.

**Step 4: Record final source/proof receipt**

Report template commit, tenant commit, focused checks, release gates, workflow
IDs, public health SHA, remote Playwright count, and any remaining non-commercial
residual separately.
