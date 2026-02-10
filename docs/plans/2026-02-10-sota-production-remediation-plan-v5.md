# SOTA Production Remediation Plan v5 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** cerrar los gaps de correctitud, seguridad, CI y operación detectados en `CAMPIFRUT` y `bootandstrap-admin` para llegar a una baseline de producción SOTA verificable de extremo a extremo.

**Architecture:** ejecutar por olas de riesgo: primero consistencia de datos (migraciones + RLS), luego rutas críticas de negocio (checkout/webhooks/panel), después quality gates reales (CI/E2E/integración), y finalmente hardening operativo/documental con evidencia reproducible.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (RLS + SQL migrations + RPC), Medusa v2, pnpm + Turborepo, Vitest, Playwright, GitHub Actions, Docker Compose.

---

### Task 1: Repair Migration Graph and Eliminate Duplicate Tenant Bootstrap Logic

**Files:**
- Modify: `CAMPIFRUT/supabase/migrations/20260210_create_tenants_table.sql`
- Modify: `CAMPIFRUT/supabase/migrations/20260209_multi_tenant_foundation.sql`
- Create: `CAMPIFRUT/supabase/tests/migration-order-smoke.sql`
- Create: `CAMPIFRUT/scripts/check-migration-order.sh`

**Step 1: Write the failing migration smoke test**

```sql
-- assert tenants has plan_tier after running full chain
SELECT column_name FROM information_schema.columns
WHERE table_name = 'tenants' AND column_name = 'plan_tier';
```

**Step 2: Run to verify it fails on current chain**

Run: `bash CAMPIFRUT/scripts/check-migration-order.sh`
Expected: FAIL (duplicate create policy/table flow, dependency ordering conflict).

**Step 3: Write minimal implementation**

```sql
-- keep ONLY one canonical tenants bootstrap migration
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_tier TEXT
  CHECK (plan_tier IN ('starter','pro','enterprise')) DEFAULT 'starter';
```

**Step 4: Run smoke checks again**

Run: `bash CAMPIFRUT/scripts/check-migration-order.sh`
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add supabase/migrations/20260210_create_tenants_table.sql supabase/migrations/20260209_multi_tenant_foundation.sql supabase/tests/migration-order-smoke.sql scripts/check-migration-order.sh
git -C CAMPIFRUT commit -m "db: fix migration ordering and tenants bootstrap duplication"
```

### Task 2: Make Owner Store Config Save Contract Correct and Testable

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/lib/owner-validation.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/app/[lang]/(panel)/panel/tienda/actions.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/app/[lang]/(panel)/panel/tienda/StoreConfigClient.tsx`
- Create: `CAMPIFRUT/apps/storefront/src/app/[lang]/(panel)/panel/tienda/__tests__/actions.test.ts`

**Step 1: Write the failing test**

```ts
it('accepts full form payload and persists only allowed fields', async () => {
  // payload includes id/tenant_id and sentry_dsn
  // expect action to strip forbidden keys and save allowed keys
})
```

**Step 2: Run to verify fail**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/app/[lang]/(panel)/panel/tienda/__tests__/actions.test.ts`
Expected: FAIL (`StoreConfigUpdateSchema.strict()` rejects current payload).

**Step 3: Write minimal implementation**

```ts
const parsed = StoreConfigUpdateSchema.partial().passthrough().safeParse(configData)
```

```ts
const payload = Object.fromEntries(
  Object.entries(parsed.data).filter(([k]) => ALLOWED_CONFIG_FIELDS.includes(k as keyof StoreConfig))
)
```

**Step 4: Verify pass**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/app/[lang]/(panel)/panel/tienda/__tests__/actions.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/lib/owner-validation.ts apps/storefront/src/app/[lang]/(panel)/panel/tienda/actions.ts apps/storefront/src/app/[lang]/(panel)/panel/tienda/StoreConfigClient.tsx apps/storefront/src/app/[lang]/(panel)/panel/tienda/__tests__/actions.test.ts
git -C CAMPIFRUT commit -m "fix: align owner store config validation with submitted payload contract"
```

