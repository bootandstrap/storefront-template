# SOTA Production Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** llevar `CAMPIFRUT` + `bootandstrap-admin` a un estado de producción enterprise con seguridad, calidad, observabilidad y operación reproducible.

**Architecture:** estrategia en dos carriles paralelos: (1) correcciones críticas de seguridad/tenant/credenciales, (2) endurecimiento de calidad (lint/type/tests/CI/CD/SRE). Se prioriza eliminar riesgo de fuga de datos y despliegues no determinísticos antes de optimización funcional.

**Tech Stack:** Next.js 16 + React 19, Supabase (RLS + SQL migrations), Medusa v2, Turborepo + pnpm, Playwright + Vitest + Jest, Docker/Dokploy, GitHub Actions.

---

### Task 1: Contención de secretos y exposición crítica

**Files:**
- Modify: `CAMPIFRUT/.gitignore`
- Modify: `CAMPIFRUT/CREDENTIALS.md`
- Create: `CAMPIFRUT/docs/operations/SECRETS_ROTATION_RUNBOOK.md`
- Modify: `CAMPIFRUT/.env.example`

**Step 1: Bloquear artefactos sensibles en repo**

Add ignore rules para credenciales, dumps, backups y archivos de cliente generados.

**Step 2: Sustituir contenido sensible en documentación**

Redactar `CREDENTIALS.md` a placeholders y mover credenciales reales a secret manager.

**Step 3: Crear runbook de rotación**

Documentar rotación obligatoria para Supabase keys, DB password, cuentas de prueba, Medusa secrets y tokens externos.

**Step 4: Verificar no quedan secretos en historial reciente de trabajo**

Run: `rg -n "(service_role|SUPABASE_SERVICE_ROLE_KEY|password|sk_live|eyJhbGci)" /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT --hidden`
Expected: solo placeholders/documentación redactada.

**Step 5: Commit**

```bash
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT add .gitignore CREDENTIALS.md docs/operations/SECRETS_ROTATION_RUNBOOK.md .env.example
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT commit -m "security: remove exposed credentials and add rotation runbook"
```

### Task 2: Reparar baseline de calidad en `bootandstrap-admin`

**Files:**
- Modify: `bootandstrap-admin/package.json`
- Create: `bootandstrap-admin/eslint.config.mjs`
- Create: `bootandstrap-admin/.github/workflows/ci.yml`
- Create: `bootandstrap-admin/src/lib/__tests__/` (primer set)

**Step 1: Arreglar script lint roto en Next 16**

Reemplazar `next lint` por `eslint .` y añadir dependencias ESLint necesarias.

**Step 2: Añadir configuración ESLint estricta**

Usar `eslint-config-next/core-web-vitals` + TypeScript.

**Step 3: Activar CI mínima obligatoria**

Pipeline: install, lint, type-check, build.

**Step 4: Añadir primeras pruebas unitarias de `src/lib/tenants.ts`**

Cubrir errores de inserción parcial y validaciones de input.

**Step 5: Verificar**

Run: `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin lint && pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin type-check && pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin build`
Expected: PASS en los 3 checks.

### Task 3: Endurecer autorización de server actions con service role

**Files:**
- Modify: `bootandstrap-admin/src/lib/tenants.ts`
- Create: `bootandstrap-admin/src/lib/auth/require-super-admin.ts`
- Modify: `bootandstrap-admin/src/app/(dashboard)/layout.tsx`
- Create: `bootandstrap-admin/src/lib/__tests__/auth-actions.test.ts`

**Step 1: Agregar guard server-side por acción**

Cada acción de tenant debe validar sesión + rol `super_admin` antes de usar `SUPABASE_SERVICE_ROLE_KEY`.

**Step 2: Rechazar requests sin sesión**

Retornar error estructurado y auditable.

**Step 3: Añadir tests de autorización**

Cobertura de acceso permitido/denegado por rol.

**Step 4: Verificar**

Run: `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin test || true`
Expected: tests de auth verdes (si no existe runner aún, crear script test y ejecutarlo).

### Task 4: Atomicidad de operaciones multi-tabla en tenant provisioning

**Files:**
- Modify: `bootandstrap-admin/src/lib/tenants.ts`
- Create: `CAMPIFRUT/supabase/migrations/20260209_admin_rpc_tenant_provisioning.sql`

**Step 1: Mover create/delete tenant a RPC transaccional en Postgres**

Eliminar riesgo de estado parcial en `createTenant()` y `deleteTenant()`.

