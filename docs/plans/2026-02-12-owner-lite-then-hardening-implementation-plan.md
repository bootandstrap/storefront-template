# Owner Lite + Production Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplificar el Owner Panel para startups/pymes (flujo "lite" y mobile-friendly) y luego endurecer arquitectura/seguridad para producción multi-tenant conectada a Medusa sin riesgo de mezcla de datos.

**Architecture:** Se implementará en dos olas. Ola 1 reduce superficie funcional (solo módulos esenciales, rutas bloqueadas, UX simple y paginación real). Ola 2 corrige aislamiento tenant en Medusa, endurece provisioning de entornos, alinea RLS/roles y agrega guardrails operativos. Todo cambio se valida con TDD + smoke end-to-end por flujo crítico (login owner, catálogo, pedidos, configuración).

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (RLS + migrations), Medusa v2 Admin/Store APIs, Vitest, Playwright, pnpm/turbo, Dokploy.

---

## Scope and Sequencing

1. **Primero (2): Owner Lite**
2. **Luego (1): Hardening técnico/seguridad/producción**
3. **Extra inspirado:** observabilidad + rollout progresivo + runbooks operativos

## Approach Options (Brainstorming Summary)

1. **Option A (Recommended): Progressive Lockdown**
   Primero simplificar UX y navegación sin romper backend, luego endurecer aislamiento/seguridad en capas. Menor riesgo de cortar operación actual.
2. **Option B: Big-bang rewrite**
   Refactor integral de panel + backend + políticas en una sola entrega. Máxima velocidad teórica, alto riesgo de regresiones.
3. **Option C: Hardening-first**
   Seguridad primero y UX después. Reduce exposición rápida, pero no mejora experiencia de owner al inicio.

**Recommendation:** Option A (progresiva), porque respeta tu orden (2 luego 1), minimiza riesgo productivo y permite validar rápido con owners reales.

---

### Task 1: Baseline and Guardrails Before Changes

**Files:**
- Modify: `apps/storefront/package.json`
- Modify: `../bootandstrap-admin/package.json`
- Create: `apps/storefront/src/app/[lang]/(panel)/panel/__tests__/owner-lite-smoke.test.ts`
- Create: `apps/storefront/src/lib/medusa/__tests__/admin-safety-baseline.test.ts`

**Step 1: Write failing baseline tests**
- Crear tests mínimos de baseline para:
  - rutas esenciales (`/panel`, `/panel/catalogo`, `/panel/pedidos`, `/panel/clientes`, `/panel/tienda`)
  - acceso denegado a rutas avanzadas cuando estén deshabilitadas
  - validación de que acciones de pedidos requieren auth

**Step 2: Run test to verify it fails**
- Run: `pnpm -C apps/storefront test:run src/app/[lang]/(panel)/panel/__tests__/owner-lite-smoke.test.ts src/lib/medusa/__tests__/admin-safety-baseline.test.ts`
- Expected: FAIL por tests nuevos sin implementación completa.

**Step 3: Add minimal test scripts/helpers if needed**
- Añadir scripts auxiliares si falta runner específico para estos paths.

**Step 4: Run full local quality baseline**
- Run: `pnpm -C apps/storefront test:run && pnpm -C apps/storefront type-check && pnpm -C ../bootandstrap-admin test:run`
- Expected: PASS o lista explícita de fallos existentes no relacionados.

**Step 5: Commit**
```bash
git add apps/storefront/package.json apps/storefront/src/app/[lang]/(panel)/panel/__tests__/owner-lite-smoke.test.ts apps/storefront/src/lib/medusa/__tests__/admin-safety-baseline.test.ts ../bootandstrap-admin/package.json
git commit -m "test: establish owner panel baseline guards"
```

---

### Task 2: Owner Lite Information Architecture (Essential-Only)

