# SOTA Production Remediation Plan v6 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** llevar `CAMPIFRUT` + `bootandstrap-admin` a baseline de producción verificable y reproducible, eliminando false-greens de calidad, fallos de build, drift de validación y riesgos de seguridad críticos.

**Architecture:** ejecutar por olas de riesgo: (1) desbloquear baseline técnica y build, (2) corregir control plane y seguridad de datos, (3) endurecer CI/E2E/operación, (4) sincronizar documentación y evidencias de release.

**Tech Stack:** Next.js 16, React 19, Supabase (RLS + REST + migrations), Medusa v2, pnpm + Turborepo, Vitest, Playwright, GitHub Actions, Docker Compose.

---

### Task 1: Restore Storefront Build Determinism (Proxy Rate Limit Contract)

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/proxy.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/lib/security/rate-limit.ts`
- Test: `CAMPIFRUT/apps/storefront/src/lib/security/__tests__/rate-limit.test.ts`

**Step 1: Write failing contract test**

```ts
it('proxy-compatible limiter returns awaitable boolean without union mismatch', async () => {})
```

**Step 2: Run to verify fail**

Run: `pnpm -C CAMPIFRUT/apps/storefront test:run src/lib/security/__tests__/rate-limit.test.ts`
Expected: FAIL or type mismatch around `boolean | Promise<boolean>`.

**Step 3: Write minimal implementation**

```ts
export interface RateLimiter { isLimited(key: string): Promise<boolean> }
```

```ts
const limited = await (isApi ? apiLimiter.isLimited(key) : pageLimiter.isLimited(key))
```

**Step 4: Verify**

Run: `pnpm -C CAMPIFRUT/apps/storefront build`
Expected: PASS (no TS error in `src/proxy.ts`).

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/proxy.ts apps/storefront/src/lib/security/rate-limit.ts apps/storefront/src/lib/security/__tests__/rate-limit.test.ts
git -C CAMPIFRUT commit -m "fix: align proxy limiter contract to async-safe interface"
```

### Task 2: Make Type-Check Gate Real (Eliminate Turbo False-Green)

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/package.json`
- Modify: `CAMPIFRUT/apps/medusa/package.json`
- Modify: `CAMPIFRUT/turbo.json`
- Modify: `CAMPIFRUT/scripts/release-gate.sh`
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`

**Step 1: Write failing gate check**

Run: `pnpm -C CAMPIFRUT turbo type-check --summarize`
Expected: only `@campifrut/shared` executes (current false-green).

**Step 2: Add missing scripts**

```json
"type-check": "tsc --noEmit"
```

for `storefront` and `apps/medusa`.

**Step 3: Wire gates to fail on missing package checks**

Run: `pnpm -C CAMPIFRUT type-check`
Expected: all workspace apps participate.

**Step 4: Verify in CI parity**