### Task 3: Fix Guest Order Lookup Determinism and Abuse Controls

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/app/api/orders/lookup/route.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/app/api/orders/lookup/__tests__/route.test.ts`
- Create: `CAMPIFRUT/apps/storefront/src/lib/security/order-lookup-rate-limit.ts`
- Modify: `CAMPIFRUT/docs/operations/API_REFERENCE.md`

**Step 1: Write failing tests**

```ts
it('queries target order by display_id instead of limit=1 first page', async () => {})
it('rate-limits per ip+email key, not ip only', async () => {})
```

**Step 2: Run to verify fail**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/app/api/orders/lookup/__tests__/route.test.ts`
Expected: FAIL (current lookup fetches generic list with `limit=1`).

**Step 3: Write minimal implementation**

```ts
const params = new URLSearchParams({ q: displayId, fields: 'id,display_id,email,status,created_at,total,currency_code', limit: '20' })
const key = `${clientIp}:${email}`
```

**Step 4: Verify**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/app/api/orders/lookup/__tests__/route.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/app/api/orders/lookup/route.ts apps/storefront/src/app/api/orders/lookup/__tests__/route.test.ts apps/storefront/src/lib/security/order-lookup-rate-limit.ts docs/operations/API_REFERENCE.md
git -C CAMPIFRUT commit -m "fix: deterministic and abuse-resistant guest order lookup"
```

### Task 4: Make Stripe Webhook Idempotency Atomic Under Concurrency

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/app/api/webhooks/stripe/route.ts`
- Modify: `CAMPIFRUT/supabase/migrations/20260210_stripe_webhook_events.sql`
- Modify: `CAMPIFRUT/apps/storefront/src/app/api/webhooks/stripe/__tests__/route.test.ts`

**Step 1: Write failing concurrency test**

```ts
it('only one concurrent request processes same event id', async () => {
  // two POSTs same event; one processes, second exits duplicate
})
```

**Step 2: Run to verify fail**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/app/api/webhooks/stripe/__tests__/route.test.ts`
Expected: FAIL (check-then-insert race).

**Step 3: Write minimal implementation**

```ts
await fetch(`${supabaseUrl}/rest/v1/stripe_webhook_events?on_conflict=event_id`, {
  method: 'POST',
  headers: { Prefer: 'resolution=ignore-duplicates,return=representation', ...authHeaders },
  body: JSON.stringify([{ event_id: event.id, event_type: event.type, tenant_id }])
})
```

**Step 4: Verify pass**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/app/api/webhooks/stripe/__tests__/route.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/app/api/webhooks/stripe/route.ts supabase/migrations/20260210_stripe_webhook_events.sql apps/storefront/src/app/api/webhooks/stripe/__tests__/route.test.ts
git -C CAMPIFRUT commit -m "sec: enforce atomic stripe webhook deduplication"
```

### Task 5: Correct Health/Readiness Probes for Real Production Signals

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/app/api/health/route.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/app/api/health/ready/route.ts`
- Create: `CAMPIFRUT/apps/storefront/src/app/api/health/__tests__/ready.test.ts`
- Modify: `CAMPIFRUT/docs/RUNBOOK.md`

**Step 1: Write failing probe test**

```ts
it('returns ready=200 when supabase service-role is reachable even without user session', async () => {})
```

**Step 2: Run to verify fail**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/app/api/health/__tests__/ready.test.ts`
Expected: FAIL (current readiness path uses anon SSR client/RLS-sensitive query).

**Step 3: Write minimal implementation**

```ts
import { createAdminClient } from '@/lib/supabase/admin'
const supabase = createAdminClient()
await supabase.from('config').select('id').limit(1)
```

**Step 4: Verify pass**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/app/api/health/__tests__/ready.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/app/api/health/route.ts apps/storefront/src/app/api/health/ready/route.ts apps/storefront/src/app/api/health/__tests__/ready.test.ts docs/RUNBOOK.md
git -C CAMPIFRUT commit -m "fix: make readiness probe reflect real dependency health"
```

### Task 6: Replace Process-Local Rate Limiting with Redis-Backed Policy

**Files:**
- Create: `CAMPIFRUT/apps/storefront/src/lib/security/rate-limit-redis.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/lib/security/rate-limit.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/proxy.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/app/api/orders/lookup/route.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/app/api/analytics/route.ts`
- Create: `CAMPIFRUT/apps/storefront/src/lib/security/__tests__/rate-limit-redis.test.ts`

**Step 1: Write failing distributed-limit test**

```ts
it('shares counters across instances via redis key namespace', async () => {})
```

**Step 2: Run to verify fail**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/lib/security/__tests__/rate-limit-redis.test.ts`
Expected: FAIL (current limiter is in-memory per process).

