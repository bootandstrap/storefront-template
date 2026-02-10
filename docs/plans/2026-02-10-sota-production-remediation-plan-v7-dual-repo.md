# Dual-Repo SOTA Production Remediation (v7) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** llevar `CAMPIFRUT` (template/storefront+medusa) y `bootandstrap-admin` (control plane SaaS) a una baseline de producción SOTA verificable, sin false-greens, sin drift de contratos y con seguridad/operación auditables.

**Architecture:** ejecución por oleadas de riesgo: (1) desbloquear build/type correctness y contratos críticos, (2) cerrar superficies de seguridad y acceso multi-tenant, (3) endurecer CI/E2E/operación de ambos repos, (4) sincronizar documentación con evidencia real.

**Tech Stack:** Next.js 16, React 19, Supabase (RLS + service role), Medusa v2, pnpm + Turborepo, Vitest, Jest, Playwright, GitHub Actions, Docker Compose.

---

## Baseline Audit (capturado el 10 Feb 2026)

- `CAMPIFRUT/scripts/release-gate.sh`: **FAILED** por build TS en `apps/storefront/src/proxy.ts`.
- `CAMPIFRUT pnpm turbo type-check`: **false-green** (solo ejecuta `@campifrut/shared`).
- `CAMPIFRUT/apps/storefront npx tsc --noEmit`: **FAILED** (proxy contract + tests mutando `process.env.NODE_ENV`).
- `CAMPIFRUT/apps/medusa pnpm test:unit`: **FAILED** (no tests encontrados).
- `CAMPIFRUT pnpm audit --audit-level=moderate`: **FAILED** (GHSA-67mh-4wv8-2f99, `esbuild <=0.24.2`, transitive por Medusa/Vite).
- `bootandstrap-admin pnpm lint/type-check/test:run/build`: **PASS** con warnings de lint y warning de Turbopack root.
- Drift funcional confirmado en `bootandstrap-admin/src/lib/validation.ts`: schemas no cubren todos los fields usados por UI/presets.
- Riesgo XSS confirmado: `CAMPIFRUT/apps/storefront/src/components/cms/CMSPageRenderer.tsx` renderiza HTML crudo con `dangerouslySetInnerHTML`.
- Riesgo CI confirmado: `CAMPIFRUT/scripts/ci/start-medusa-stack.sh` usa servicio `medusa` (no existe en `docker-compose.yml`, servicio real: `medusa-server`).

---

### Task 1: Freeze Baseline and Open Safe Workstreams

**Files:**
- Modify: `CAMPIFRUT/docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v7.md`
- Modify: `bootandstrap-admin/docs/QUALITY_GATES_2026-02-10.md`

**Step 1: Capture command evidence**

Run:
```bash
bash CAMPIFRUT/scripts/release-gate.sh
pnpm -C CAMPIFRUT/apps/storefront exec tsc --noEmit
pnpm -C CAMPIFRUT/apps/medusa test:unit
pnpm -C CAMPIFRUT audit --audit-level=moderate
pnpm -C bootandstrap-admin lint && pnpm -C bootandstrap-admin type-check && pnpm -C bootandstrap-admin test:run && pnpm -C bootandstrap-admin build
```
Expected: exactly baseline status above (fail/pass mix).

**Step 2: Document SHAs and branch states**

Include current commit SHA and dirty-file disclaimer in both reports.

**Step 3: Commit evidence docs**

```bash
git -C CAMPIFRUT add docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v7.md
git -C CAMPIFRUT commit -m "docs: capture v7 readiness baseline evidence"
git -C bootandstrap-admin add docs/QUALITY_GATES_2026-02-10.md
git -C bootandstrap-admin commit -m "docs: capture admin baseline evidence"
```

---

