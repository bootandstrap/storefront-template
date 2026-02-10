# SOTA Production Remediation Plan v3

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** llevar `CAMPIFRUT` + `bootandstrap-admin` a un estado SOTA de produccion con seguridad multi-tenant verificable, pipelines confiables y operacion reproducible sin falsos verdes.

**Architecture:** ejecutar en 4 olas con gates estrictos: (A) correccion de riesgos criticos de seguridad/correctitud, (B) calidad y CI real, (C) runtime reproducible y operaciones, (D) cierre documental + release gates. Cada tarea se implementa con TDD cuando aplique, evidencia automatica y commits pequenos.

**Tech Stack:** Next.js 16 (App Router + Proxy), React 19, Supabase (RLS + SQL migrations + RPC), Medusa v2, pnpm + Turborepo, Vitest, Playwright, Jest, Docker Compose, GitHub Actions.

---

## Baseline Validado (10 Feb 2026)

- `pnpm -C CAMPIFRUT lint` -> PASS
- `pnpm -C CAMPIFRUT type-check` -> PASS (pero solo ejecuta `@campifrut/shared`)
- `pnpm -C CAMPIFRUT test:run` -> PASS (storefront: 116 tests)
- `pnpm -C CAMPIFRUT build` -> PASS con warnings operativos (Next workspace root, Sentry deprecation, errores Medusa durante SSG)
- `pnpm -C bootandstrap-admin lint` -> PASS con 6 warnings
- `pnpm -C bootandstrap-admin type-check` -> PASS
- `pnpm -C bootandstrap-admin test:run` -> PASS (14 tests)
- `pnpm -C bootandstrap-admin build` -> PASS con warning de workspace root
- `pnpm -C CAMPIFRUT audit --prod --json` -> 1 vulnerabilidad moderada (`esbuild`, advisory `GHSA-67mh-4wv8-2f99`)

---

## OLA A - P0 (Seguridad y Correctitud)

### Task 1: Unificar URL de Medusa en cliente y eliminar fallback localhost en produccion

**Files:**
- Create: `CAMPIFRUT/apps/storefront/src/lib/medusa/url.ts`
- Create: `CAMPIFRUT/apps/storefront/src/lib/medusa/__tests__/url.test.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/contexts/CartContext.tsx`
- Modify: `CAMPIFRUT/apps/storefront/src/app/[lang]/(shop)/pedido/page.tsx`
- Modify: `CAMPIFRUT/.env.example`
- Modify: `CAMPIFRUT/docs/guides/DEPLOYMENT.md`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { getPublicMedusaUrl } from '../url'