Run: `pnpm -C CAMPIFRUT lint && pnpm -C CAMPIFRUT type-check && pnpm -C CAMPIFRUT build`
Expected: PASS or actionable failures (no silent skip).

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/package.json apps/medusa/package.json turbo.json scripts/release-gate.sh .github/workflows/ci.yml
git -C CAMPIFRUT commit -m "ci: enforce real workspace type-check coverage"
```

### Task 3: Fix SuperAdmin Validation Drift (Silent No-Op Writes)

**Files:**
- Modify: `bootandstrap-admin/src/lib/validation.ts`
- Modify: `bootandstrap-admin/src/lib/tenants.ts`
- Create: `bootandstrap-admin/src/lib/__tests__/validation-contract.test.ts`
- Create: `bootandstrap-admin/src/lib/__tests__/tenant-update-roundtrip.test.ts`

**Step 1: Write failing tests**

```ts
it('accepts all 27 feature flags used by TenantDetailClient', () => {})
it('accepts max_whatsapp_templates/max_file_upload_mb/... plan limit fields', () => {})
it('accepts sentry_dsn/google_analytics_id/facebook_pixel_id config fields', () => {})
```

**Step 2: Run to verify fail**

Run: `pnpm -C bootandstrap-admin test:run`
Expected: FAIL because schemas currently strip several keys.

**Step 3: Implement schema parity**

```ts
export const featureFlagsSchema = z.object({ /* full 27 flags */ }).partial()
export const planLimitsSchema = z.object({ /* includes new limits + plan_name */ }).partial()
export const configSchema = z.object({ /* includes integration fields used by UI */ }).partial()
```

**Step 4: Verify end-to-end**

Run: `pnpm -C bootandstrap-admin type-check && pnpm -C bootandstrap-admin test:run`
Expected: PASS.

**Step 5: Commit**

```bash
git -C bootandstrap-admin add src/lib/validation.ts src/lib/tenants.ts src/lib/__tests__/validation-contract.test.ts src/lib/__tests__/tenant-update-roundtrip.test.ts
git -C bootandstrap-admin commit -m "fix: synchronize superadmin mutation schemas with DB/UI contract"
```

### Task 4: Close CMS XSS Attack Surface

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/components/cms/CMSPageRenderer.tsx`
- Modify: `CAMPIFRUT/apps/storefront/src/lib/owner-validation.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/app/[lang]/(panel)/panel/paginas/actions.ts`
- Create: `CAMPIFRUT/apps/storefront/src/components/cms/__tests__/CMSPageRenderer.test.tsx`

**Step 1: Write failing security tests**

```ts
it('strips script tags and inline event handlers from CMS body', () => {})
```

**Step 2: Run to verify fail**

Run: `pnpm -C CAMPIFRUT/apps/storefront test:run src/components/cms/__tests__/CMSPageRenderer.test.tsx`
Expected: FAIL (current render path accepts raw HTML).

**Step 3: Implement allowlist sanitization**

```ts
const safeHtml = sanitizeHtml(body, { allowedTags: [...], allowedAttributes: {...} })
```

and render only sanitized output.

**Step 4: Verify**

Run: `pnpm -C CAMPIFRUT/apps/storefront test:run`
Expected: PASS, no regressions.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/components/cms/CMSPageRenderer.tsx apps/storefront/src/lib/owner-validation.ts apps/storefront/src/app/[lang]/(panel)/panel/paginas/actions.ts apps/storefront/src/components/cms/__tests__/CMSPageRenderer.test.tsx
git -C CAMPIFRUT commit -m "sec: sanitize cms html before render and persistence"
```

### Task 5: Make RLS Gate Portable and Trustworthy

**Files:**
- Modify: `CAMPIFRUT/scripts/check-rls.sh`
- Create: `CAMPIFRUT/supabase/tests/rls-static-smoke.sh`
- Modify: `CAMPIFRUT/scripts/release-gate.sh`
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`

**Step 1: Write failing portability check**

Run: `bash CAMPIFRUT/scripts/check-rls.sh` on macOS BSD grep.
Expected: currently false-green due unsupported `grep -P`.

**Step 2: Replace non-portable regex path**

```bash
rg -n "FOR SELECT USING \\(true\\)" supabase/migrations
```

or pure POSIX `awk`/`sed` fallback.

**Step 3: Add explicit fail conditions**

Gate must fail if parser errors or if forbidden policies are detected without compensating hardening migration.

**Step 4: Verify**

Run: `bash CAMPIFRUT/scripts/check-rls.sh`
Expected: deterministic PASS/FAIL, no silent success.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add scripts/check-rls.sh supabase/tests/rls-static-smoke.sh scripts/release-gate.sh .github/workflows/ci.yml
git -C CAMPIFRUT commit -m "sec: make rls gate portable and fail-closed"
```

### Task 6: Fix CI Integration Path (Medusa Service Boot + Health)

**Files:**
- Modify: `CAMPIFRUT/scripts/ci/start-medusa-stack.sh`
- Modify: `CAMPIFRUT/scripts/ci/wait-for-health.sh`
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`
- Modify: `CAMPIFRUT/docker-compose.yml`

**Step 1: Write failing CI smoke**