### Task 2: Fix Storefront Build Blocker (Proxy Rate Limiter Contract)

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/proxy.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/lib/security/rate-limit.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/lib/security/__tests__/rate-limit.test.ts`

**Step 1: Write failing contract test**

Add explicit test for async-compatible limiter contract.

**Step 2: Normalize interface**

Choose one contract and enforce it everywhere:
- Recommended: async contract (`Promise<boolean>`) at interface boundary.

**Step 3: Make proxy path await limiter**

`isRateLimited` must be async and callers must `await`.

**Step 4: Verify**

Run:
```bash
pnpm -C CAMPIFRUT/apps/storefront test:run src/lib/security/__tests__/rate-limit.test.ts
pnpm -C CAMPIFRUT/apps/storefront build
```
Expected: PASS, no TS2322 in `src/proxy.ts`.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/proxy.ts apps/storefront/src/lib/security/rate-limit.ts apps/storefront/src/lib/security/__tests__/rate-limit.test.ts
git -C CAMPIFRUT commit -m "fix: align proxy rate limiter contract and async usage"
```

---

### Task 3: Remove Type-Check False-Greens Across Workspace

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/package.json`
- Modify: `CAMPIFRUT/apps/medusa/package.json`
- Modify: `CAMPIFRUT/turbo.json`
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`
- Modify: `CAMPIFRUT/scripts/release-gate.sh`
- Modify: `CAMPIFRUT/apps/storefront/src/lib/medusa/__tests__/url.test.ts`

**Step 1: Add missing scripts**

Add `"type-check": "tsc --noEmit"` to `storefront` and `apps/medusa`.

**Step 2: Fail-closed in release gate and CI**

Replace warning-mode type-check with blocking gate.

**Step 3: Fix strict TS test errors**

In `url.test.ts`, stop assigning directly to `process.env.NODE_ENV` (readonly typing). Use helper wrapper/cast-safe strategy.

**Step 4: Verify real coverage**

Run:
```bash
pnpm -C CAMPIFRUT turbo type-check --summarize
pnpm -C CAMPIFRUT/apps/storefront exec tsc --noEmit
pnpm -C CAMPIFRUT/apps/medusa exec tsc --noEmit
```
Expected: all three packages execute and pass.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/package.json apps/medusa/package.json turbo.json .github/workflows/ci.yml scripts/release-gate.sh apps/storefront/src/lib/medusa/__tests__/url.test.ts
git -C CAMPIFRUT commit -m "ci: enforce real workspace type-check and fix strict TS regressions"
```

---

### Task 4: Fix SuperAdmin Validation Drift (Silent No-Op Writes)

**Files:**
- Modify: `bootandstrap-admin/src/lib/validation.ts`
- Modify: `bootandstrap-admin/src/lib/tenants.ts`
- Create: `bootandstrap-admin/src/lib/__tests__/validation-contract.test.ts`
- Create: `bootandstrap-admin/src/lib/__tests__/tenant-update-roundtrip.test.ts`

**Step 1: Add failing schema contract tests**

Assert parity with UI/presets:
- 27 flags (incl. `enable_product_search`, `enable_maintenance_mode`, etc.)
- plan limits (`plan_name`, `max_whatsapp_templates`, `max_file_upload_mb`, `max_email_sends_month`, `max_custom_domains`)
- config fields (`sentry_dsn`, `google_analytics_id`, `facebook_pixel_id`)

**Step 2: Expand schemas to parity**

Use strict zod objects with all supported keys; avoid accidental silent strip of legitimate fields.

**Step 3: Validate mutation behavior**

Roundtrip test: update -> payload reaches Supabase with expected keys.

**Step 4: Verify**

Run:
```bash
pnpm -C bootandstrap-admin test:run
pnpm -C bootandstrap-admin type-check
```
Expected: PASS and no dropped fields.

**Step 5: Commit**

```bash
git -C bootandstrap-admin add src/lib/validation.ts src/lib/tenants.ts src/lib/__tests__/validation-contract.test.ts src/lib/__tests__/tenant-update-roundtrip.test.ts
git -C bootandstrap-admin commit -m "fix: synchronize superadmin validation schemas with UI and DB contract"
```

---

### Task 5: Close CMS XSS Surface in Storefront

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/components/cms/CMSPageRenderer.tsx`
- Modify: `CAMPIFRUT/apps/storefront/src/lib/owner-validation.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/app/[lang]/(panel)/panel/paginas/actions.ts`
- Create: `CAMPIFRUT/apps/storefront/src/components/cms/__tests__/CMSPageRenderer.test.tsx`

**Step 1: Add failing XSS tests**

Cases: `<script>`, `onerror=`, `javascript:` URLs, inline event handlers.

**Step 2: Implement allowlist sanitization**