describe('getPublicMedusaUrl', () => {
  it('prefers NEXT_PUBLIC_MEDUSA_BACKEND_URL', () => {
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL = 'https://api.example.com'
    expect(getPublicMedusaUrl()).toBe('https://api.example.com')
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm -C CAMPIFRUT/apps/storefront vitest run src/lib/medusa/__tests__/url.test.ts
```
Expected: FAIL (`getPublicMedusaUrl` no existe).

**Step 3: Write minimal implementation**

Accion: crear `getPublicMedusaUrl()` y reemplazar `NEXT_PUBLIC_MEDUSA_URL` legacy por esa funcion.

**Step 4: Run test to verify it passes**

Run:
```bash
pnpm -C CAMPIFRUT/apps/storefront vitest run src/lib/medusa/__tests__/url.test.ts
pnpm -C CAMPIFRUT/apps/storefront build
```
Expected: PASS y sin referencias nuevas a `NEXT_PUBLIC_MEDUSA_URL`.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/lib/medusa/url.ts apps/storefront/src/lib/medusa/__tests__/url.test.ts apps/storefront/src/contexts/CartContext.tsx apps/storefront/src/app/[lang]/(shop)/pedido/page.tsx .env.example docs/guides/DEPLOYMENT.md
git -C CAMPIFRUT commit -m "fix: unify public medusa backend env resolution"
```

### Task 2: Corregir Guest Order Lookup para evitar leakage y busqueda incorrecta

**Files:**
- Create: `CAMPIFRUT/apps/storefront/src/app/api/orders/lookup/route.ts`
- Create: `CAMPIFRUT/apps/storefront/src/app/api/orders/lookup/__tests__/route.test.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/app/[lang]/(shop)/pedido/page.tsx`
- Modify: `CAMPIFRUT/docs/operations/API_REFERENCE.md`

**Step 1: Write the failing test**

```ts
it('returns 400 when email/orderId missing', async () => {
  // call POST /api/orders/lookup with invalid payload
  // expect status 400
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm -C CAMPIFRUT/apps/storefront vitest run src/app/api/orders/lookup/__tests__/route.test.ts
```
Expected: FAIL (route no existe).

**Step 3: Write minimal implementation**

Accion:
- mover lookup a endpoint server-side.
- validar `email` + `display_id`.
- consultar Medusa de forma segura (no exponer listado crudo en cliente).
- responder solo campos minimos.

**Step 4: Run test to verify it passes**

Run:
```bash
pnpm -C CAMPIFRUT/apps/storefront vitest run src/app/api/orders/lookup/__tests__/route.test.ts
pnpm -C CAMPIFRUT/apps/storefront test:run
```
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/app/api/orders/lookup/route.ts apps/storefront/src/app/api/orders/lookup/__tests__/route.test.ts apps/storefront/src/app/[lang]/(shop)/pedido/page.tsx docs/operations/API_REFERENCE.md
git -C CAMPIFRUT commit -m "fix: secure guest order lookup via server endpoint"
```

### Task 3: Alinear autorizacion Owner Panel (proxy/layout/actions) y definir politica unica

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/proxy.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/app/[lang]/(panel)/layout.tsx`
- Modify: `CAMPIFRUT/apps/storefront/src/lib/panel-auth.ts`
- Create: `CAMPIFRUT/apps/storefront/src/lib/__tests__/panel-access-policy.test.ts`

**Step 1: Write the failing test**

```ts
it('uses the same allowed roles in proxy and server auth', () => {
  // assert owner/admin/super_admin policy is consistent
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm -C CAMPIFRUT/apps/storefront vitest run src/lib/__tests__/panel-access-policy.test.ts
```
Expected: FAIL (roles inconsistentes).

**Step 3: Write minimal implementation**

Accion: centralizar roles permitidos (`owner`, `admin`, `super_admin`) en una constante compartida y reutilizar en proxy/layout/actions.

**Step 4: Run test to verify it passes**

Run:
```bash
pnpm -C CAMPIFRUT/apps/storefront vitest run src/lib/__tests__/panel-access-policy.test.ts
pnpm -C CAMPIFRUT/apps/storefront test:run
```
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/src/proxy.ts apps/storefront/src/app/[lang]/(panel)/layout.tsx apps/storefront/src/lib/panel-auth.ts apps/storefront/src/lib/__tests__/panel-access-policy.test.ts
git -C CAMPIFRUT commit -m "fix: align owner panel authorization policy"
```

### Task 4: Cerrar riesgo de RLS permisivo y dejar verificacion automatica de politicas

**Files:**
- Modify: `CAMPIFRUT/supabase/migrations/20260210_rls_hardening_public_reads.sql`
- Create: `CAMPIFRUT/supabase/tests/rls-policy-regression.sql`
- Create: `CAMPIFRUT/scripts/check-rls.sh`
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`

**Step 1: Write the failing check**

Accion: `check-rls.sh` falla si detecta `FOR SELECT USING (true)` en tablas governance activas.

**Step 2: Run check to verify it fails**

Run:
```bash
bash CAMPIFRUT/scripts/check-rls.sh
```
Expected: FAIL en baseline si el check detecta politicas permisivas sin hardening aplicado en estado local.

**Step 3: Write minimal implementation**

Accion:
- reforzar `DROP POLICY IF EXISTS` para nombres legacy y nuevos.
- agregar SQL de regresion para inspeccionar politicas efectivas.
- ejecutar check en CI.

**Step 4: Run verification**

Run:
```bash
bash CAMPIFRUT/scripts/check-rls.sh
supabase db reset
psql "$DATABASE_URL" -f CAMPIFRUT/supabase/tests/rls-policy-regression.sql
```
Expected: PASS, sin lecturas cross-tenant anon.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add supabase/migrations/20260210_rls_hardening_public_reads.sql supabase/tests/rls-policy-regression.sql scripts/check-rls.sh .github/workflows/ci.yml
git -C CAMPIFRUT commit -m "sec: enforce and verify tenant-scoped rls policies"
```

---

## OLA B - P1 (Calidad y CI Real)

### Task 5: Endurecer Playwright para que falle ante regresiones reales

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/e2e/homepage.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/products.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/cart.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/checkout.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/auth.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/i18n.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/**` (agregar `data-testid` estables en flujos criticos)

**Step 1: Write failing E2E assertions**

Accion: reemplazar asserts debiles (`toBeTruthy`, catches silenciosos, status 200/30x amplio) por asserts deterministas de negocio.

**Step 2: Run E2E to verify failures**

Run:
```bash
pnpm -C CAMPIFRUT/apps/storefront playwright test
```
Expected: FAIL inicial por selectores y cobertura insuficiente.

**Step 3: Write minimal implementation**

Accion: introducir `data-testid` en checkout/auth/cart e2e-critical.

**Step 4: Run tests to verify pass**

Run:
```bash
pnpm -C CAMPIFRUT/apps/storefront playwright test
```
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/e2e apps/storefront/src
git -C CAMPIFRUT commit -m "test: harden storefront e2e assertions and selectors"
```

### Task 6: Corregir pipeline E2E (levantar dependencias reales)

**Files:**
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`
- Modify: `CAMPIFRUT/apps/storefront/playwright.config.ts`
- Create: `CAMPIFRUT/scripts/ci/start-e2e-stack.sh`

**Step 1: Write failing CI dry-run script**

Accion: script falla si `http://localhost:9000/health` no esta listo antes de Playwright.

**Step 2: Run local dry-run to verify failure**

Run:
```bash
bash CAMPIFRUT/scripts/ci/start-e2e-stack.sh
```
Expected: FAIL en estado actual si no se inicia Medusa.

**Step 3: Write minimal implementation**

Accion:
- iniciar Medusa + Redis + storefront en job E2E.
- seed deterministico previo a tests.
- eliminar supuestos no ejecutados.

**Step 4: Verify**

Run:
```bash
pnpm -C CAMPIFRUT/apps/medusa build
pnpm -C CAMPIFRUT/apps/storefront build
BASE_URL=http://localhost:3000 pnpm -C CAMPIFRUT/apps/storefront playwright test
```
Expected: PASS con stack real.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add .github/workflows/ci.yml apps/storefront/playwright.config.ts scripts/ci/start-e2e-stack.sh
git -C CAMPIFRUT commit -m "ci: run e2e against real medusa stack"
```

### Task 7: Incluir Medusa tests reales en gates (sin continue-on-error)

**Files:**
- Modify: `CAMPIFRUT/apps/medusa/package.json`
- Modify: `CAMPIFRUT/apps/medusa/integration-tests/http/health.spec.ts`
- Create: `CAMPIFRUT/apps/medusa/integration-tests/http/store-products.spec.ts`
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`

**Step 1: Write failing integration test**

```ts
it('lists seeded store products with 200', async () => {
  const res = await api.get('/store/products?limit=1')
  expect(res.status).toBe(200)
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm -C CAMPIFRUT/apps/medusa test:integration:http
```
Expected: FAIL inicial sin seed/setup apropiado.

**Step 3: Write minimal implementation**

Accion:
- agregar setup deterministico para datos minimos.
- agregar script `test:run`/`type-check` en Medusa para Turbo.
- quitar `continue-on-error` en CI.

**Step 4: Verify**

Run:
```bash
pnpm -C CAMPIFRUT/apps/medusa test:integration:http
pnpm -C CAMPIFRUT turbo test:run
```
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/medusa/package.json apps/medusa/integration-tests/http .github/workflows/ci.yml
git -C CAMPIFRUT commit -m "test: enforce medusa integration tests in ci gates"
```

### Task 8: Completar calidad del repo admin (tests + warning-free lint)

**Files:**
- Modify: `bootandstrap-admin/.github/workflows/ci.yml`
- Modify: `bootandstrap-admin/eslint.config.mjs`
- Modify: `bootandstrap-admin/src/app/(dashboard)/tenants/[id]/page.tsx`

**Step 1: Write failing lint expectation**

Accion: configurar regla para `_` prefijo o eliminar bindings no usados.

**Step 2: Run lint to verify failure before fix**

Run:
```bash
pnpm -C bootandstrap-admin lint
```
Expected: warnings actuales en `tenants/[id]/page.tsx`.

**Step 3: Write minimal implementation**

Accion:
- resolver warnings.
- agregar `pnpm test:run` al workflow de admin.
- alinear Node/pnpm con `.nvmrc`.

**Step 4: Verify**

Run:
```bash
pnpm -C bootandstrap-admin lint
pnpm -C bootandstrap-admin test:run
pnpm -C bootandstrap-admin build
```
Expected: PASS sin warnings.

**Step 5: Commit**

```bash
git -C bootandstrap-admin add .github/workflows/ci.yml eslint.config.mjs src/app/(dashboard)/tenants/[id]/page.tsx
git -C bootandstrap-admin commit -m "ci: enforce admin tests and clean lint warnings"
```

---

## OLA C - P1/P2 (Runtime Reproducible y Operaciones)

### Task 9: Fijar toolchain y eliminar warnings de workspace root

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/next.config.ts`
- Modify: `bootandstrap-admin/next.config.ts`
- Modify: `bootandstrap-admin/Dockerfile`
- Modify: `bootandstrap-admin/.github/workflows/ci.yml`
- Modify: `CAMPIFRUT/dev.sh`
- Modify: `CAMPIFRUT/docker-compose.dev.yml`

**Step 1: Write failing reproducibility check**

Accion: script que valida versiones (`node`, `pnpm`) y falla con version no soportada.

**Step 2: Run check to verify fail**

Run:
```bash
node -v
pnpm -v
```
Expected: detectar drift respecto a version fijada por proyecto.

**Step 3: Write minimal implementation**

Accion:
- fijar `pnpm@9.15.4` en Docker admin (no `latest`).
- alinear Node CI con `.nvmrc`.
- definir `turbopack.root` para evitar inferencia a `/Users/webnorka/pnpm-lock.yaml`.
- normalizar uso de pnpm vs npm en scripts locales.

**Step 4: Verify**

Run:
```bash
pnpm -C CAMPIFRUT/apps/storefront build
pnpm -C bootandstrap-admin build
docker build -f bootandstrap-admin/Dockerfile bootandstrap-admin
```
Expected: builds verdes sin warning de root inferido.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/next.config.ts dev.sh docker-compose.dev.yml
git -C CAMPIFRUT commit -m "chore: standardize local runtime and turbopack root"
git -C bootandstrap-admin add next.config.ts Dockerfile .github/workflows/ci.yml
git -C bootandstrap-admin commit -m "chore: pin toolchain for deterministic admin builds"
```

### Task 10: Reescribir scripts operativos legacy a estructura real del repo

**Files:**
- Modify: `CAMPIFRUT/scripts/provision-client.sh`
- Modify: `CAMPIFRUT/scripts/provision-tenant.sql`
- Modify: `CAMPIFRUT/scripts/generate-env.sh`
- Modify: `CAMPIFRUT/scripts/backup.sh`
- Modify: `CAMPIFRUT/scripts/restore.sh`
- Create: `CAMPIFRUT/scripts/__tests__/smoke.sh`
- Modify: `CAMPIFRUT/docs/guides/DEPLOYMENT.md`
- Modify: `CAMPIFRUT/docs/guides/TEMPLATE_USAGE.md`

**Step 1: Write failing script smoke tests**

Accion: pruebas de shell que validen rutas reales (sin `clients/*`) y SQL con columnas actuales (`whatsapp_number`).

**Step 2: Run tests to verify they fail**

Run:
```bash
bash CAMPIFRUT/scripts/__tests__/smoke.sh
```
Expected: FAIL con estado actual.

**Step 3: Write minimal implementation**

Accion:
- migrar scripts a `ROOT/.env.<slug>` y estructura real.
- unificar `SUPABASE_DB_URL` vs `DATABASE_URL`.
- corregir columnas SQL segun schema actual.

**Step 4: Verify**

Run:
```bash
bash -n CAMPIFRUT/scripts/*.sh
bash CAMPIFRUT/scripts/__tests__/smoke.sh
```
Expected: PASS.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add scripts docs/guides/DEPLOYMENT.md docs/guides/TEMPLATE_USAGE.md
git -C CAMPIFRUT commit -m "ops: modernize provisioning and backup scripts for current schema"
```

### Task 11: Hardening de seguridad app-level (CSP/Sentry/logging/rate-limit distribuido)

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/next.config.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/proxy.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/app/api/analytics/route.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/lib/logger.ts`
- Create: `CAMPIFRUT/apps/storefront/src/lib/security/rate-limit.ts`
- Create: `CAMPIFRUT/apps/storefront/src/lib/security/__tests__/rate-limit.test.ts`

**Step 1: Write failing security tests/checks**

Accion:
- test que falle si CSP incluye `unsafe-eval` en produccion.
- test que valide fallback seguro de rate-limit si backend distribuido no esta disponible.

**Step 2: Run tests to verify fail**

Run:
```bash
pnpm -C CAMPIFRUT/apps/storefront vitest run src/lib/security/__tests__/rate-limit.test.ts
```
Expected: FAIL inicial.

**Step 3: Write minimal implementation**

Accion:
- mover rate-limit en memoria a adaptador distribuido (Upstash/Redis) con fallback.
- eliminar `disableLogger` deprecado de Sentry config.
- endurecer CSP para produccion.

**Step 4: Verify**

Run:
```bash
pnpm -C CAMPIFRUT/apps/storefront lint
pnpm -C CAMPIFRUT/apps/storefront test:run
pnpm -C CAMPIFRUT/apps/storefront build
```
Expected: PASS sin warning deprecado de Sentry.

**Step 5: Commit**

```bash
git -C CAMPIFRUT add apps/storefront/next.config.ts apps/storefront/src/proxy.ts apps/storefront/src/app/api/analytics/route.ts apps/storefront/src/lib/logger.ts apps/storefront/src/lib/security
git -C CAMPIFRUT commit -m "sec: harden csp and distributed rate limiting"
```

---

## OLA D - P2 (Documentacion, Observabilidad y Gate Final)

### Task 12: Sincronizar documentacion con estado real y evidencia fechada

**Files:**
- Modify: `CAMPIFRUT/DOCS_GUIDE.md`
- Modify: `CAMPIFRUT/ROADMAP.md`
- Modify: `CAMPIFRUT/docs/guides/DEVELOPMENT.md`
- Modify: `CAMPIFRUT/docs/guides/DEPLOYMENT.md`
- Modify: `CAMPIFRUT/docs/operations/CLIENT_HANDOFF.md`
- Modify: `bootandstrap-admin/README.md`
- Modify: `bootandstrap-admin/docs/DEPLOYMENT.md`
- Create: `CAMPIFRUT/docs/operations/QUALITY_BASELINE.md`

**Step 1: Write quality baseline table**

Accion: documentar `comando`, `fecha`, `resultado`, `commit`.

**Step 2: Verify docs consistency**

Run:
```bash
rg -n "pending de separacion|NEXT_PUBLIC_MEDUSA_BACKEND_URL|lint ❌|type-check ❌" CAMPIFRUT
```
Expected: no claims obsoletos.

**Step 3: Commit**

```bash
git -C CAMPIFRUT add DOCS_GUIDE.md ROADMAP.md docs/guides/DEVELOPMENT.md docs/guides/DEPLOYMENT.md docs/operations/CLIENT_HANDOFF.md docs/operations/QUALITY_BASELINE.md
git -C CAMPIFRUT commit -m "docs: sync roadmap and operational guides with verified baseline"
git -C bootandstrap-admin add README.md docs/DEPLOYMENT.md
git -C bootandstrap-admin commit -m "docs: align admin deployment and ci reality"
```

### Task 13: Gate final SOTA (bloqueante) antes de release

**Files:**
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`
- Modify: `bootandstrap-admin/.github/workflows/ci.yml`
- Modify: `CAMPIFRUT/docs/RUNBOOK.md`
- Create: `CAMPIFRUT/scripts/release-gate.sh`

**Step 1: Implement release gate script**

Accion: script unico que ejecuta todos los checks requeridos.

**Step 2: Run gate locally**

Run:
```bash
bash CAMPIFRUT/scripts/release-gate.sh
pnpm -C bootandstrap-admin lint
pnpm -C bootandstrap-admin type-check
pnpm -C bootandstrap-admin test:run
pnpm -C bootandstrap-admin build
```
Expected: PASS completo.

**Step 3: Enforce gate in CI**

Accion: marcar release gate como required check en ambas ramas principales.

**Step 4: Commit**

```bash
git -C CAMPIFRUT add .github/workflows/ci.yml docs/RUNBOOK.md scripts/release-gate.sh
git -C CAMPIFRUT commit -m "ci: enforce sota release gate"
git -C bootandstrap-admin add .github/workflows/ci.yml
git -C bootandstrap-admin commit -m "ci: require full quality gate in admin"
```

---

## Definition of Done (No Negociable)

Run:
```bash
pnpm -C CAMPIFRUT lint
pnpm -C CAMPIFRUT type-check
pnpm -C CAMPIFRUT test:run
pnpm -C CAMPIFRUT build
pnpm -C CAMPIFRUT/apps/medusa test:integration:http
pnpm -C CAMPIFRUT/apps/storefront playwright test
pnpm -C bootandstrap-admin lint
pnpm -C bootandstrap-admin type-check
pnpm -C bootandstrap-admin test:run
pnpm -C bootandstrap-admin build
pnpm -C CAMPIFRUT audit --prod --audit-level=high
pnpm -C bootandstrap-admin audit --prod --audit-level=high
```

Expected:
- todos los checks en verde
- cero warnings de build criticos
- sin politicas RLS permisivas para governance
- CI sin `continue-on-error` en checks de calidad
- documentacion sincronizada con fecha/evidencia
