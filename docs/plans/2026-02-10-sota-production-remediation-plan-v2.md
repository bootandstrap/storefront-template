# SOTA Production Remediation Plan v2

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** llevar `CAMPIFRUT` + `bootandstrap-admin` a un estado de producción SOTA verificable con aislamiento multi-tenant real, seguridad fuerte, CI confiable y operación reproducible.

**Architecture:** ejecutar en 4 olas con gates estrictos: (1) seguridad y aislamiento de datos, (2) calidad y pruebas, (3) CI/CD + runtime reproducible, (4) documentación y operación. Ninguna ola avanza sin evidencia automática.

**Tech Stack:** Next.js 16, React 19, Supabase (RLS + RPC + migrations), Medusa v2, pnpm + Turborepo, Vitest + Playwright + Jest, Docker Compose, GitHub Actions.

---

## OLA 1 — Seguridad y Multi-Tenant (P0)

### Task 1: Corregir type-check rojo del monorepo

**Files:**
- Modify: `CAMPIFRUT/packages/shared/package.json`
- Modify: `CAMPIFRUT/packages/shared/tsconfig.json`

**Step 1: Agregar tipos Node al paquete shared**

Acción: añadir `@types/node` en `devDependencies` y `"types": ["node"]`.

**Step 2: Verificar type-check aislado del paquete**

Run:
```bash
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT/packages/shared type-check
```
Expected: `0 errors`.

**Step 3: Verificar gate global**

Run:
```bash
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT type-check
```
Expected: PASS.

### Task 2: Enforzar tenant-scope en límites de registro y panel auth

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/app/[lang]/(auth)/registro/page.tsx`
- Modify: `CAMPIFRUT/apps/storefront/src/app/[lang]/(auth)/registro/actions.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/lib/panel-auth.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/app/[lang]/(panel)/layout.tsx`

**Step 1: Añadir `.eq('tenant_id', tenantId)` en conteo de customers**

Acción: usar `getRequiredTenantId()` en ambos conteos (`registro/page`, `registro/actions`).

**Step 2: Resolver tenant desde perfil en `requirePanelAuth()`**

Acción: consultar `profiles(id, role, tenant_id)` y devolver `tenantId` desde DB, no desde ENV para `owner/admin`.

**Step 3: Reglas de autorización explícitas**

Acción:
- `super_admin`: puede operar con `tenantId` explícito.
- `owner/admin`: solo `profile.tenant_id`.
- negar acceso si falta `tenant_id` para roles tenant-bound.

**Step 4: Alinear guard de layout con roles soportados**

Acción: decidir si `admin` entra al owner panel; implementar criterio único en `layout` y en server actions.

**Step 5: Tests unitarios de autorización/tenant**

Create:
- `CAMPIFRUT/apps/storefront/src/lib/__tests__/panel-auth.test.ts`
- `CAMPIFRUT/apps/storefront/src/app/[lang]/(auth)/registro/__tests__/customer-limit-tenant-scope.test.ts`

Run:
```bash
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT/apps/storefront test:run
```
Expected: nuevas pruebas verdes.

### Task 3: Endurecer RLS multi-tenant en tablas públicas de governance

**Files:**
- Modify: `CAMPIFRUT/supabase/migrations/20260209_rls_policies_complete.sql`
- Create: `CAMPIFRUT/supabase/migrations/20260210_rls_hardening_public_reads.sql`
- Modify: `CAMPIFRUT/docs/architecture/SUPABASE_SCHEMA.md`

**Step 1: Eliminar políticas `SELECT USING (true)` en tablas sensibles**

Tablas objetivo: `config`, `feature_flags`, `plan_limits`, `cms_pages`, `carousel_slides`, `whatsapp_templates`.

**Step 2: Definir política segura de lectura**

Acción recomendada:
- lectura por `service_role` para storefront SSR.
- lectura por `super_admin`/`owner` tenant-bound para paneles.
- mantener solo superficies públicas mínimas donde sea estrictamente necesario.

**Step 3: Añadir script de verificación de políticas**

Create:
- `CAMPIFRUT/supabase/tests/rls-smoke.sql` (si no existe carpeta, crearla)

Validar:
- `anon` no puede leer cross-tenant.
- `owner` no lee/escribe fuera de su tenant.
- `super_admin` sí opera cross-tenant.

**Step 4: Ejecutar reset y smoke**

Run:
```bash
supabase db reset
supabase db diff --use-migra
```
Expected: reset limpio y diff sin drift inesperado.

### Task 4: Aislar canal de analytics para evitar inserciones sin tenant

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/lib/analytics.ts`
- Modify: `CAMPIFRUT/supabase/migrations/20260209_rls_policies_complete.sql`
- Create: `CAMPIFRUT/apps/storefront/src/app/api/analytics/route.ts`

**Step 1: bloquear inserts con `tenant_id IS NULL`**

Acción: validar `tenant_id` obligatorio y rechazar eventos inválidos.

**Step 2: mover tracking client-side a API interna**

Acción: `trackEvent()` envía a `/api/analytics`; el servidor agrega tenantId confiable y aplica sanitización.

**Step 3: limitar volumen y shape del payload**

Acción: whitelist de `event_type`, tamaño máximo de `properties`, y rate-limit básico por IP.

---

## OLA 2 — Calidad, Tests y Coverage (P1)

