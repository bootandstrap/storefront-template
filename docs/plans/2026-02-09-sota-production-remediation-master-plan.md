# SOTA Production Remediation Master Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** llevar `ecommerce-template` + `bootandstrap-admin` a estado SOTA real de produccion: aislamiento multi-tenant verificable, seguridad fuerte, CI confiable y release reproducible.

**Architecture:** ejecutar en olas con orden estricto: (1) verdad y baseline, (2) aislamiento de datos y autorizacion, (3) hardening de plataforma/CI, (4) pruebas y operacion, (5) cierre documental + gates de release. Cada ola debe terminar con evidencias ejecutables.

**Tech Stack:** Next.js 16, React 19, Supabase (RLS + migrations), Medusa v2, Turborepo + pnpm, Playwright + Vitest + Jest, Docker Compose, GitHub Actions.

---

### Task 1: Baseline de verdad (sin claims no verificados)

**Files:**
- Modify: `GEMINI.md`
- Modify: `ROADMAP.md`
- Modify: `docs/architecture/ARCHITECTURE.md`
- Modify: `docs/architecture/SUPABASE_SCHEMA.md`

**Step 1: Capturar baseline actual**

Run:
```bash
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template lint || true
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template type-check || true
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template test:run
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template build
```

**Step 2: Corregir narrativa de estado**
- Remover "Phase 1-9 ✅" y "E2E validated" hasta que los gates pasen.
- Reemplazar por tabla de evidencia con comando + fecha + resultado.

**Step 3: Commit**
```bash
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template add GEMINI.md ROADMAP.md docs/architecture/ARCHITECTURE.md docs/architecture/SUPABASE_SCHEMA.md
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template commit -m "docs: align project status with verified quality baseline"
```

### Task 2: Aislamiento multi-tenant obligatorio en lecturas storefront