**Step 3: Write minimal implementation**

```ts
await redis.multi().incr(key).pexpire(key, windowMs).exec()
return count > limit
```

**Step 4: Verify**

Run: `pnpm -C CAMPIFRUT/apps/storefront vitest run src/lib/security/__tests__/rate-limit-redis.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/lib/security/rate-limit-redis.ts apps/storefront/src/lib/security/rate-limit.ts apps/storefront/src/proxy.ts apps/storefront/src/app/api/orders/lookup/route.ts apps/storefront/src/app/api/analytics/route.ts apps/storefront/src/lib/security/__tests__/rate-limit-redis.test.ts
git -C CAMPIFRUT commit -m "sec: migrate storefront throttling to redis-backed distributed limiter"
```

### Task 7: Harden CI to Run Real Integration Paths (No False Green)

**Files:**
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`
- Create: `CAMPIFRUT/scripts/ci/start-medusa-stack.sh`
- Create: `CAMPIFRUT/scripts/ci/wait-for-health.sh`
- Modify: `CAMPIFRUT/apps/storefront/playwright.config.ts`

**Step 1: Write failing CI smoke assertions**

```bash
# ci-smoke must fail if medusa not started or lighthouse fails
bash CAMPIFRUT/scripts/ci/ci-smoke.sh
```

**Step 2: Run to verify fail**

Run: `bash CAMPIFRUT/scripts/ci/ci-smoke.sh`
Expected: FAIL (current workflow starts storefront without Medusa, Lighthouse is non-blocking).

**Step 3: Write minimal implementation**

```yaml
- run: pnpm -C apps/medusa test:integration:http
- run: bash scripts/ci/start-medusa-stack.sh
- run: pnpm -C apps/storefront playwright test
- run: cd apps/storefront && lhci autorun
```

**Step 4: Verify locally**

Run: `pnpm -C CAMPIFRUT/apps/medusa test:integration:http`
Run: `BASE_URL=http://localhost:3000 pnpm -C CAMPIFRUT/apps/storefront playwright test`
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add .github/workflows/ci.yml scripts/ci/start-medusa-stack.sh scripts/ci/wait-for-health.sh apps/storefront/playwright.config.ts
git -C CAMPIFRUT commit -m "ci: enforce medusa-backed integration and blocking lighthouse"
```

### Task 8: Upgrade E2E to Deterministic Business Assertions

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/e2e/homepage.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/products.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/cart.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/checkout.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/auth.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/components/**`

**Step 1: Write failing strict assertions**

```ts
await expect(page.getByTestId('cart-count')).toHaveText('1')
await expect(page.getByTestId('checkout-submit')).toBeEnabled()
```

**Step 2: Run to verify fail**

Run: `pnpm -C CAMPIFRUT/apps/storefront playwright test`
Expected: FAIL (selectors and assertions are currently weak/truthy).

**Step 3: Write minimal implementation**

```tsx
<button data-testid="checkout-submit">Finalizar pedido</button>
```

**Step 4: Verify pass**