**Step 2: Añadir compensación/rollback explícito**

Si falla cualquier tabla dependiente, no debe quedar tenant huérfano.

**Step 3: Añadir constraints de unicidad por tenant**

Asegurar 1 fila de `config`, `feature_flags`, `plan_limits` por `tenant_id`.

**Step 4: Verificar con test SQL + integración**

Run: `supabase db reset && supabase db test` (o equivalente del proyecto)
Expected: provisioning idempotente y transaccional.

### Task 5: Corregir multi-tenant real en storefront (`TENANT_ID`)

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/lib/config.ts`
- Modify: `CAMPIFRUT/apps/storefront/src/lib/analytics.ts`
- Modify: `CAMPIFRUT/apps/storefront/.env.example` (si aplica)
- Modify: `CAMPIFRUT/.env.example`

**Step 1: Unificar variable de tenant**

Elegir convención única (`TENANT_ID` server, `NEXT_PUBLIC_TENANT_ID` client cuando sea necesario).

**Step 2: Aplicar filtro por tenant en todas las queries de configuración**

Evitar `.single()` sin filtro en tablas multi-tenant.

**Step 3: Añadir fallback controlado**

Fallback solo para errores de conectividad, no para errores de cardinalidad multi-tenant.

**Step 4: Tests de regresión**

Simular 2 tenants y validar aislamiento de config/flags/limits.

**Step 5: Verificar**

Run: `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT/apps/storefront test:run`
Expected: nuevas pruebas multi-tenant PASS.

### Task 6: RLS y migraciones completas (estado reproducible)

**Files:**
- Modify: `CAMPIFRUT/supabase/migrations/20260209_multi_tenant_foundation.sql`
- Create: `CAMPIFRUT/supabase/migrations/20260209_rls_policies_complete.sql`
- Create: `CAMPIFRUT/supabase/migrations/20260209_constraints_uniques_per_tenant.sql`
- Modify: `CAMPIFRUT/docs/architecture/SUPABASE_SCHEMA.md`

**Step 1: Completar políticas faltantes por tabla**

`feature_flags`, `plan_limits`, `whatsapp_templates`, `cms_pages`, `carousel_slides`, `analytics_events`.

**Step 2: Añadir políticas por rol + tenant explícitas**

No usar `FOR ALL` genérico donde se requieran permisos separados.

**Step 3: Añadir tests de políticas**

Validar customer/owner/super_admin/service_role sobre todos los recursos.

**Step 4: Verificar**

Run: `supabase db diff --use-migra` y suite de tests RLS.
Expected: esquema + políticas coherentes con documentación.

### Task 7: Cerrar deuda de lint/type en `storefront`

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/app/[lang]/(panel)/panel/analiticas/page.tsx`
- Modify: `CAMPIFRUT/apps/storefront/src/components/layout/CurrencySelector.tsx`
- Modify: `CAMPIFRUT/apps/storefront/src/components/layout/LanguageSelector.tsx`
- Modify: `CAMPIFRUT/apps/storefront/src/components/ui/Toaster.tsx`
- Modify: `CAMPIFRUT/apps/storefront/src/contexts/CartContext.tsx`
- Modify: `CAMPIFRUT/apps/storefront/src/app/[lang]/(shop)/cuenta/direcciones/AddressesClient.tsx`
- Modify: `CAMPIFRUT/apps/storefront/src/app/[lang]/(shop)/cuenta/pedidos/[id]/page.tsx`
- Modify: `CAMPIFRUT/apps/storefront/src/proxy.ts`

**Step 1: Resolver 9 errores de ESLint existentes**

Purity, hooks order, no-explicit-any, prefer-const.

**Step 2: Aislar e2e del typecheck de app**

Mover specs a `tsconfig.e2e.json` + instalar `@playwright/test` como devDependency.

**Step 3: Reducir warnings críticos de rendimiento/a11y**

Reemplazar `<img>` por `next/image` donde corresponda y corregir `alt` faltantes.

**Step 4: Verificar**

Run: `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT lint && pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT/apps/storefront exec tsc --noEmit`
Expected: 0 errores.

### Task 8: Arreglar pipeline CI para reflejar calidad real

**Files:**
- Modify: `CAMPIFRUT/.github/workflows/ci.yml`
- Modify: `CAMPIFRUT/apps/storefront/playwright.config.ts`
- Modify: `CAMPIFRUT/apps/storefront/lighthouserc.js`

**Step 1: Añadir jobs obligatorios de lint + type-check reales**