**Files:**
- Modify: `apps/storefront/src/lib/config.ts`
- Modify: `apps/storefront/src/app/[lang]/(shop)/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/(shop)/paginas/[slug]/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/(shop)/checkout/actions.ts`
- Modify: `apps/storefront/src/app/[lang]/(auth)/registro/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/(auth)/registro/actions.ts`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/analiticas/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/carrusel/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/mensajes/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/paginas/page.tsx`

**Step 1: Definir helper unico de tenant scope**
- Crear helper server-only: `getRequiredTenantId()`.
- Si `TENANT_ID` falta en produccion: hard-fail para rutas criticas (no fallback silencioso).

**Step 2: Aplicar `.eq('tenant_id', tenantId)` en TODAS las consultas a tablas multi-tenant**
- `config`, `feature_flags`, `plan_limits`, `carousel_slides`, `whatsapp_templates`, `cms_pages`, `analytics_events`, `profiles`.

**Step 3: Evitar `.single()` sin scope tenant**
- Usar `maybeSingle()` + manejo explicito.

**Step 4: Tests de regresion**

Create:
- `apps/storefront/src/lib/__tests__/tenant-isolation-config.test.ts`
- `apps/storefront/src/lib/__tests__/tenant-isolation-content.test.ts`

Run:
```bash
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template/apps/storefront test:run
```

**Step 5: Commit**
```bash
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template add apps/storefront/src/lib/config.ts apps/storefront/src/app/[lang]/(shop)/page.tsx apps/storefront/src/app/[lang]/(shop)/paginas/[slug]/page.tsx apps/storefront/src/app/[lang]/(shop)/checkout/actions.ts apps/storefront/src/app/[lang]/(auth)/registro/page.tsx apps/storefront/src/app/[lang]/(auth)/registro/actions.ts apps/storefront/src/app/[lang]/(panel)/panel/page.tsx apps/storefront/src/app/[lang]/(panel)/panel/analiticas/page.tsx apps/storefront/src/app/[lang]/(panel)/panel/carrusel/page.tsx apps/storefront/src/app/[lang]/(panel)/panel/mensajes/page.tsx apps/storefront/src/app/[lang]/(panel)/panel/paginas/page.tsx apps/storefront/src/lib/__tests__/tenant-isolation-config.test.ts apps/storefront/src/lib/__tests__/tenant-isolation-content.test.ts
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template commit -m "fix(multitenant): enforce tenant_id scoping across storefront reads"
```

### Task 3: Aislamiento multi-tenant en Owner Panel writes

**Files:**
- Modify: `apps/storefront/src/lib/panel-auth.ts`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/tienda/actions.ts`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/carrusel/actions.ts`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/mensajes/actions.ts`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/paginas/actions.ts`

**Step 1: Expandir `requirePanelAuth()`**
- Retornar `{ tenantId, role }`.
- Bloquear si `tenant_id` no existe para rol owner/admin.

**Step 2: Forzar scoping tenant en update/delete**
- Agregar `.eq('tenant_id', tenantId)` junto con `id`.
- En inserts, setear `tenant_id` explicitamente.

**Step 3: Enforzar ownership**
- `super_admin` puede actuar cross-tenant solo si se pasa `tenantId` explicito y auditado.
- `owner/admin` solo su tenant.

**Step 4: Tests de autorizacion**

Create:
- `apps/storefront/src/app/[lang]/(panel)/panel/__tests__/owner-panel-tenant-guard.test.ts`

Run:
```bash
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template/apps/storefront test:run
```

### Task 4: Hardening de RLS y schema de Supabase (reproducible)

**Files:**
- Modify: `supabase/migrations/20260209_multi_tenant_foundation.sql`
- Modify: `supabase/migrations/20260209_rls_policies_complete.sql`
- Modify: `supabase/migrations/20260209_constraints_uniques_per_tenant.sql`
- Create: `supabase/migrations/20260210_schema_baseline_public.sql`
- Modify: `docs/architecture/SUPABASE_SCHEMA.md`

**Step 1: Baseline migrable**
- Crear migracion baseline con `CREATE TABLE IF NOT EXISTS` para tablas no definidas en repo.

**Step 2: Cerrar politicas `USING (true)` peligrosas**
- Reemplazar SELECT abierto por politicas tenant-aware (JWT claim o filtro robusto).

**Step 3: Constraints correctas por tenant**
- `cms_pages`: unique `(tenant_id, slug)` (no global slug unique).
- `tenant_id` NOT NULL donde aplique.
- Unico default template por tenant (indice parcial `is_default=true`).

**Step 4: Verificacion DB**

Run:
```bash
supabase db reset
supabase db diff --use-migra
```

Expected: reset limpio, diff vacio despues de aplicar migraciones.

### Task 5: Usar RPC transaccional en bootandstrap-admin

**Files:**
- Modify: `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin/src/lib/tenants.ts`
- Modify: `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin/src/lib/types.ts`
- Modify: `supabase/migrations/20260209_admin_rpc_tenant_provisioning.sql` (si faltan parametros/validaciones)

**Step 1: `createTenant()` via RPC**
- Reemplazar inserciones manuales por `supabase.rpc('provision_tenant', ...)`.

**Step 2: `deleteTenant()` via RPC**
- Reemplazar deletes manuales por `supabase.rpc('delete_tenant', ...)`.

**Step 3: Manejo de errores consistente**
- Mapear errores SQL a mensajes de dominio.

**Step 4: Tests**

Create:
- `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin/src/lib/__tests__/tenants-rpc.test.ts`

Run:
```bash
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin lint
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin type-check
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin build
```

### Task 6: Corregir deuda lint/type que hoy bloquea calidad

**Files:**
- Modify: `apps/storefront/src/components/layout/CurrencySelector.tsx`
- Modify: `apps/storefront/src/components/layout/LanguageSelector.tsx`
- Modify: `apps/storefront/src/components/ui/Toaster.tsx`
- Modify: `apps/storefront/src/contexts/CartContext.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/analiticas/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/(shop)/cuenta/direcciones/AddressesClient.tsx`
- Modify: `apps/storefront/src/app/[lang]/(shop)/cuenta/pedidos/[id]/page.tsx`
- Modify: `apps/storefront/src/proxy.ts`
- Modify: `packages/shared/tsconfig.json`
- Modify: `packages/shared/package.json`

**Step 1: Hook ordering**
- Mover `useEffect` antes de returns condicionales en selectors.

**Step 2: React purity**
- Sustituir `Date.now()` en render por calculo estable fuera de render.

**Step 3: Eliminar `any` y setState-in-effect problematicos**
- Tipar callbacks de server action y hydration cart con parse seguro.

**Step 4: Type-check shared package**
- Agregar `@types/node` y `types: ["node"]` para `process`.

**Step 5: Verificar**
```bash
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template lint
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template type-check
```

### Task 7: Seguridad de secretos y defaults inseguros

**Files:**
- Modify: `apps/medusa/medusa-config.ts`
- Modify: `apps/storefront/src/app/api/revalidate/route.ts`
- Modify: `.env.example`
- Modify: `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin/.env.example`
- Modify: `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin/.gitignore`

**Step 1: Quitar defaults sensibles**
- Remover fallback `"supersecret"` en `jwtSecret`/`cookieSecret`.
- Fallar startup si no hay secretos en production.

**Step 2: Revalidation secret**
- Eliminar fallback hardcoded.
- Requerir `REVALIDATION_SECRET` obligatorio.

**Step 3: Higiene repo admin**
- Ignorar `.pnpm-store/` en git.

**Step 4: Verificacion**
```bash
rg -n --hidden --files-with-matches "supersecret|ecommerce-template-revalidate-2026" /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin || true
```

### Task 8: CI real (no falso verde)

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `apps/storefront/playwright.config.ts`
- Modify: `docker-compose.dev.yml`
- Modify: `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin/.github/workflows/ci.yml`
- Modify: `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin/package.json`

**Step 1: E2E job levantando app real**
- En CI de `ecommerce-template`, arrancar `storefront + medusa + redis` (no solo redis).

**Step 2: Ajustar `playwright.config.ts`**
- `webServer` en CI opcional segun variable, con comando determinista.

**Step 3: CI admin con pruebas**
- Agregar script `test` y job unitario.

**Step 4: Verificar**
- PR de prueba con checks required: `lint`, `type-check`, `unit`, `e2e`, `build`.

### Task 9: Operacion docker reproducible

**Files:**
- Modify: `docker-compose.dev.yml`
- Modify: `docker-compose.yml`
- Modify: `apps/storefront/Dockerfile`
- Modify: `apps/medusa/Dockerfile`

**Step 1: Corregir path admin dev**
- Reemplazar `../../bootandstrap-admin:/app` por path configurable via env (o remove del compose de template).

**Step 2: Pin package manager**
- Evitar `pnpm@latest` en runtime containers.

**Step 3: Verificar compose**
```bash
docker compose -f /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template/docker-compose.dev.yml config
docker compose -f /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template/docker-compose.yml config
```

### Task 10: Contratos de datos analytics consistentes

**Files:**
- Modify: `apps/storefront/src/lib/analytics.ts`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/analiticas/page.tsx`
- Modify: `apps/storefront/src/app/api/webhooks/stripe/route.ts`
- Modify: `docs/architecture/SUPABASE_SCHEMA.md`
- Modify: `supabase/migrations/20260210_analytics_contract.sql`