Run: `pnpm -C CAMPIFRUT/apps/storefront playwright test`
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/e2e apps/storefront/src/components
git -C CAMPIFRUT commit -m "test: make storefront e2e deterministic and business-oriented"
```

### Task 9: Enforce SuperAdmin Mutation Validation and Complete Audit Coverage

**Files:**
- Modify: `bootandstrap-admin/src/lib/tenants.ts`
- Modify: `bootandstrap-admin/src/lib/validation.ts`
- Create: `bootandstrap-admin/src/lib/__tests__/tenant-mutations.test.ts`
- Modify: `CAMPIFRUT/supabase/migrations/20260210_audit_log.sql`

**Step 1: Write failing tests**

```ts
it('rejects invalid createTenant payloads', async () => {})
it('logs audit for create/update-status/delete mutations', async () => {})
```

**Step 2: Run to verify fail**

Run: `pnpm -C bootandstrap-admin vitest run src/lib/__tests__/tenant-mutations.test.ts`
Expected: FAIL (create/status/delete lack full validation + audit).

**Step 3: Write minimal implementation**

```ts
const payload = createTenantSchema.parse(input)
await auditLog('create_tenant', tenantId, auth.userId, payload)
```

**Step 4: Verify pass**

Run: `pnpm -C bootandstrap-admin vitest run src/lib/__tests__/tenant-mutations.test.ts`
Run: `pnpm -C bootandstrap-admin test:run`
Expected: PASS.

**Step 5: Commit**

```bash
git -C bootandstrap-admin add src/lib/tenants.ts src/lib/validation.ts src/lib/__tests__/tenant-mutations.test.ts
git -C CAMPIFRUT add supabase/migrations/20260210_audit_log.sql
git -C bootandstrap-admin commit -m "sec: validate all superadmin mutations and audit create/status/delete"
git -C CAMPIFRUT commit -m "db: strengthen audit_log schema for admin mutation tracking"
```

### Task 10: Align Runtime Toolchain and Remove Root Inference Drift

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/next.config.ts`
- Modify: `bootandstrap-admin/next.config.ts`
- Modify: `bootandstrap-admin/.github/workflows/ci.yml`
- Modify: `bootandstrap-admin/Dockerfile`
- Modify: `bootandstrap-admin/package.json`

**Step 1: Write failing build verification commands**

Run: `pnpm -C CAMPIFRUT/apps/storefront build`
Run: `pnpm -C bootandstrap-admin build`
Expected: WARN about `turbopack.root` and/or node/pnpm drift.

**Step 2: Apply minimal implementation**

```ts
import path from 'node:path'
const nextConfig = { turbopack: { root: path.resolve(__dirname) } }
```

**Step 3: Verify warning removal and parity**

Run: `pnpm -C bootandstrap-admin lint && pnpm -C bootandstrap-admin type-check && pnpm -C bootandstrap-admin test:run && pnpm -C bootandstrap-admin build`
Expected: PASS without root inference warnings.

**Step 4: Verify CI/Docker runtime match**

Run: `rg -n "node-version|pnpm@" bootandstrap-admin/.github/workflows/ci.yml bootandstrap-admin/Dockerfile bootandstrap-admin/.nvmrc`
Expected: consistent versions.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/next.config.ts
git -C bootandstrap-admin add next.config.ts .github/workflows/ci.yml Dockerfile package.json
git -C CAMPIFRUT commit -m "build: set absolute turbopack root in storefront"
git -C bootandstrap-admin commit -m "build: align runtime toolchain and turbopack root"
```

### Task 11: Close Dependency Vulnerability and Pin Compatible Versions

**Files:**
- Modify: `CAMPIFRUT/apps/medusa/package.json`
- Modify: `CAMPIFRUT/pnpm-lock.yaml`
- Create: `CAMPIFRUT/docs/operations/DEPENDENCY_RISK_REGISTER.md`

**Step 1: Write failing security gate**

```bash
pnpm -C CAMPIFRUT audit --audit-level=moderate
```

**Step 2: Run to verify fail**

Expected: FAIL on `esbuild <=0.24.2` path(s).

**Step 3: Write minimal implementation**

```json
{
  "pnpm": {
    "overrides": {
      "esbuild": ">=0.25.0"
    }
  }
}
```

**Step 4: Verify**

Run: `pnpm -C CAMPIFRUT install --lockfile-only`
Run: `pnpm -C CAMPIFRUT audit --audit-level=moderate`
Expected: PASS or explicit accepted-risk waiver documented.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/medusa/package.json pnpm-lock.yaml docs/operations/DEPENDENCY_RISK_REGISTER.md
git -C CAMPIFRUT commit -m "sec: remediate esbuild advisory and document residual dependency risk"
```

### Task 12: Synchronize Documentation with Effective Runtime and Policies

**Files:**
- Modify: `CAMPIFRUT/GEMINI.md`
- Modify: `CAMPIFRUT/ROADMAP.md`
- Modify: `CAMPIFRUT/docs/architecture/SUPABASE_SCHEMA.md`
- Modify: `CAMPIFRUT/docs/RUNBOOK.md`
- Modify: `CAMPIFRUT/docs/operations/API_REFERENCE.md`
- Modify: `bootandstrap-admin/GEMINI.md`
- Modify: `bootandstrap-admin/docs/DEPLOYMENT.md`