Run: `bash CAMPIFRUT/scripts/ci/start-medusa-stack.sh`
Expected: currently references non-existent compose service `medusa`.

**Step 2: Fix service naming + startup flow**

Use `medusa-server` consistently and add explicit health waits.

**Step 3: Add fail-fast checks in workflow**

```bash
bash scripts/ci/start-medusa-stack.sh
bash scripts/ci/wait-for-health.sh http://localhost:9000/health 180
```

**Step 4: Verify locally**

Run: `docker compose -f CAMPIFRUT/docker-compose.yml up -d redis medusa-server`
Expected: healthcheck green.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add scripts/ci/start-medusa-stack.sh scripts/ci/wait-for-health.sh .github/workflows/ci.yml docker-compose.yml
git -C CAMPIFRUT commit -m "ci: use correct medusa service and health-gated startup"
```

### Task 7: Harden Playwright to Real Business Assertions

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/e2e/homepage.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/products.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/cart.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/checkout.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/auth.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/components/**`

**Step 1: Write failing deterministic assertions**

```ts
await expect(page.getByTestId('product-card')).toHaveCountGreaterThan(0)
await expect(page.getByTestId('checkout-submit')).toBeEnabled()
```

**Step 2: Run to verify fail**

Run: `pnpm -C CAMPIFRUT/apps/storefront playwright test`
Expected: FAIL due weak selectors and permissive catches.

**Step 3: Add stable test IDs and strict flows**

Remove silent `catch` branches that mask broken integrations.

**Step 4: Verify**

Run: `BASE_URL=http://localhost:3000 pnpm -C CAMPIFRUT/apps/storefront playwright test`
Expected: PASS only if business flow truly works.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/e2e apps/storefront/src/components
git -C CAMPIFRUT commit -m "test: convert playwright suite to deterministic business assertions"
```

### Task 8: Align Runtime Tooling Warnings and Lint Debt

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/next.config.ts`
- Modify: `bootandstrap-admin/next.config.ts`
- Modify: `bootandstrap-admin/src/app/(dashboard)/tenants/[id]/page.tsx`
- Modify: `bootandstrap-admin/.github/workflows/ci.yml`

**Step 1: Write failing verification**

Run: `pnpm -C CAMPIFRUT/apps/storefront build`
Run: `pnpm -C bootandstrap-admin build`
Expected: warnings around `turbopack.root` and lint noise.

**Step 2: Apply minimal fixes**

Use absolute `turbopack.root` path and remove unused destructure variables in admin.

**Step 3: Verify**

Run: `pnpm -C bootandstrap-admin lint && pnpm -C bootandstrap-admin build`
Expected: no avoidable warnings.

**Step 4: CI parity**

Ensure CI node/pnpm versions match `.nvmrc` and Docker runtime policy.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/next.config.ts
git -C bootandstrap-admin add next.config.ts src/app/(dashboard)/tenants/[id]/page.tsx .github/workflows/ci.yml
git -C CAMPIFRUT commit -m "build: fix turbopack root resolution in storefront"
git -C bootandstrap-admin commit -m "chore: remove admin lint debt and align build warnings"
```

### Task 9: Resolve Known Dependency Advisory (esbuild)

**Files:**
- Modify: `CAMPIFRUT/package.json`
- Modify: `CAMPIFRUT/pnpm-lock.yaml`
- Create: `CAMPIFRUT/docs/operations/DEPENDENCY_RISK_REGISTER.md`

**Step 1: Write failing security gate**

Run: `pnpm -C CAMPIFRUT audit --audit-level=moderate`
Expected: FAIL on `esbuild <=0.24.2`.

**Step 2: Apply remediation or waiver policy**

Prefer pinned override; if Medusa chain blocks upgrade, document temporary accepted risk with expiry date.

**Step 3: Verify**

Run: `pnpm -C CAMPIFRUT install --lockfile-only && pnpm -C CAMPIFRUT audit --audit-level=moderate`
Expected: PASS or explicit waiver entry.

**Step 4: Wire into release gate**

Audit threshold must match documented policy (not silently downgraded).

**Step 5: Commit**

```bash
git -C CAMPIFRUT add package.json pnpm-lock.yaml docs/operations/DEPENDENCY_RISK_REGISTER.md scripts/release-gate.sh
git -C CAMPIFRUT commit -m "sec: remediate or formally waive esbuild advisory with policy evidence"
```

### Task 10: Stabilize Medusa Test Harness (No-Tests Crash + Haste Collision)

**Files:**
- Modify: `CAMPIFRUT/apps/medusa/jest.config.js`
- Modify: `CAMPIFRUT/apps/medusa/package.json`
- Create: `CAMPIFRUT/apps/medusa/src/__tests__/health.unit.spec.ts`
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`