Introduce HTML sanitizer with explicit allowed tags/attrs/protocols before render and persistence.

**Step 3: Keep authoring UX compatible**

Support required rich text tags only; reject/strip everything else.

**Step 4: Verify**

Run:
```bash
pnpm -C CAMPIFRUT/apps/storefront test:run src/components/cms/__tests__/CMSPageRenderer.test.tsx
pnpm -C CAMPIFRUT/apps/storefront test:run
```
Expected: malicious payload neutralized; suite green.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/components/cms/CMSPageRenderer.tsx apps/storefront/src/lib/owner-validation.ts apps/storefront/src/app/[lang]/(panel)/panel/paginas/actions.ts apps/storefront/src/components/cms/__tests__/CMSPageRenderer.test.tsx
git -C CAMPIFRUT commit -m "sec: sanitize cms HTML on write and render"
```

---

### Task 6: Resolve CMS Public-Access Regression Under Hardened RLS

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/app/[lang]/(shop)/paginas/[slug]/page.tsx`
- Modify: `CAMPIFRUT/docs/architecture/SUPABASE_SCHEMA.md`
- Modify: `CAMPIFRUT/docs/rls-access-control.md`
- Optional Modify: `CAMPIFRUT/supabase/migrations/*` (only if policy changes are chosen)

**Step 1: Decide contract (explicit)**

Recommended contract:
- Public CMS pages remain publicly readable in storefront.
- Read path uses server-side trusted fetch (service role with strict tenant + `published=true` filter) OR dedicated safe RLS policy for published pages.

**Step 2: Implement one consistent approach**

Avoid mixed behavior where docs say public but runtime depends on authenticated profile.

**Step 3: Add regression tests**

Create integration test for anonymous request to published page.

**Step 4: Verify**

Run:
```bash
pnpm -C CAMPIFRUT/apps/storefront test:run
```
Expected: anonymous published CMS route returns content, not false 404.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/app/[lang]/(shop)/paginas/[slug]/page.tsx docs/architecture/SUPABASE_SCHEMA.md docs/rls-access-control.md
# add migration file too if contract chosen via RLS policy

git -C CAMPIFRUT commit -m "fix: align cms public-read behavior with hardened tenant model"
```

---

### Task 7: Make RLS Gate Portable and Correct-by-Construction

**Files:**
- Modify: `CAMPIFRUT/scripts/check-rls.sh`
- Create: `CAMPIFRUT/supabase/tests/rls-static-smoke.sh`
- Modify: `CAMPIFRUT/scripts/release-gate.sh`
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`

**Step 1: Remove non-portable `grep -P` usage**

Use `rg`/POSIX-compatible parsing.

**Step 2: Separate concerns**

- Static policy lint (migration anti-pattern detection).
- Effective-policy smoke check (query `pg_policies` in CI env where DB is available).

**Step 3: Fail closed**

If parser/tool missing or scan fails, gate must fail (not pass silently).

**Step 4: Verify**

Run:
```bash
bash CAMPIFRUT/scripts/check-rls.sh
```
Expected: deterministic pass/fail on BSD/GNU environments.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add scripts/check-rls.sh supabase/tests/rls-static-smoke.sh scripts/release-gate.sh .github/workflows/ci.yml
git -C CAMPIFRUT commit -m "sec: make RLS gates portable and fail-closed"
```

---

### Task 8: Repair CI Medusa Startup and Health Gating

**Files:**
- Modify: `CAMPIFRUT/scripts/ci/start-medusa-stack.sh`
- Modify: `CAMPIFRUT/scripts/ci/wait-for-health.sh`
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`
- Modify: `CAMPIFRUT/docker-compose.yml`

**Step 1: Fix service naming**

Use `medusa-server` consistently (not `medusa`).

**Step 2: Add explicit waits**

Block E2E job until `http://localhost:9000/health` is green.

**Step 3: Ensure teardown in CI**

Collect logs on failure and always stop services.

**Step 4: Verify locally**