**Files:**
- Modify: `apps/storefront/src/components/panel/PanelSidebar.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/layout.tsx`
- Modify: `apps/storefront/src/lib/panel-access-policy.ts`
- Create: `apps/storefront/src/lib/panel-modules.ts`
- Test: `apps/storefront/src/lib/__tests__/panel-modules.test.ts`

**Step 1: Write failing test**
- Tests para política de módulos:
  - esenciales siempre visibles
  - avanzados ocultos por defecto en modo lite
  - flags respetadas

**Step 2: Run failing test**
- Run: `pnpm -C apps/storefront test:run src/lib/__tests__/panel-modules.test.ts`
- Expected: FAIL.

**Step 3: Implement minimal module policy**
- Crear `panel-modules.ts` con listas:
  - Essential: dashboard, catálogo, pedidos, clientes, tienda
  - Advanced: carrusel, mensajes, páginas, analíticas, insignias
- Sidebar consume esta policy.

**Step 4: Run tests**
- Run: `pnpm -C apps/storefront test:run src/lib/__tests__/panel-modules.test.ts src/lib/__tests__/panel-access-policy.test.ts`
- Expected: PASS.

**Step 5: Commit**
```bash
git add apps/storefront/src/components/panel/PanelSidebar.tsx apps/storefront/src/app/[lang]/(panel)/layout.tsx apps/storefront/src/lib/panel-access-policy.ts apps/storefront/src/lib/panel-modules.ts apps/storefront/src/lib/__tests__/panel-modules.test.ts
git commit -m "feat: introduce owner lite module policy"
```

---

### Task 3: Route-Level Hard Gating for Advanced Modules

**Files:**
- Create: `apps/storefront/src/lib/panel-route-guards.ts`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/carrusel/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/mensajes/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/paginas/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/analiticas/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/insignias/page.tsx`
- Test: `apps/storefront/src/lib/__tests__/panel-route-guards.test.ts`

**Step 1: Write failing tests**
- Si módulo avanzado está disabled => redirect a `/[lang]/panel` o 404 controlado.

**Step 2: Run failing tests**
- Run: `pnpm -C apps/storefront test:run src/lib/__tests__/panel-route-guards.test.ts`
- Expected: FAIL.

**Step 3: Implement route guard helper + integrate in pages**
- Centralizar check para evitar drift entre páginas.

**Step 4: Run tests and smoke**
- Run: `pnpm -C apps/storefront test:run src/lib/__tests__/panel-route-guards.test.ts src/app/[lang]/(panel)/panel/__tests__/owner-lite-smoke.test.ts`
- Expected: PASS.

**Step 5: Commit**
```bash
git add apps/storefront/src/lib/panel-route-guards.ts apps/storefront/src/app/[lang]/(panel)/panel/carrusel/page.tsx apps/storefront/src/app/[lang]/(panel)/panel/mensajes/page.tsx apps/storefront/src/app/[lang]/(panel)/panel/paginas/page.tsx apps/storefront/src/app/[lang]/(panel)/panel/analiticas/page.tsx apps/storefront/src/app/[lang]/(panel)/panel/insignias/page.tsx apps/storefront/src/lib/__tests__/panel-route-guards.test.ts
git commit -m "feat: enforce route-level gating for non-essential owner modules"
```

---

### Task 4: Mobile-First Panel Shell (Responsive Sidebar)

**Files:**
- Modify: `apps/storefront/src/components/panel/PanelSidebar.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/layout.tsx`
- Create: `apps/storefront/src/components/panel/PanelTopbar.tsx`
- Test: `apps/storefront/src/components/panel/__tests__/panel-shell-responsive.test.tsx`

**Step 1: Write failing test**
- Sidebar desktop + drawer mobile + navegación accesible teclado.

**Step 2: Run failing test**
- Run: `pnpm -C apps/storefront test:run src/components/panel/__tests__/panel-shell-responsive.test.tsx`
- Expected: FAIL.

**Step 3: Implement minimal responsive shell**
- Topbar con botón menú en mobile.
- Drawer que reutiliza items de sidebar.

**Step 4: Run tests**
- Run: `pnpm -C apps/storefront test:run src/components/panel/__tests__/panel-shell-responsive.test.tsx`
- Expected: PASS.

**Step 5: Commit**
```bash
git add apps/storefront/src/components/panel/PanelSidebar.tsx apps/storefront/src/app/[lang]/(panel)/layout.tsx apps/storefront/src/components/panel/PanelTopbar.tsx apps/storefront/src/components/panel/__tests__/panel-shell-responsive.test.tsx
git commit -m "feat: make owner panel shell mobile-first"
```

---

### Task 5: Simplified Dashboard for SMEs

**Files:**
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/page.tsx`
- Modify: `apps/storefront/src/components/panel/StatCard.tsx`
- Modify: `apps/storefront/src/components/panel/UsageMeter.tsx`
- Test: `apps/storefront/src/app/[lang]/(panel)/panel/__tests__/dashboard-lite.test.tsx`