### Task 5: Fortalecer E2E para que validen reglas de negocio reales

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/e2e/homepage.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/products.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/cart.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/checkout.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/auth.spec.ts`
- Modify: `CAMPIFRUT/apps/storefront/e2e/i18n.spec.ts`

**Step 1: eliminar asserts débiles (`main visible`, `truthy`)**

Acción: reemplazar por validaciones determinísticas de flujo y datos.

**Step 2: cubrir casos críticos**

Casos mínimos:
- checkout bloqueado cuando `max_orders_month` excede.
- registro bloqueado por `max_customers`.
- feature flags ocultan/inhabilitan métodos de pago.
- rutas i18n mantienen slug correcto.

**Step 3: eliminar dependencia de selectores frágiles**

Acción: introducir `data-testid` estables en componentes críticos.

### Task 6: Añadir tests en `bootandstrap-admin` (hoy sin suite)

**Files:**
- Modify: `bootandstrap-admin/package.json`
- Create: `bootandstrap-admin/vitest.config.ts`
- Create: `bootandstrap-admin/src/lib/__tests__/require-super-admin.test.ts`
- Create: `bootandstrap-admin/src/lib/__tests__/tenants-rpc.test.ts`

**Step 1: configurar runner de tests**

Acción: añadir script `test:run` y setup básico de Vitest.

**Step 2: tests de autorización y RPC**

Cubrimiento mínimo:
- denegar acciones sin sesión.
- denegar rol no `super_admin`.
- manejo correcto de errores de `provision_tenant`/`delete_tenant`.

**Step 3: ejecutar suite admin**

Run:
```bash
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin test:run
```
Expected: PASS.

### Task 7: Incluir Medusa tests en flujo de calidad

**Files:**
- Modify: `CAMPIFRUT/package.json`
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`

**Step 1: agregar job explícito para Medusa**

Acción: ejecutar al menos `apps/medusa test:integration:http` en CI con entorno controlado.

**Step 2: definir dataset mínimo para tests de integración**

Acción: script de setup reproducible previo a tests.

---

## OLA 3 — CI/CD y Runtime Reproducible (P1)

### Task 8: Corregir job E2E en CI (actualmente sin Medusa real)

**Files:**
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`
- Modify: `CAMPIFRUT/apps/storefront/playwright.config.ts`

**Step 1: levantar `storefront + medusa + redis` para E2E**

Acción: usar `docker compose -f docker-compose.dev.yml` o servicios separados en workflow.

**Step 2: seed determinista antes de Playwright**

Acción: ejecutar seed idempotente y esperar health checks listos.

**Step 3: hacer fallar CI ante test frágil**

Acción: quitar `continue-on-error` donde corresponda.

### Task 9: Fijar versiones de toolchain para builds reproducibles

**Files:**
- Modify: `bootandstrap-admin/Dockerfile`
- Modify: `bootandstrap-admin/.github/workflows/ci.yml`
- Create: `bootandstrap-admin/.nvmrc`

**Step 1: reemplazar `pnpm@latest` por versión fija**

Acción: usar la misma versión de lockfile (ej. `9.15.4`) en Docker + CI.

**Step 2: alinear versión de Node entre CI, Docker y local**

Acción: definir versión única y documentarla.

### Task 10: Corregir drift en scripts operativos (`clients/*`, SQL legacy)

**Files:**
- Modify: `CAMPIFRUT/scripts/provision-tenant.sql`
- Modify: `CAMPIFRUT/scripts/provision-client.sh`
- Modify: `CAMPIFRUT/scripts/generate-env.sh`
- Modify: `CAMPIFRUT/scripts/backup.sh`
- Modify: `CAMPIFRUT/scripts/restore.sh`

**Step 1: actualizar SQL al schema real**

Acción: reemplazar columnas legacy (`plan_tier`, `store_name`, `owner_email`, `whatsapp_phone`) por columnas existentes y/o RPC oficial.

**Step 2: eliminar supuestos de rutas inexistentes (`clients/*`)**

Acción: adaptar scripts a estructura actual del repo.

**Step 3: alinear variables DB (`SUPABASE_DB_URL` vs `DATABASE_URL`)**

Acción: usar una convención única en scripts y docs.

**Step 4: smoke test de scripts**

Run:
```bash
bash -n /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT/scripts/*.sh
```
Expected: sin errores de sintaxis.

---

## OLA 4 — Documentación y Operación (P2)

### Task 11: Sincronizar documentación con estado real (evitar drift)

**Files:**
- Modify: `CAMPIFRUT/GEMINI.md`
- Modify: `CAMPIFRUT/ROADMAP.md`
- Modify: `CAMPIFRUT/docs/guides/TEMPLATE_USAGE.md`
- Modify: `CAMPIFRUT/docs/guides/DEVELOPMENT.md`
- Modify: `CAMPIFRUT/docs/operations/CLIENT_HANDOFF.md`
- Modify: `bootandstrap-admin/README.md`

**Step 1: actualizar baseline de calidad con evidencia actual**

Acción: reemplazar claims por tabla `comando + fecha + resultado`.

**Step 2: corregir variables y pasos de despliegue**

Acción: unificar nombres (`REVALIDATION_SECRET`, `MEDUSA_BACKEND_URL`, etc.) y eliminar comandos obsoletos.

### Task 12: Crear runbook de observabilidad y release gates SOTA

**Files:**
- Create: `CAMPIFRUT/docs/operations/OBSERVABILITY.md`
- Modify: `CAMPIFRUT/docs/RUNBOOK.md`

**Step 1: definir señales mínimas de producción**

Contenido mínimo:
- logs estructurados con `tenant_id` y `request_id`.
- alertas de error-rate, latency p95, checkout failures.
- health probes `live` y `ready`.

**Step 2: definir gates de release innegociables**

Checklist final:
- `lint` verde
- `type-check` verde
- `unit` verde
- `integration` verde
- `e2e` verde
- migraciones aplicables sin drift
- rollback probado

---

## Gate Final (Definition of Done SOTA)

Run:
```bash
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT lint
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT type-check
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT test:run
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT build
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin lint
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin type-check
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin build
```

Expected: todo en verde y evidencia adjunta en CI.