**Step 1: Write failing doc consistency checklist**

```txt
- webhook events documented == webhook code branches
- RLS table matrix == latest SQL policies
- quality/test counts == real command output
```

**Step 2: Capture current baseline**

Run: `bash CAMPIFRUT/scripts/release-gate.sh`
Run: `pnpm -C bootandstrap-admin lint && pnpm -C bootandstrap-admin type-check && pnpm -C bootandstrap-admin test:run && pnpm -C bootandstrap-admin build`

**Step 3: Write minimal implementation**

```md
Update docs to exact behavior: payment_intent.* webhook handlers, tenant-scoped SELECT policies, and actual gate outputs.
```

**Step 4: Verify drift removed**

Run: `rg -n "checkout.session.completed|plain UUID column|149 storefront tests|public read" CAMPIFRUT/GEMINI.md CAMPIFRUT/docs/architecture/SUPABASE_SCHEMA.md CAMPIFRUT/docs/operations/API_REFERENCE.md CAMPIFRUT/docs/RUNBOOK.md`
Expected: no stale claims.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add GEMINI.md ROADMAP.md docs/architecture/SUPABASE_SCHEMA.md docs/RUNBOOK.md docs/operations/API_REFERENCE.md
git -C bootandstrap-admin add GEMINI.md docs/DEPLOYMENT.md
git -C CAMPIFRUT commit -m "docs: align template docs with runtime behavior and effective policies"
git -C bootandstrap-admin commit -m "docs: align admin docs with verified build and deployment reality"
```

### Task 13: Final Production Readiness Verification and Sign-Off Report

**Files:**
- Create: `CAMPIFRUT/docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v5.md`
- Create: `bootandstrap-admin/docs/QUALITY_GATES.md`
- Modify: `CAMPIFRUT/docs/operations/CLIENT_HANDOFF.md`

**Step 1: Run full matrix**

Run:
```bash
bash CAMPIFRUT/scripts/release-gate.sh
pnpm -C CAMPIFRUT/apps/medusa test:integration:http
pnpm -C CAMPIFRUT/apps/storefront playwright test
pnpm -C bootandstrap-admin lint && pnpm -C bootandstrap-admin type-check && pnpm -C bootandstrap-admin test:run && pnpm -C bootandstrap-admin build
```

Expected: all PASS, no false-green skip path.

**Step 2: Verify deployment manifests**

Run: `docker compose -f CAMPIFRUT/docker-compose.yml config --quiet`
Run: `docker compose -f CAMPIFRUT/docker-compose.dev.yml config --quiet`
Expected: PASS.

**Step 3: Capture evidence**

```md
Record exact command outputs, image tags, commit SHAs, unresolved risks, rollback triggers.
```

**Step 4: Final acceptance checklist**

Run: `rg -n "TODO|FIXME|PLACEHOLDER" CAMPIFRUT/docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v5.md bootandstrap-admin/docs/QUALITY_GATES.md`
Expected: no unresolved blocker items.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v5.md docs/operations/CLIENT_HANDOFF.md
git -C bootandstrap-admin add docs/QUALITY_GATES.md
git -C CAMPIFRUT commit -m "ops: publish v5 production readiness evidence and handoff"
git -C bootandstrap-admin commit -m "ops: add admin quality gates and release checklist"
```

---

## Critical Risks This Plan Closes

1. Fresh-environment migration failure due to duplicate/ordered-conflicting SQL.
2. Silent Owner Panel config save failures from schema/UI contract mismatch.
3. Non-deterministic guest order lookup and weak abuse throttling key strategy.
4. Stripe webhook race condition under concurrent retries.
5. Readiness endpoints reporting degraded under healthy infra due RLS-sensitive checks.
6. Rate limiting bypass in multi-instance deployments (process-local memory counters).
7. CI false-green paths (no Medusa in E2E path, non-blocking Lighthouse, weak assertions).
8. Incomplete mutation audit trail and validation in SuperAdmin control plane.
9. Toolchain/runtime drift and Turbopack root inference warnings.
10. Known dependency vulnerability without documented remediation policy.
11. Documentation drift that can produce operational mistakes during release/handoff.