**Step 1: Write failing tests**
- Dashboard con métricas esenciales claras y lenguaje no técnico.

**Step 2: Run failing test**
- Run: `pnpm -C apps/storefront test:run src/app/[lang]/(panel)/panel/__tests__/dashboard-lite.test.tsx`
- Expected: FAIL.

**Step 3: Implement minimal simplified dashboard**
- Priorizar: ventas recientes, pedidos pendientes, stock/catálogo, clientes.
- Reducir visual noise y tablas largas.

**Step 4: Run tests**
- Run: `pnpm -C apps/storefront test:run src/app/[lang]/(panel)/panel/__tests__/dashboard-lite.test.tsx`
- Expected: PASS.

**Step 5: Commit**
```bash
git add apps/storefront/src/app/[lang]/(panel)/panel/page.tsx apps/storefront/src/components/panel/StatCard.tsx apps/storefront/src/components/panel/UsageMeter.tsx apps/storefront/src/app/[lang]/(panel)/panel/__tests__/dashboard-lite.test.tsx
git commit -m "feat: simplify owner dashboard for startup and SME workflows"
```

---

### Task 6: Real Pagination + Search for Orders, Customers, Catalog

**Files:**
- Modify: `apps/storefront/src/lib/medusa/admin.ts`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/pedidos/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/clientes/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/catalogo/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/pedidos/OrdersClient.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/clientes/CustomersClient.tsx`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/catalogo/CatalogClient.tsx`
- Test: `apps/storefront/src/lib/medusa/__tests__/admin-pagination.test.ts`

**Step 1: Write failing tests**
- queries aceptan `limit/offset/q/status` y devuelven `count` consistente.

**Step 2: Run failing tests**
- Run: `pnpm -C apps/storefront test:run src/lib/medusa/__tests__/admin-pagination.test.ts`
- Expected: FAIL.

**Step 3: Implement minimal paginated data flow**
- server components leen `searchParams`.
- clients disparan navegación por query params.

**Step 4: Run tests**
- Run: `pnpm -C apps/storefront test:run src/lib/medusa/__tests__/admin-pagination.test.ts src/app/[lang]/(panel)/panel/__tests__/owner-lite-smoke.test.ts`
- Expected: PASS.

**Step 5: Commit**
```bash
git add apps/storefront/src/lib/medusa/admin.ts apps/storefront/src/app/[lang]/(panel)/panel/pedidos/page.tsx apps/storefront/src/app/[lang]/(panel)/panel/clientes/page.tsx apps/storefront/src/app/[lang]/(panel)/panel/catalogo/page.tsx apps/storefront/src/app/[lang]/(panel)/panel/pedidos/OrdersClient.tsx apps/storefront/src/app/[lang]/(panel)/panel/clientes/CustomersClient.tsx apps/storefront/src/app/[lang]/(panel)/panel/catalogo/CatalogClient.tsx apps/storefront/src/lib/medusa/__tests__/admin-pagination.test.ts
git commit -m "feat: add real pagination and search to owner core modules"
```

