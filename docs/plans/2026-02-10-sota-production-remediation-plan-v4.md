# SOTA Production Remediation Plan v4 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** cerrar todos los gaps criticos de seguridad, correctitud, CI y operacion para dejar `CAMPIFRUT` + `bootandstrap-admin` en un estado de produccion SOTA verificable y repetible.

**Architecture:** ejecutar por olas de riesgo: P0 (correctitud y seguridad), P1 (quality gates veraces), P2 (operacion y observabilidad), P3 (documentacion y release). Cada cambio debe entrar con test que falle primero y terminar con evidencia automatizada (lint, tests, build, CI dry-run) sin falsos verdes.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (RLS + migrations + RPC), Medusa v2, pnpm + Turborepo, Vitest, Playwright, GitHub Actions, Docker.

**Execution Skills:** `@superpowers:test-driven-development`, `@superpowers:systematic-debugging`, `@superpowers:verification-before-completion`, `@superpowers:pre-commit-quality`.

---

### Task 1: Fix Tenant-Scoped Config Fetch (No Silent Fallback In Healthy Production)

**Files:**
- Create: `CAMPIFRUT/apps/storefront/src/lib/supabase/admin.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/lib/config.ts`
- Create: `CAMPIFRUT/apps/storefront/src/lib/__tests__/config-fetch-authz.test.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/lib/supabase/server.ts`

**Step 1: Write the failing test**

```ts
it('uses service-role server client for config/flags/limits fetch', async () => {
  // unauthenticated context should still read tenant-scoped config
  // without falling back when DB is reachable
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/lib/__tests__/config-fetch-authz.test.ts`
Expected: FAIL (still using anon client path).

**Step 3: Write minimal implementation**

- Add `createAdminClient()` in storefront server-only lib.
- In `getConfig()`, use admin client + mandatory `.eq('tenant_id', tenantId)` on all governance tables.
- Keep fallback only for explicit infra failures, not RLS-denied normal path.

**Step 4: Run tests to verify pass**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/lib/__tests__/config-fetch-authz.test.ts`
Run: `pnpm -C CAMPIFRUT/apps/storefront test:run`
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/lib/supabase/admin.ts apps/storefront/src/lib/config.ts apps/storefront/src/lib/supabase/server.ts apps/storefront/src/lib/__tests__/config-fetch-authz.test.ts
git -C CAMPIFRUT commit -m "fix: use service-role tenant-scoped config fetch in storefront"
```