**Step 1: Write failing baseline**

Run: `pnpm -C CAMPIFRUT/apps/medusa test:unit`
Expected: FAIL (Haste collision + zero tests).

**Step 2: Fix harness**

Ignore `.medusa/server` in Jest and add at least one minimal unit/integration smoke test.

**Step 3: Verify**

Run: `pnpm -C CAMPIFRUT/apps/medusa test:unit`
Expected: PASS.

**Step 4: CI integration**

Run medusa unit test in pipeline, not only build/type-check.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/medusa/jest.config.js apps/medusa/package.json apps/medusa/src/__tests__/health.unit.spec.ts .github/workflows/ci.yml
git -C CAMPIFRUT commit -m "test: fix medusa jest harness and enforce unit smoke coverage"
```

### Task 11: Documentation and Readiness Evidence Sync

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/README.md`
- Modify: `CAMPIFRUT/GEMINI.md`
- Modify: `CAMPIFRUT/ROADMAP.md`
- Modify: `CAMPIFRUT/docs/RUNBOOK.md`
- Modify: `bootandstrap-admin/GEMINI.md`
- Modify: `bootandstrap-admin/docs/DEPLOYMENT.md`
- Create: `CAMPIFRUT/docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v6.md`

**Step 1: Capture real baseline**

Run:
```bash
bash CAMPIFRUT/scripts/release-gate.sh
pnpm -C CAMPIFRUT/apps/storefront build
pnpm -C bootandstrap-admin lint && pnpm -C bootandstrap-admin type-check && pnpm -C bootandstrap-admin test:run && pnpm -C bootandstrap-admin build
```

**Step 2: Update stale docs**

Replace generated/default README content and correct gate/test/build claims.

**Step 3: Publish signed report**

Include command outputs, commit SHAs, residual risks, rollback criteria.

**Step 4: Verify no blocker placeholders in report**

Run: `rg -n "TODO|FIXME|TBD|PLACEHOLDER" CAMPIFRUT/docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v6.md`
Expected: no unresolved blocker placeholders.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/README.md GEMINI.md ROADMAP.md docs/RUNBOOK.md docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v6.md
git -C bootandstrap-admin add GEMINI.md docs/DEPLOYMENT.md
git -C CAMPIFRUT commit -m "docs: synchronize runtime reality and v6 readiness evidence"
git -C bootandstrap-admin commit -m "docs: align admin docs with verified quality baseline"
```

---

## Critical Deficiencies Addressed by v6

1. Release gate currently blocked by storefront build/type contract mismatch.
2. Workspace `type-check` is currently false-green (key apps skipped).
3. SuperAdmin writes silently drop several flags/limits/config fields due schema drift.
4. CMS HTML rendering path allows XSS payloads through insufficient sanitization.
5. RLS static gate is non-portable (`grep -P`) and can pass without actually scanning.
6. CI Medusa startup path references wrong compose service name.
7. E2E tests are too permissive to guarantee checkout/business correctness.
8. Tooling warnings/lint debt reduce signal quality and release confidence.
9. Known `esbuild` advisory remains unresolved at `moderate` threshold.
10. Medusa unit test harness fails baseline execution (`no tests` + haste collision).
11. Documentation claims diverge from real command outputs and current risk posture.