---

### Task 7: Enforce Plan Limits Server-Side (Products/Categories)

**Files:**
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/productos/actions.ts`
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/categorias/actions.ts`
- Modify: `apps/storefront/src/lib/limits.ts`
- Test: `apps/storefront/src/app/[lang]/(panel)/panel/productos/__tests__/limits-server-enforcement.test.ts`
- Test: `apps/storefront/src/app/[lang]/(panel)/panel/categorias/__tests__/limits-server-enforcement.test.ts`

**Step 1: Write failing tests**
- creación bloqueada al superar `max_products` y `max_categories`.

**Step 2: Run failing tests**
- Run: `pnpm -C apps/storefront test:run src/app/[lang]/(panel)/panel/productos/__tests__/limits-server-enforcement.test.ts src/app/[lang]/(panel)/panel/categorias/__tests__/limits-server-enforcement.test.ts`
- Expected: FAIL.

**Step 3: Implement minimal server checks**
- Antes de mutación, contar y validar con `checkLimit`.

**Step 4: Run tests**
- Run: same command.
- Expected: PASS.

**Step 5: Commit**
```bash
git add apps/storefront/src/app/[lang]/(panel)/panel/productos/actions.ts apps/storefront/src/app/[lang]/(panel)/panel/categorias/actions.ts apps/storefront/src/lib/limits.ts apps/storefront/src/app/[lang]/(panel)/panel/productos/__tests__/limits-server-enforcement.test.ts apps/storefront/src/app/[lang]/(panel)/panel/categorias/__tests__/limits-server-enforcement.test.ts
git commit -m "fix: enforce plan limits server-side in owner actions"
```

---

### Task 8: Owner Lite Defaults in SuperAdmin Provisioning

**Files:**
- Modify: `../bootandstrap-admin/src/lib/plan-presets.ts`
- Modify: `../bootandstrap-admin/src/app/(dashboard)/tenants/new/TenantWizard.tsx`
- Modify: `../bootandstrap-admin/src/lib/flag-hierarchy.ts`
- Test: `../bootandstrap-admin/src/lib/__tests__/plan-presets-owner-lite.test.ts`

**Step 1: Write failing tests**
- Nuevos tenants arrancan con perfil esencial (módulos avanzados OFF by default).

**Step 2: Run failing test**
- Run: `pnpm -C ../bootandstrap-admin test:run src/lib/__tests__/plan-presets-owner-lite.test.ts`
- Expected: FAIL.

**Step 3: Implement minimal defaults**
- wizard muestra preset recomendado “Owner Lite”.

**Step 4: Run tests**
- Run: `pnpm -C ../bootandstrap-admin test:run src/lib/__tests__/plan-presets-owner-lite.test.ts src/lib/__tests__/validation-contract.test.ts`
- Expected: PASS.

**Step 5: Commit**
```bash
git add ../bootandstrap-admin/src/lib/plan-presets.ts ../bootandstrap-admin/src/app/(dashboard)/tenants/new/TenantWizard.tsx ../bootandstrap-admin/src/lib/flag-hierarchy.ts ../bootandstrap-admin/src/lib/__tests__/plan-presets-owner-lite.test.ts
git commit -m "feat: set owner lite as default tenant feature profile"
```

---

### Task 9: Tenant Isolation Contract for Medusa (Data Model)

**Files:**
- Create: `supabase/migrations/20260212_tenant_medusa_scope.sql`
- Modify: `docs/architecture/SUPABASE_SCHEMA.md`
- Create: `apps/storefront/src/lib/medusa/tenant-scope.ts`
- Test: `apps/storefront/src/lib/medusa/__tests__/tenant-scope.test.ts`

**Step 1: Write failing test**
- Resolver scope de tenant requiere mapping explícito (`medusa_sales_channel_id` o equivalente).

**Step 2: Run failing test**
- Run: `pnpm -C apps/storefront test:run src/lib/medusa/__tests__/tenant-scope.test.ts`
- Expected: FAIL.