**Step 1: Elegir contrato unico**
- Estandarizar en `metadata JSONB` o migrar a `properties/page_url/referrer`.

**Step 2: Actualizar insert/read en todo el sistema**
- Cliente, webhook y panel deben leer/escribir mismo shape.

**Step 3: Pruebas**
- Test unitario de serializer/deserializer de analytics.

### Task 11: Pruebas criticas faltantes (multi-tenant + governance)

**Files:**
- Create: `apps/storefront/src/app/[lang]/(shop)/checkout/__tests__/limit-enforcement.test.ts`
- Create: `apps/storefront/src/app/[lang]/(auth)/registro/__tests__/customer-limit.test.ts`
- Create: `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin/src/lib/__tests__/require-super-admin.test.ts`
- Modify: `apps/storefront/e2e/*.spec.ts`

**Step 1: Unit tests de reglas de negocio**
- `max_orders_month`, `max_customers`, auth roles, tenant boundary.

**Step 2: E2E determinista**
- Reemplazar asserts debiles y `waitForTimeout` por estados observables.

**Step 3: Verificar**
```bash
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template/apps/storefront test:run
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template/apps/storefront exec playwright test
```

### Task 12: Observabilidad y operacion SRE minima

**Files:**
- Modify: `apps/storefront/src/app/api/health/route.ts`
- Modify: `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin/src/app/api/health/route.ts`
- Create: `docs/operations/OBSERVABILITY.md`
- Modify: `scripts/healthcheck.sh`
- Modify: `scripts/backup.sh`
- Modify: `scripts/restore.sh`

**Step 1: Health endpoints con `live` y `ready`**
- Responder dependencia por dependencia.

**Step 2: Structured logs + correlation id**
- Incluir `tenant_id`, `request_id`, `route`.

**Step 3: Runbooks operables**
- Alertas, backup/restore ensayado, RTO/RPO definidos.

### Task 13: Gates de release y cierre

**Files:**
- Modify: `ROADMAP.md`
- Modify: `GEMINI.md`
- Modify: `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin/GEMINI.md`
- Modify: `docs/operations/CLIENT_HANDOFF.md`

**Step 1: Definir Definition of Done SOTA**
- Sin secretos hardcoded.
- Multi-tenant isolation probado.
- RLS validado.
- Quality gates verdes.

**Step 2: Comando unico de release**
```bash
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template lint
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template type-check
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template test:run
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/ecommerce-template build
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin lint
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin type-check
pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin build
```

Expected: todo en verde sin `|| true`.

---

## Recommended Execution Order

1. Task 1 (truth baseline)
2. Task 2 + Task 3 + Task 4 + Task 5 (seguridad y aislamiento)
3. Task 6 + Task 7 (quality + security defaults)
4. Task 8 + Task 9 (CI/CD y deploy reproducible)
5. Task 10 + Task 11 (contrato de datos + pruebas)
6. Task 12 + Task 13 (operacion + cierre)

## Risks to control while executing

- No tocar credenciales reales en commits.
- No mezclar fixes de negocio con docs-only commits.
- No marcar fase "completa" sin evidencia de comando.
- No usar fallback de tenant en produccion.