### Task 2: Enforce Server-Only Tenant ID Contract

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/lib/config.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/lib/__tests__/config-schema.test.ts`
- Modify: `CAMPIFRUT/.env.example`
- Modify: `CAMPIFRUT/docs/guides/DEVELOPMENT.md`

**Step 1: Write the failing test**

```ts
it('does not accept NEXT_PUBLIC_TENANT_ID as server fallback in production', () => {
  // expect throw when TENANT_ID is missing in production
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/lib/__tests__/config-schema.test.ts`
Expected: FAIL (current fallback allows NEXT_PUBLIC_TENANT_ID).

**Step 3: Write minimal implementation**

- `getRequiredTenantId()` must read only `TENANT_ID` on server.
- Keep dev placeholder only in local development.
- Update docs/env templates to reflect strict contract.

**Step 4: Run tests to verify pass**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/lib/__tests__/config-schema.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/lib/config.ts apps/storefront/src/lib/__tests__/config-schema.test.ts .env.example docs/guides/DEVELOPMENT.md
git -C CAMPIFRUT commit -m "sec: enforce server-only tenant id contract"
```

### Task 3: Correct Guest Order Lookup Logic + Abuse Protection

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/app/api/orders/lookup/route.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/app/api/orders/lookup/__tests__/route.test.ts`
- Create: `CAMPIFRUT/apps/storefront/src/lib/security/order-lookup-rate-limit.ts`
- Modify: `CAMPIFRUT/docs/operations/API_REFERENCE.md`

**Step 1: Write the failing tests**

```ts
it('queries target order deterministically (not first page only)', async () => {})
it('returns 429 after threshold for same IP/email tuple', async () => {})
```

**Step 2: Run tests to verify fail**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/app/api/orders/lookup/__tests__/route.test.ts`
Expected: FAIL (current implementation fetches generic list limit=1, no limiter).

**Step 3: Write minimal implementation**

- Query Medusa with explicit identifier strategy (display_id constrained, paginated fallback, strict bound).
- Keep response minimal fields.
- Add dedicated rate limiter for lookup endpoint.

**Step 4: Run tests to verify pass**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/app/api/orders/lookup/__tests__/route.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/app/api/orders/lookup/route.ts apps/storefront/src/app/api/orders/lookup/__tests__/route.test.ts apps/storefront/src/lib/security/order-lookup-rate-limit.ts docs/operations/API_REFERENCE.md
git -C CAMPIFRUT commit -m "fix: make guest order lookup deterministic and rate-limited"
```

### Task 4: Make Stripe Webhook Idempotent and Deterministic

**Files:**
- Create: `CAMPIFRUT/supabase/migrations/20260210_stripe_webhook_events.sql`
- Modify: `CAMPIFRUT/apps/storefront/src/app/api/webhooks/stripe/route.ts`
- Create: `CAMPIFRUT/apps/storefront/src/app/api/webhooks/stripe/__tests__/route.test.ts`
- Modify: `CAMPIFRUT/docs/operations/API_REFERENCE.md`

**Step 1: Write failing tests**

```ts
it('processes each stripe event id once', async () => {})
it('does not duplicate email/analytics on webhook retries', async () => {})
```

**Step 2: Run tests to verify fail**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/app/api/webhooks/stripe/__tests__/route.test.ts`
Expected: FAIL (no idempotency store).

**Step 3: Write minimal implementation**

- Persist processed event ids (`stripe_webhook_events` table with unique event_id).
- Exit early when duplicate event is received.
- Ensure Medusa completion path uses required auth headers and consistent error handling.

**Step 4: Run tests to verify pass**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/app/api/webhooks/stripe/__tests__/route.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add supabase/migrations/20260210_stripe_webhook_events.sql apps/storefront/src/app/api/webhooks/stripe/route.ts apps/storefront/src/app/api/webhooks/stripe/__tests__/route.test.ts docs/operations/API_REFERENCE.md
git -C CAMPIFRUT commit -m "sec: add idempotent stripe webhook processing"
```

### Task 5: Repair Release Gate So It Actually Runs Storefront Tests

**Files:**
- Modify: `CAMPIFRUT/scripts/release-gate.sh`
- Create: `CAMPIFRUT/scripts/__tests__/release-gate-smoke.sh`
- Modify: `CAMPIFRUT/docs/RUNBOOK.md`

**Step 1: Write failing smoke check**

```bash
# assert that release-gate test command fails if storefront tests fail
```

**Step 2: Run check to verify fail**

Run: `bash CAMPIFRUT/scripts/__tests__/release-gate-smoke.sh`
Expected: FAIL (current `pnpm --filter=storefront vitest run` reports "no script" but exits 0).

**Step 3: Write minimal implementation**

- Replace command with explicit script that fails on test failures (`pnpm -C apps/storefront test:run` or `pnpm --filter=storefront test:run`).
- Mark warnings vs blockers intentionally (document policy).

**Step 4: Verify**

Run: `bash CAMPIFRUT/scripts/release-gate.sh`
Expected: PASS only when real tests run and pass.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add scripts/release-gate.sh scripts/__tests__/release-gate-smoke.sh docs/RUNBOOK.md
git -C CAMPIFRUT commit -m "build: fix release gate false-green test command"
```

### Task 6: Harden CI for Real Integration and Remove Non-Blocking Escapes

**Files:**
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`
- Create: `CAMPIFRUT/scripts/ci/start-medusa-stack.sh`
- Modify: `CAMPIFRUT/apps/storefront/playwright.config.ts`
- Modify: `CAMPIFRUT/apps/storefront/lighthouserc.js`

**Step 1: Write failing CI validation checklist**

```txt
- e2e must start Medusa
- lighthouse must fail on failing assertions
- medusa-tests must run at least one integration suite
```

**Step 2: Run local dry-run to verify gaps**

Run: `bash CAMPIFRUT/scripts/ci/start-medusa-stack.sh`
Expected: FAIL initially if script missing.

**Step 3: Write minimal implementation**

- Start Medusa + Redis for E2E.
- Run real Medusa integration tests (not only build/type-check).
- Remove `|| echo` in Lighthouse CI.
- Keep deterministic env and readiness checks.

**Step 4: Verify**

Run: `pnpm -C CAMPIFRUT/apps/medusa test:integration:http`
Run: `BASE_URL=http://localhost:3000 pnpm -C CAMPIFRUT/apps/storefront playwright test`
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add .github/workflows/ci.yml scripts/ci/start-medusa-stack.sh apps/storefront/playwright.config.ts apps/storefront/lighthouserc.js
git -C CAMPIFRUT commit -m "ci: enforce real medusa-backed e2e and blocking lighthouse gates"
```

### Task 7: Strengthen E2E Specs to Business Assertions (No Weak Truthy Checks)

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/e2e/homepage.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/products.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/cart.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/checkout.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/auth.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/components/**` (stable `data-testid`)

**Step 1: Write failing assertions**

```ts
await expect(page.getByTestId('checkout-submit')).toBeEnabled()
await expect(page.getByTestId('cart-count')).toHaveText('1')
```

**Step 2: Run E2E to verify fail**

Run: `pnpm -C CAMPIFRUT/apps/storefront playwright test`
Expected: FAIL due missing stable selectors/assertions.

**Step 3: Write minimal implementation**

- Add deterministic test ids to critical flow.
- Replace broad selectors and `toBeTruthy()` with business-level assertions.

**Step 4: Verify**

Run: `pnpm -C CAMPIFRUT/apps/storefront playwright test`
Expected: PASS with deterministic assertions.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/e2e apps/storefront/src/components
git -C CAMPIFRUT commit -m "test: convert storefront e2e to deterministic business assertions"
```

### Task 8: Fix Next Workspace Root Inference and Runtime Drift

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/next.config.ts`
- Modify: `bootandstrap-admin/next.config.ts`
- Modify: `bootandstrap-admin/.github/workflows/ci.yml`
- Modify: `bootandstrap-admin/Dockerfile`
- Modify: `CAMPIFRUT/apps/storefront/Dockerfile`

**Step 1: Write failing verification commands**

Run: `pnpm -C CAMPIFRUT/apps/storefront build`
Run: `pnpm -C bootandstrap-admin build`
Expected: warnings for inferred root and inconsistent toolchain.

**Step 2: Apply minimal implementation**

- Set `turbopack.root` explicitly in both Next configs.
- Align Node + pnpm versions between Docker and CI.
- Pin package manager versions to reduce drift.

**Step 3: Verify warning removal**

Run: `pnpm -C CAMPIFRUT/apps/storefront build`
Run: `pnpm -C bootandstrap-admin build`
Expected: no root inference warnings.

**Step 4: Verify CI parity**

Run: `pnpm -C bootandstrap-admin lint && pnpm -C bootandstrap-admin type-check && pnpm -C bootandstrap-admin test:run && pnpm -C bootandstrap-admin build`
Expected: PASS on same runtime target as CI.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/next.config.ts apps/storefront/Dockerfile
git -C bootandstrap-admin add next.config.ts .github/workflows/ci.yml Dockerfile
git -C CAMPIFRUT commit -m "build: pin next turbopack root and runtime versions"
git -C bootandstrap-admin commit -m "build: align ci/docker toolchain and turbopack root"
```

### Task 9: Add Input Validation + Audit Trail for SuperAdmin Mutations

**Files:**
- Modify: `bootandstrap-admin/src/lib/tenants.ts`
- Create: `bootandstrap-admin/src/lib/validation/tenant.ts`
- Create: `bootandstrap-admin/src/lib/audit.ts`
- Create: `CAMPIFRUT/supabase/migrations/20260210_admin_audit_log.sql`
- Create: `bootandstrap-admin/src/lib/__tests__/tenant-mutations.test.ts`

**Step 1: Write failing tests**

```ts
it('rejects invalid plan limit payloads', async () => {})
it('writes audit row for tenant mutations', async () => {})
```

**Step 2: Run tests to verify fail**

Run: `pnpm -C bootandstrap-admin vitest run src/lib/__tests__/tenant-mutations.test.ts`
Expected: FAIL (no schema validation/audit logger).

**Step 3: Write minimal implementation**

- Validate mutation payloads with explicit schemas before DB writes.
- Record mutation actor, action, target tenant, and diff summary.

**Step 4: Verify**

Run: `pnpm -C bootandstrap-admin vitest run src/lib/__tests__/tenant-mutations.test.ts`
Run: `pnpm -C bootandstrap-admin test:run`
Expected: PASS.

**Step 5: Commit**

```bash
git -C bootandstrap-admin add src/lib/tenants.ts src/lib/validation/tenant.ts src/lib/audit.ts src/lib/__tests__/tenant-mutations.test.ts
git -C CAMPIFRUT add supabase/migrations/20260210_admin_audit_log.sql
git -C bootandstrap-admin commit -m "sec: validate superadmin mutations and add audit trail"
git -C CAMPIFRUT commit -m "db: add superadmin audit log table"
```

### Task 10: Make `bootandstrap-admin` CI Enforce Tests and Security Baseline

**Files:**
- Modify: `bootandstrap-admin/.github/workflows/ci.yml`
- Modify: `bootandstrap-admin/package.json`
- Create: `bootandstrap-admin/scripts/release-gate.sh`
- Create: `bootandstrap-admin/docs/QUALITY_GATES.md`

**Step 1: Write failing CI expectation**

```txt
- CI must run lint + type-check + tests + build
- CI must fail on any failing test
```

**Step 2: Run local gate to verify missing enforcement**

Run: `bash bootandstrap-admin/scripts/release-gate.sh`
Expected: FAIL initially (script missing).

**Step 3: Write minimal implementation**

- Add release gate script for admin repo.
- Add `test:run` as mandatory CI step.
- Keep environment placeholders deterministic for build.

**Step 4: Verify**

Run: `bash bootandstrap-admin/scripts/release-gate.sh`
Expected: PASS only when all gates pass.

**Step 5: Commit**

```bash
git -C bootandstrap-admin add .github/workflows/ci.yml package.json scripts/release-gate.sh docs/QUALITY_GATES.md
git -C bootandstrap-admin commit -m "ci: enforce full quality gates in superadmin"
```

### Task 11: Align Supabase Docs With Effective Policies and Runtime Behavior

**Files:**
- Modify: `CAMPIFRUT/docs/architecture/SUPABASE_SCHEMA.md`
- Modify: `CAMPIFRUT/docs/architecture/ARCHITECTURE.md`
- Modify: `CAMPIFRUT/GEMINI.md`
- Modify: `CAMPIFRUT/ROADMAP.md`
- Modify: `CAMPIFRUT/docs/RUNBOOK.md`

**Step 1: Write failing doc consistency checklist**

```txt
- RLS SELECT policy text must match latest migration
- quality baseline numbers must match current command output
- runbook gates must not claim checks that do not run
```

**Step 2: Validate and capture baseline**

Run: `pnpm -C CAMPIFRUT lint && pnpm -C CAMPIFRUT type-check && pnpm -C CAMPIFRUT test:run && pnpm -C CAMPIFRUT build`
Run: `pnpm -C bootandstrap-admin lint && pnpm -C bootandstrap-admin type-check && pnpm -C bootandstrap-admin test:run && pnpm -C bootandstrap-admin build`

**Step 3: Write minimal implementation**

- Update docs to exact real state (commands, counts, caveats).
- Remove contradictory policy descriptions.

**Step 4: Verify**

Run: `rg -n "public read|quality gate status|tests ✅|tests ❌" CAMPIFRUT/GEMINI.md CAMPIFRUT/docs/architecture/SUPABASE_SCHEMA.md CAMPIFRUT/ROADMAP.md CAMPIFRUT/docs/RUNBOOK.md`
Expected: content consistent with effective behavior.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add docs/architecture/SUPABASE_SCHEMA.md docs/architecture/ARCHITECTURE.md GEMINI.md ROADMAP.md docs/RUNBOOK.md
git -C CAMPIFRUT commit -m "docs: align architecture and quality docs with effective runtime"
```

### Task 12: Final Production Readiness Verification (Both Repos)

**Files:**
- Create: `CAMPIFRUT/docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10.md`
- Modify: `CAMPIFRUT/docs/operations/CLIENT_HANDOFF.md`
- Modify: `bootandstrap-admin/docs/DEPLOYMENT.md`

**Step 1: Run full verification matrix**

Run:
```bash
bash CAMPIFRUT/scripts/release-gate.sh
bash bootandstrap-admin/scripts/release-gate.sh
pnpm -C CAMPIFRUT/apps/storefront playwright test
pnpm -C CAMPIFRUT/apps/medusa test:integration:http
```

Expected: all PASS, no false-green steps.

**Step 2: Capture evidence report**

Accion: document command outputs, build hashes, image tags, and unresolved known risks (if any).

**Step 3: Validate deploy parity**

Run: `docker compose -f CAMPIFRUT/docker-compose.yml config --quiet`
Run: `docker compose -f CAMPIFRUT/docker-compose.dev.yml config --quiet`
Expected: valid compose manifests.

**Step 4: Final checklist sign-off**

Accion: update handoff docs with exact operational gates and rollback triggers.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10.md docs/operations/CLIENT_HANDOFF.md
git -C bootandstrap-admin add docs/DEPLOYMENT.md
git -C CAMPIFRUT commit -m "ops: publish production readiness report and sign-off gates"
git -C bootandstrap-admin commit -m "docs: update deployment with final verified gates"
```

---

## Critical Risks This Plan Directly Closes

1. Silent fallback masking tenant/RLS misconfiguration in production data path.
2. Guest order lookup correctness/security bug (non-deterministic search, no abuse control).
3. Non-idempotent webhook processing risk (duplicate side effects).
4. False-green local/CI gates (tests not actually executing in one gate path).
5. CI confidence gaps (no real Medusa integration in critical paths, non-blocking Lighthouse).
6. Runtime drift and build nondeterminism (toolchain/version mismatch + Turbopack root warning).
7. Missing mutation audit trail in superadmin operations.
8. Documentation drift vs effective architecture and quality status.