**Step 3: Implement minimal mapping layer**
- Crear tabla/metadata para enlazar tenant con scope operativo de Medusa.

**Step 4: Run tests + migration dry run**
- Run: `pnpm -C apps/storefront test:run src/lib/medusa/__tests__/tenant-scope.test.ts`
- Run: `supabase db reset --linked --dry-run` (si entorno disponible)
- Expected: tests PASS; migration válida.

**Step 5: Commit**
```bash
git add supabase/migrations/20260212_tenant_medusa_scope.sql docs/architecture/SUPABASE_SCHEMA.md apps/storefront/src/lib/medusa/tenant-scope.ts apps/storefront/src/lib/medusa/__tests__/tenant-scope.test.ts
git commit -m "feat: add explicit tenant-to-medusa scope mapping"
```

---

### Task 10: Enforce Medusa Tenant Scoping in Admin Helper

**Files:**
- Modify: `apps/storefront/src/lib/medusa/admin.ts`
- Modify: `apps/storefront/src/lib/panel-auth.ts`
- Test: `apps/storefront/src/lib/medusa/__tests__/admin-tenant-scoping.test.ts`

**Step 1: Write failing tests**
- queries admin incluyen scope tenant obligatorio.
- sin scope => error explícito (fail-closed).

**Step 2: Run failing tests**
- Run: `pnpm -C apps/storefront test:run src/lib/medusa/__tests__/admin-tenant-scoping.test.ts`
- Expected: FAIL.

**Step 3: Implement minimal scoped fetcher**
- `adminFetchScoped(tenantScope, path, options)` obligatorio para owner pages/actions.

**Step 4: Run tests**
- Run: `pnpm -C apps/storefront test:run src/lib/medusa/__tests__/admin-tenant-scoping.test.ts src/lib/__tests__/panel-auth.test.ts`
- Expected: PASS.

**Step 5: Commit**
```bash
git add apps/storefront/src/lib/medusa/admin.ts apps/storefront/src/lib/panel-auth.ts apps/storefront/src/lib/medusa/__tests__/admin-tenant-scoping.test.ts
git commit -m "fix: enforce tenant-scoped medusa admin access"
```

---

### Task 11: Protect Order Mutations with Ownership Checks