Run:
```bash
bash CAMPIFRUT/scripts/ci/start-medusa-stack.sh
bash CAMPIFRUT/scripts/ci/wait-for-health.sh http://localhost:9000/health 180
```
Expected: readiness passes.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add scripts/ci/start-medusa-stack.sh scripts/ci/wait-for-health.sh .github/workflows/ci.yml docker-compose.yml
git -C CAMPIFRUT commit -m "ci: fix medusa service startup and health-gated e2e"
```

---

### Task 9: Convert Playwright Suite into Deterministic Business Assertions

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/e2e/homepage.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/products.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/cart.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/checkout.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/auth.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/components/**` (only where stable `data-testid` missing)

**Step 1: Remove permissive catches and weak assertions**

No silent success on missing elements or optional flows.

**Step 2: Add stable selectors**

Use dedicated `data-testid` for critical business path.

**Step 3: Assert outcomes, not render-only**

Examples: cart count increment, checkout CTA enabled, expected redirect/status.

**Step 4: Verify**

Run:
```bash
BASE_URL=http://localhost:3000 pnpm -C CAMPIFRUT/apps/storefront playwright test
```
Expected: failures indicate real regressions, not selector flakiness.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/e2e apps/storefront/src/components
git -C CAMPIFRUT commit -m "test: harden playwright suite with deterministic business assertions"
```

---

### Task 10: Establish Medusa Unit-Test Baseline (No More Empty Harness)

**Files:**
- Modify: `CAMPIFRUT/apps/medusa/jest.config.js`
- Modify: `CAMPIFRUT/apps/medusa/package.json`
- Create: `CAMPIFRUT/apps/medusa/src/__tests__/health.unit.spec.ts`
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`

**Step 1: Add minimal but real unit test**

Create smoke test validating module bootstrap/helper behavior.

**Step 2: Ensure jest config ignores generated artifacts**

Keep `.medusa`/build outputs excluded to avoid collisions.

**Step 3: Add Medusa tests to mandatory CI gates**

Unit tests required before merge.

**Step 4: Verify**

Run:
```bash
pnpm -C CAMPIFRUT/apps/medusa test:unit
```
Expected: PASS with at least one executed test.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/medusa/jest.config.js apps/medusa/package.json apps/medusa/src/__tests__/health.unit.spec.ts .github/workflows/ci.yml
git -C CAMPIFRUT commit -m "test: establish medusa unit baseline and enforce in ci"
```

---

### Task 11: Dependency Vulnerability Governance (esbuild Advisory)

**Files:**
- Modify: `CAMPIFRUT/package.json`
- Modify: `CAMPIFRUT/pnpm-lock.yaml`
- Create: `CAMPIFRUT/docs/operations/DEPENDENCY_RISK_REGISTER.md`
- Modify: `CAMPIFRUT/scripts/release-gate.sh`

**Step 1: Reproduce advisory**

Run:
```bash
pnpm -C CAMPIFRUT audit --audit-level=moderate
```
Expected: GHSA-67mh-4wv8-2f99 present.

**Step 2: Attempt override remediation**

If transitive chain allows: pin patched `esbuild`.

**Step 3: If blocked, create formal time-boxed waiver**

Document: impact, exploitability in this runtime, owner, expiry date, upgrade trigger.

**Step 4: Align gate policy**

Release gate must fail on undocumented moderate+ findings.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add package.json pnpm-lock.yaml docs/operations/DEPENDENCY_RISK_REGISTER.md scripts/release-gate.sh
git -C CAMPIFRUT commit -m "sec: enforce dependency risk policy for unresolved advisories"
```

---

### Task 12: Eliminate Tooling Noise and Workspace-Root Warnings

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/next.config.ts`
- Modify: `bootandstrap-admin/next.config.ts`
- Modify: `bootandstrap-admin/src/app/(dashboard)/tenants/[id]/page.tsx`
- Modify: `bootandstrap-admin/.github/workflows/ci.yml`

**Step 1: Fix Turbopack root config**

Use absolute/derived project-root-safe config in both repos.

**Step 2: Remove admin lint warnings**

Replace unused destructuring in tenant detail page.

**Step 3: Align Node/pnpm versions**

CI versions must match `.nvmrc` and local policy.

**Step 4: Verify**

Run:
```bash
pnpm -C CAMPIFRUT/apps/storefront build
pnpm -C bootandstrap-admin lint && pnpm -C bootandstrap-admin build
```
Expected: no avoidable warnings.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/next.config.ts
git -C CAMPIFRUT commit -m "build: normalize storefront turbopack root config"

git -C bootandstrap-admin add next.config.ts src/app/(dashboard)/tenants/[id]/page.tsx .github/workflows/ci.yml
git -C bootandstrap-admin commit -m "chore: clean lint debt and align ci runtime versions"
```