No etiquetar “type-check” sin ejecutar TypeScript.

**Step 2: Arreglar job E2E (arranca solo Redis actualmente)**

Levantar storefront/medusa con entorno de test antes de Playwright.

**Step 3: Endurecer merge gate**

Branch protection con required checks: build, lint, type-check, unit, e2e.

**Step 4: Verificar**

Run en PR de prueba y confirmar checks verdes.

### Task 9: Observabilidad y trazabilidad de producción

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/src/app/api/health/route.ts`
- Modify: `bootandstrap-admin/src/app/api/health/route.ts`
- Create: `CAMPIFRUT/docs/operations/OBSERVABILITY.md`
- Modify: `CAMPIFRUT/apps/storefront/next.config.ts`

**Step 1: Estandarizar health endpoints con checks de dependencia**

`ready` (DB/Redis/API) vs `live` (proceso vivo).

**Step 2: Añadir structured logging + correlation id**

Logs JSON, request id y tenant id en acciones críticas.

**Step 3: Integrar Sentry correctamente sin warnings deprecados**

Eliminar opciones deprecadas y configurar release/environment.

**Step 4: Verificar**

Run: smoke tests de `/api/health` + eventos de error controlados.

### Task 10: Operación Docker determinística y rutas correctas

**Files:**
- Modify: `CAMPIFRUT/docker-compose.yml`
- Modify: `CAMPIFRUT/docker-compose.dev.yml`
- Modify: `CAMPIFRUT/apps/storefront/Dockerfile`
- Modify: `CAMPIFRUT/apps/medusa/Dockerfile`
- Modify: `bootandstrap-admin/Dockerfile`

**Step 1: Corregir rutas rotas al repo admin (`../../bootandstrap-admin`)**

Alinear paths a estructura real de despliegue.

**Step 2: Pin de package manager y builds reproducibles**

Evitar `pnpm@latest`; usar versión fija.

**Step 3: Homogeneizar estrategia package manager (pnpm vs npm)**

Eliminar dualidad lockfiles no intencional.

**Step 4: Verificar**

Run: `docker compose -f /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT/docker-compose.yml config`
Expected: sin errores de path/build context.

### Task 11: Fortalecer pruebas funcionales críticas

**Files:**
- Modify: `CAMPIFRUT/apps/storefront/e2e/*.spec.ts`
- Create: `CAMPIFRUT/apps/storefront/src/app/[lang]/(shop)/checkout/__tests__/`
- Create: `bootandstrap-admin/src/app/(dashboard)/tenants/__tests__/`

**Step 1: Reescribir E2E frágiles por flujos determinísticos**

Evitar asserts vacíos y `waitForTimeout` sin intención.

**Step 2: Añadir pruebas de reglas de negocio**

`max_orders_month`, `max_customers`, feature-gates y estado de tenant.

**Step 3: Añadir pruebas de regresión de multi-tenant**

Aislamiento por `tenant_id` en panel owner/superadmin.

**Step 4: Verificar**

Run: `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT/apps/storefront exec playwright test`
Expected: suite estable en local + CI.

### Task 12: Cierre documental y Definition of Done SOTA

**Files:**
- Modify: `CAMPIFRUT/ROADMAP.md`
- Modify: `CAMPIFRUT/GEMINI.md`
- Modify: `CAMPIFRUT/DOCS_GUIDE.md`
- Modify: `bootandstrap-admin/README.md`
- Modify: `bootandstrap-admin/GEMINI.md`

**Step 1: Eliminar claims no verificables (“100%”, “E2E validated”)**

Sustituir por evidencia con fecha/comando.

**Step 2: Añadir tabla de release quality gates**

Gate de release: lint=0 errors, type-check=green, unit/e2e=green, CVE high/critical=0.

**Step 3: Definir checklist de release y rollback**

Rollback técnico, rotación de credenciales y smoke post-deploy.

**Step 4: Verificar**

Run: revisión de docs + enlace directo a workflows y comandos reproducibles.

## Execution Order (Recommended)

1. Task 1, Task 3, Task 4, Task 5, Task 6 (riesgo crítico).
2. Task 2, Task 7, Task 8 (calidad y entrega continua).
3. Task 10, Task 9, Task 11, Task 12 (operación, observabilidad y cierre).

## Global Verification Command Set

```bash
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT lint
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT type-check
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT test:run
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT build
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin lint
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin type-check
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin build
```

Expected final state: todos los comandos en verde + CI required checks en verde + políticas RLS verificadas + sin secretos en repo.