**Files:**
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/pedidos/actions.ts`
- Modify: `apps/storefront/src/lib/medusa/admin.ts`
- Test: `apps/storefront/src/app/[lang]/(panel)/panel/pedidos/__tests__/order-ownership-guard.test.ts`

**Step 1: Write failing tests**
- `fulfill/cancel` rechazan pedidos fuera del tenant scope.

**Step 2: Run failing test**
- Run: `pnpm -C apps/storefront test:run src/app/[lang]/(panel)/panel/pedidos/__tests__/order-ownership-guard.test.ts`
- Expected: FAIL.

**Step 3: Implement minimal guard**
- cargar pedido scoped + verificar ownership antes de mutar.

**Step 4: Run tests**
- Run: same command.
- Expected: PASS.

**Step 5: Commit**
```bash
git add apps/storefront/src/app/[lang]/(panel)/panel/pedidos/actions.ts apps/storefront/src/lib/medusa/admin.ts apps/storefront/src/app/[lang]/(panel)/panel/pedidos/__tests__/order-ownership-guard.test.ts
git commit -m "fix: guard order mutations by tenant ownership"
```

---

### Task 12: Provisioning Hardening for Medusa Connectivity

**Files:**
- Modify: `../bootandstrap-admin/src/lib/deploy-env.ts`
- Modify: `../bootandstrap-admin/src/lib/provision.ts`
- Modify: `../bootandstrap-admin/src/lib/dokploy.ts`
- Modify: `../bootandstrap-admin/.env.example`
- Test: `../bootandstrap-admin/src/lib/__tests__/deploy-env-medusa.test.ts`

**Step 1: Write failing test**
- Generación env requiere:
  - `MEDUSA_BACKEND_URL` correcto por entorno
  - `MEDUSA_ADMIN_PASSWORD` presente
  - `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` presente

**Step 2: Run failing test**
- Run: `pnpm -C ../bootandstrap-admin test:run src/lib/__tests__/deploy-env-medusa.test.ts`
- Expected: FAIL.

**Step 3: Implement minimal env contract**
- fail-fast en provisioning si faltan secretos críticos.

**Step 4: Run tests**
- Run: `pnpm -C ../bootandstrap-admin test:run src/lib/__tests__/deploy-env-medusa.test.ts src/lib/__tests__/provision.test.ts`
- Expected: PASS.

**Step 5: Commit**
```bash
git add ../bootandstrap-admin/src/lib/deploy-env.ts ../bootandstrap-admin/src/lib/provision.ts ../bootandstrap-admin/src/lib/dokploy.ts ../bootandstrap-admin/.env.example ../bootandstrap-admin/src/lib/__tests__/deploy-env-medusa.test.ts
git commit -m "fix: harden tenant deployment env contract for medusa"
```

---

### Task 13: RLS Role Tightening (Owner/Admin/Super Admin Explicit)

**Files:**
- Create: `supabase/migrations/20260212_rls_role_tightening_owner_panel.sql`
- Modify: `supabase/tests/rls-smoke.sql`
- Test: `supabase/tests/rls-smoke.sql`

**Step 1: Write failing SQL assertions**
- customer no puede leer tablas owner-governance.
- owner/admin solo su tenant.
- super_admin global.

**Step 2: Run smoke test to show current gaps**
- Run: `supabase test db --linked` (o psql equivalente del smoke)
- Expected: FAIL en reglas nuevas.

**Step 3: Implement policy tightening migration**
- reemplazar policies permisivas por condiciones explícitas de rol.

**Step 4: Re-run smoke tests**
- Run: `supabase test db --linked`
- Expected: PASS.

**Step 5: Commit**
```bash
git add supabase/migrations/20260212_rls_role_tightening_owner_panel.sql supabase/tests/rls-smoke.sql
git commit -m "fix: tighten rls role boundaries for owner panel data"
```

---

### Task 14: Role Model Alignment (Choose One and Enforce)

**Files:**
- Modify: `apps/storefront/src/lib/panel-access-policy.ts`
- Modify: `apps/storefront/src/app/[lang]/(panel)/layout.tsx`
- Modify: `supabase/migrations/20260212_rls_role_tightening_owner_panel.sql`
- Test: `apps/storefront/src/lib/__tests__/panel-access-policy.test.ts`

**Step 1: Write failing test**
- política única documentada y aplicada en UI + acciones + RLS.

**Step 2: Run failing test**
- Run: `pnpm -C apps/storefront test:run src/lib/__tests__/panel-access-policy.test.ts`
- Expected: FAIL.

**Step 3: Implement one model (recommended)**
- Recomendado para pymes: Owner-first (solo `owner` + `super_admin` en panel).
- Alternativa: incluir `admin` también en write policies.

**Step 4: Run tests**
- Run: `pnpm -C apps/storefront test:run src/lib/__tests__/panel-access-policy.test.ts src/lib/__tests__/panel-auth.test.ts`
- Expected: PASS.

**Step 5: Commit**
```bash
git add apps/storefront/src/lib/panel-access-policy.ts apps/storefront/src/app/[lang]/(panel)/layout.tsx supabase/migrations/20260212_rls_role_tightening_owner_panel.sql apps/storefront/src/lib/__tests__/panel-access-policy.test.ts
git commit -m "fix: align owner panel role model across ui auth and rls"
```

---

### Task 15: End-to-End Production Safety Net

**Files:**
- Create: `apps/storefront/tests/e2e/owner-lite-critical-flows.spec.ts`
- Modify: `apps/storefront/package.json`
- Create: `docs/operations/OWNER_PANEL_RUNBOOK_2026-02-12.md`

**Step 1: Write failing e2e tests**
- Flujos críticos:
  - login owner -> dashboard
  - crear/editar producto
  - ver pedidos + operación permitida
  - editar configuración tienda
  - acceso bloqueado a módulo avanzado disabled

**Step 2: Run failing e2e**
- Run: `pnpm -C apps/storefront test:e2e --grep "owner lite critical"`
- Expected: FAIL inicialmente.

**Step 3: Implement minimal selectors/stability hooks**
- data-testid en puntos críticos para estabilidad e2e.

**Step 4: Run e2e + regression suite**
- Run: `pnpm -C apps/storefront test:e2e --grep "owner lite critical"`
- Run: `pnpm -C apps/storefront test:run && pnpm -C apps/storefront type-check && pnpm -C ../bootandstrap-admin test:run`
- Expected: PASS.

**Step 5: Commit**
```bash
git add apps/storefront/tests/e2e/owner-lite-critical-flows.spec.ts apps/storefront/package.json docs/operations/OWNER_PANEL_RUNBOOK_2026-02-12.md
git commit -m "test: add owner lite e2e critical flow safety net"
```

---

### Task 16: Rollout Plan, Telemetry and Kill Switches (Inspired Add-on)

**Files:**
- Modify: `apps/storefront/src/lib/config.ts`
- Modify: `../bootandstrap-admin/src/lib/plan-presets.ts`
- Create: `docs/operations/OWNER_PANEL_ROLLOUT_STRATEGY_2026-02-12.md`
- Create: `docs/operations/OWNER_PANEL_METRICS_2026-02-12.md`

**Step 1: Write failing assertions/tests**
- Feature flags de rollout (`owner_lite_enabled`, `owner_advanced_modules_enabled`) leídas correctamente.

**Step 2: Run failing test**
- Run: `pnpm -C apps/storefront test:run src/lib/__tests__/config-schema.test.ts`
- Expected: FAIL para nuevas flags.

**Step 3: Implement minimal rollout controls**
- Activación progresiva por tenant desde SuperAdmin.

**Step 4: Run tests**
- Run: `pnpm -C apps/storefront test:run src/lib/__tests__/config-schema.test.ts`
- Expected: PASS.

**Step 5: Commit**
```bash
git add apps/storefront/src/lib/config.ts ../bootandstrap-admin/src/lib/plan-presets.ts docs/operations/OWNER_PANEL_ROLLOUT_STRATEGY_2026-02-12.md docs/operations/OWNER_PANEL_METRICS_2026-02-12.md
git commit -m "feat: add rollout controls and operating metrics for owner panel"
```

---

## Final Verification Gate (Mandatory)

Run in order:

```bash
pnpm -C apps/storefront test:run
pnpm -C apps/storefront type-check
pnpm -C apps/storefront test:e2e --grep "owner lite critical"
pnpm -C ../bootandstrap-admin test:run
pnpm -C ../bootandstrap-admin type-check
```

Expected:
- all green
- no regression in auth/panel guards
- no cross-tenant access in owner flows

---

## Delivery Checklists

### Functional Checklist
- [ ] Owner panel muestra solo módulos esenciales por defecto
- [ ] Rutas avanzadas deshabilitadas no son accesibles por URL directa
- [ ] Panel usable en móvil (drawer/topbar)
- [ ] Listados core tienen paginación real
- [ ] Límites de plan se aplican server-side

### Security/Production Checklist
- [ ] Medusa owner operations scoped por tenant
- [ ] fulfill/cancel con ownership guard
- [ ] provisioning exige env vars críticas de Medusa
- [ ] RLS separa customer vs owner/admin vs super_admin
- [ ] Role model consistente en UI/auth/RLS

### Operations Checklist
- [ ] E2E críticos activos en CI
- [ ] Runbook owner panel actualizado
- [ ] Rollout gradual con kill switch
- [ ] Métricas de adopción/errores definidas