---

### Task 13: Introduce Dual-Repo Release Gate (Single Source of Truth)

**Files:**
- Create: `CAMPIFRUT/scripts/ops/dual-repo-release-gate.sh`
- Modify: `CAMPIFRUT/docs/operations/CLIENT_HANDOFF.md`
- Modify: `bootandstrap-admin/docs/DEPLOYMENT.md`

**Step 1: Add orchestration script**

Script executes required checks in both repos and fails on first blocker.

**Step 2: Define mandatory gate matrix**

- CAMPIFRUT: rls, lint, type-check, unit, medusa unit, build, audit policy.
- bootandstrap-admin: lint, type-check, test, build.

**Step 3: Verify**

Run:
```bash
bash CAMPIFRUT/scripts/ops/dual-repo-release-gate.sh
```
Expected: one deterministic status for both repos.

**Step 4: Document ownership**

Assign owner per gate and rollback contact.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add scripts/ops/dual-repo-release-gate.sh docs/operations/CLIENT_HANDOFF.md
git -C CAMPIFRUT commit -m "ops: add dual-repo release gate orchestration"

git -C bootandstrap-admin add docs/DEPLOYMENT.md
git -C bootandstrap-admin commit -m "docs: align deployment with dual-repo release gate"
```

---

### Task 14: Documentation Convergence and Final Readiness Sign-Off

**Files:**
- Modify: `CAMPIFRUT/GEMINI.md`
- Modify: `CAMPIFRUT/ROADMAP.md`
- Modify: `CAMPIFRUT/docs/RUNBOOK.md`
- Modify: `CAMPIFRUT/docs/architecture/SUPABASE_SCHEMA.md`
- Modify: `bootandstrap-admin/GEMINI.md`
- Modify: `bootandstrap-admin/README.md`
- Create: `CAMPIFRUT/docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v7_FINAL.md`

**Step 1: Replace stale claims with measured outputs**

No success statement without command evidence.

**Step 2: Add residual risk section**

List accepted risks + expiry/remediation owners.

**Step 3: Validate docs hygiene**

Run:
```bash
rg -n "TODO|FIXME|TBD|PLACEHOLDER" CAMPIFRUT/docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v7_FINAL.md bootandstrap-admin/GEMINI.md CAMPIFRUT/GEMINI.md
```
Expected: no unresolved blocker placeholders.

**Step 4: Final gate run**

Run dual-repo release gate; attach output snapshots.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add GEMINI.md ROADMAP.md docs/RUNBOOK.md docs/architecture/SUPABASE_SCHEMA.md docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v7_FINAL.md
git -C CAMPIFRUT commit -m "docs: publish v7 final readiness evidence and runtime-aligned architecture"

git -C bootandstrap-admin add GEMINI.md README.md
git -C bootandstrap-admin commit -m "docs: synchronize admin docs with verified quality gates"
```

---

## Exit Criteria (100% SOTA Baseline)

1. `CAMPIFRUT/scripts/release-gate.sh` green with type-check as blocking gate.
2. `pnpm -C CAMPIFRUT/apps/storefront exec tsc --noEmit` green.
3. `pnpm -C CAMPIFRUT/apps/medusa test:unit` green with non-empty suite.
4. `pnpm -C CAMPIFRUT audit --audit-level=moderate` green OR documented approved waiver with expiry.
5. `pnpm -C bootandstrap-admin lint && pnpm -C bootandstrap-admin type-check && pnpm -C bootandstrap-admin test:run && pnpm -C bootandstrap-admin build` green sin warnings evitables.
6. SuperAdmin updates persist all supported flags/limits/config fields (sin silent drop).
7. CMS rendering path sanitizado contra XSS.
8. CMS public-read contract explícito y probado (sin contradicción docs/runtime).
9. CI e2e arranca Medusa correctamente y espera health checks.
10. Un comando dual-repo entrega estado final release-ready.

---

## Execution Order (Recommended)

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7
8. Task 8
9. Task 9
10. Task 10
11. Task 11
12. Task 12
13. Task 13
14. Task 14

