# Dual-Repo SOTA Production Remediation (v10) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** llevar `CAMPIFRUT` + `bootandstrap-admin` a una baseline de producción SOTA, corrigiendo riesgos críticos de seguridad/multi-tenant, eliminando falsos verdes de CI, y cerrando incoherencias frontend (visuales, funcionales e i18n) en ambas webs.

**Architecture:** ejecutar en 5 olas: (1) estabilidad de gates y builds determinísticos, (2) hardening de seguridad RLS real, (3) coherencia frontend/i18n/SEO, (4) escalabilidad UX del SuperAdmin, (5) contratos y operación dual-repo.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (RLS + service role), Medusa v2, Turborepo, pnpm, Vitest, Playwright, GitHub Actions, Docker.

---

## Baseline técnico verificado (2026-02-10)

- `bootandstrap-admin`: `pnpm lint && pnpm type-check && pnpm test:run && pnpm build` -> PASS.
- `CAMPIFRUT`: `pnpm lint && pnpm type-check && pnpm test:run && pnpm build` -> PASS global, pero con deuda real.
- `apps/medusa build`: devuelve `exit 0` pero imprime `TypeError ... tsconfig-paths` cuando `NODE_ENV` no es `production` (falso verde).
- `scripts/ops/dual-repo-release-gate.sh`: falla con `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL ... EACCES` por invocación de `pnpm -C ... turbo ...`.
- `scripts/check-migration-order.sh`: falla por 30+ policies no idempotentes.
- `scripts/check-rls.sh`: detecta `USING (true)` en políticas de tablas de gobernanza (riesgo de fuga cross-tenant).
- Frontend storefront: rutas/textos hardcodeados + i18n inconsistente (ej. `href="/productos"`, `not-found` en español fijo, `html lang` no derivado de `[lang]`).
- Frontend admin: mezcla fuerte de estilos inline + layout no responsivo (`sidebar` fijo + `marginLeft: 240`) con deuda de mantenibilidad visual.

---

## Enfoques posibles

1. **Hardening incremental por riesgo (recomendado)**
- Primero P0 seguridad/gates, luego frontend coherencia.
- Minimiza riesgo de regresión en producción.

2. **Refactor frontend-first**
- Ataca primero i18n/UX visual.
- Mejora experiencia rápido, pero deja riesgos operativos abiertos.

3. **Freeze + gran refactor transversal**
- Máxima limpieza arquitectónica en una sola ola.
- Riesgo alto de scope creep y ventanas largas sin release.

**Recomendación:** enfoque 1.

---

### Task 1: Corregir runner dual-repo para eliminar falsos fallos de ejecución

**Files:**
- Modify: `scripts/ops/dual-repo-release-gate.sh`

**Step 1: Reproducir fallo actual**
Run:
```bash
bash scripts/ops/dual-repo-release-gate.sh
```
Expected: `EACCES` en gates `pnpm -C ... turbo ...`.

**Step 2: Cambiar invocaciones a `pnpm -C <dir> exec turbo ...`**

**Step 3: Asegurar captura robusta de exit codes y output en `gate()`**

**Step 4: Verificar**
Run:
```bash
bash scripts/ops/dual-repo-release-gate.sh
```
Expected: sin `EACCES`; fallos solo por deuda real.

**Step 5: Commit**
```bash
git add scripts/ops/dual-repo-release-gate.sh
git commit -m "ci: fix dual-repo release gate command invocation"
```

---

### Task 2: Convertir build de Medusa en gate determinístico (sin falso verde)

**Files:**
- Modify: `apps/medusa/package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `scripts/release-gate.sh`

**Step 1: Añadir test de contrato del build output**
Comprobar que build falla si aparece `TypeError: The "path" argument...`.

**Step 2: Ejecutar build con `NODE_ENV=production` en scripts/CI**

**Step 3: En release gate, bloquear si hay stderr crítico post-build**

**Step 4: Verificar**
Run:
```bash
NODE_ENV=production pnpm -C apps/medusa build
```
Expected: sin stack trace `tsconfig-paths`.

**Step 5: Commit**
```bash
git add apps/medusa/package.json .github/workflows/ci.yml scripts/release-gate.sh
git commit -m "build: make medusa build deterministic and fail on critical stderr"
```

---

### Task 3: Reparar seguridad RLS (eliminar `USING (true)` en gobernanza)

**Files:**
- Create: `supabase/migrations/20260210_rls_tenant_scoping_hotfix.sql`
- Modify: `supabase/migrations/20260210_rls_policy_idempotency_patch.sql`
- Modify: `docs/rls-access-control.md`

**Step 1: Escribir tests SQL/contract sobre políticas efectivas por tabla**

**Step 2: Sustituir `USING (true)` por políticas tenant-scoped y/o role-scoped**

**Step 3: Garantizar idempotencia (`DROP POLICY IF EXISTS` + `CREATE POLICY`)**

**Step 4: Verificar**
Run:
```bash
bash scripts/check-migration-order.sh
bash scripts/check-rls.sh
```
Expected: PASS en ambos checks.

**Step 5: Commit**
```bash
git add supabase/migrations/20260210_rls_tenant_scoping_hotfix.sql supabase/migrations/20260210_rls_policy_idempotency_patch.sql docs/rls-access-control.md
git commit -m "sec: restore tenant-scoped rls policies and remove permissive reads"
```

---

### Task 4: Endurecer validación RLS (estática + efectiva)

**Files:**
- Modify: `scripts/check-rls.sh`
- Modify: `scripts/check-rls-effective.sh`
- Modify: `.github/workflows/ci.yml`

**Step 1: Corregir parser estático para asociar `USING` con su tabla/policy exacta**

**Step 2: Añadir modo CI para validación efectiva (`pg_policies`) con DB de prueba**

**Step 3: Integrar job dedicado en CI (opcional por secreto, obligatorio en release)**

**Step 4: Verificar**
Run:
```bash
bash scripts/check-rls.sh
SUPABASE_DB_URL=<test-url> bash scripts/check-rls-effective.sh
```
Expected: resultados consistentes sin falsos positivos.

**Step 5: Commit**
```bash
git add scripts/check-rls.sh scripts/check-rls-effective.sh .github/workflows/ci.yml
git commit -m "ci: harden rls validation with precise static and effective checks"
```

---

### Task 5: Cerrar incoherencias i18n de routing en storefront

**Files:**
- Modify: `apps/storefront/src/components/home/HeroSection.tsx`
- Modify: `apps/storefront/src/components/home/FeaturedProducts.tsx`
- Modify: `apps/storefront/src/components/home/CategoryGrid.tsx`
- Modify: `apps/storefront/src/app/[lang]/(shop)/productos/[handle]/page.tsx`
- Modify: `apps/storefront/src/app/[lang]/not-found.tsx`
- Modify: `apps/storefront/src/app/not-found.tsx`

**Step 1: Escribir tests de navegación localizada (en/de/fr/it) para links críticos**

**Step 2: Reemplazar `href` hardcodeados por `localizedHref()` o helper server equivalente**

**Step 3: Unificar `not-found` locale-aware (texto + rutas)**

**Step 4: Verificar**
Run:
```bash
pnpm --filter=storefront test:run
pnpm -C apps/storefront test:e2e -- --grep "i18n|products"
```
Expected: rutas localizadas funcionales y consistentes.

**Step 5: Commit**
```bash
git add apps/storefront/src/components/home/HeroSection.tsx apps/storefront/src/components/home/FeaturedProducts.tsx apps/storefront/src/components/home/CategoryGrid.tsx apps/storefront/src/app/[lang]/(shop)/productos/[handle]/page.tsx apps/storefront/src/app/[lang]/not-found.tsx apps/storefront/src/app/not-found.tsx
git commit -m "i18n: remove hardcoded canonical routes from storefront navigation"
```

---

### Task 6: Completar mapa de slugs locales en `proxy.ts` y contratos de rewrite

**Files:**
- Modify: `apps/storefront/src/proxy.ts`
- Modify: `apps/storefront/src/lib/i18n/index.ts`
- Create: `apps/storefront/src/lib/i18n/__tests__/slug-rewrite-contract.test.ts`

**Step 1: Definir matriz completa `routes.*` <-> slugs por locale (incluye checkout/panel/order)**

**Step 2: Alinear `SLUG_MAPS` con diccionarios**

**Step 3: Añadir test que compare claves de diccionario contra mapa de proxy**

**Step 4: Verificar**
Run:
```bash
pnpm --filter=storefront test:run
```
Expected: PASS sin divergencias de slugs.

**Step 5: Commit**
```bash
git add apps/storefront/src/proxy.ts apps/storefront/src/lib/i18n/index.ts apps/storefront/src/lib/i18n/__tests__/slug-rewrite-contract.test.ts
git commit -m "i18n: enforce full locale slug rewrite contract in proxy"
```

---

### Task 7: Corregir SEO multi-locale + `html lang` real por request

**Files:**
- Modify: `apps/storefront/src/app/layout.tsx`
- Modify: `apps/storefront/src/app/robots.ts`
- Modify: `apps/storefront/src/app/sitemap.ts`
- Modify: `apps/storefront/src/lib/seo/jsonld.ts`

**Step 1: Añadir tests para `lang` attribute y URLs localizadas en sitemap/robots**

**Step 2: Pasar `lang` dinámico correcto a `<html lang=...>` sin romper theme/config SSR**

**Step 3: Generar sitemap por locales activos y canonicales consistentes**

**Step 4: Verificar**
Run:
```bash
pnpm --filter=storefront test:run
pnpm turbo build --filter=storefront
```
Expected: build PASS + metadata/SEO locale-correctos.

**Step 5: Commit**
```bash
git add apps/storefront/src/app/layout.tsx apps/storefront/src/app/robots.ts apps/storefront/src/app/sitemap.ts apps/storefront/src/lib/seo/jsonld.ts
git commit -m "seo: align html lang, robots, sitemap and jsonld with locale routing"
```

---

### Task 8: Coherencia frontend senior en storefront (UX + a11y + consistencia)

**Files:**
- Modify: `apps/storefront/src/components/layout/Header.tsx`
- Modify: `apps/storefront/src/components/layout/Footer.tsx`
- Modify: `apps/storefront/src/components/layout/LanguageSelector.tsx`
- Modify: `apps/storefront/src/components/layout/CurrencySelector.tsx`
- Modify: `apps/storefront/src/app/globals.css`

**Step 1: Eliminar textos hardcodeados, usar `t()` para etiquetas visibles y aria labels**

**Step 2: Reemplazar `window.location.href` por navegación SPA (`router.push`)**

**Step 3: Añadir estados accesibles (`aria-expanded`, `aria-controls`, focus trap en drawer)**

**Step 4: Verificar**
Run:
```bash
pnpm --filter=storefront lint
pnpm -C apps/storefront test:e2e -- --grep "homepage|i18n|cart"
```
Expected: UX consistente desktop/mobile y sin regresión de navegación.

**Step 5: Commit**
```bash
git add apps/storefront/src/components/layout/Header.tsx apps/storefront/src/components/layout/Footer.tsx apps/storefront/src/components/layout/LanguageSelector.tsx apps/storefront/src/components/layout/CurrencySelector.tsx apps/storefront/src/app/globals.css
git commit -m "frontend: improve i18n consistency and accessibility in storefront shell"
```

---

### Task 9: Refactor de UI SuperAdmin para escalabilidad y responsive real

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/components/SuperAdminSidebar.tsx`
- Modify: `src/components/LoginForm.tsx`
- Modify: `src/app/globals.css`

**Step 1: Definir layout responsive (sidebar colapsable + content sin `marginLeft` fijo)**

**Step 2: Reducir estilos inline críticos hacia clases semánticas reutilizables**

**Step 3: Mantener dark design tokens y consistencia visual entre vistas**

**Step 4: Verificar**
Run:
```bash
pnpm lint && pnpm type-check && pnpm test:run && pnpm build
```
Expected: PASS + UI usable en mobile/tablet/desktop.

**Step 5: Commit**
```bash
git add src/app/(dashboard)/layout.tsx src/components/SuperAdminSidebar.tsx src/components/LoginForm.tsx src/app/globals.css
git commit -m "frontend: make superadmin layout responsive and reduce inline style debt"
```

---

### Task 10: Contrato de esquema compartido entre repos (evitar drift)

**Files:**
- Create: `CAMPIFRUT/packages/shared/src/supabase-contract.ts`
- Modify: `bootandstrap-admin/src/lib/validation.ts`
- Create: `bootandstrap-admin/src/lib/__tests__/supabase-contract-compat.test.ts`
- Modify: `docs/architecture/SUPABASE_SCHEMA.md`

**Step 1: Definir contrato mínimo de columnas críticas (`config`, `feature_flags`, `plan_limits`, `profiles`)**

**Step 2: Validar en tests que formularios/admin mutations solo usen campos existentes**

**Step 3: Añadir check en CI para drift de contrato**

**Step 4: Verificar**
Run:
```bash
pnpm -C bootandstrap-admin test:run
pnpm -C CAMPIFRUT turbo type-check
```
Expected: PASS y drift detectado automáticamente.

**Step 5: Commit**
```bash
git add CAMPIFRUT/packages/shared/src/supabase-contract.ts bootandstrap-admin/src/lib/validation.ts bootandstrap-admin/src/lib/__tests__/supabase-contract-compat.test.ts docs/architecture/SUPABASE_SCHEMA.md
git commit -m "architecture: enforce cross-repo supabase schema contract"
```

---

### Task 11: Rehacer E2E para valor real (no smoke frágil)

**Files:**
- Modify: `apps/storefront/e2e/products.spec.ts`
- Modify: `apps/storefront/e2e/cart.spec.ts`
- Modify: `apps/storefront/e2e/checkout.spec.ts`
- Modify: `apps/storefront/e2e/i18n.spec.ts`
- Modify: `apps/storefront/playwright.config.ts`

**Step 1: Reemplazar selectores ambiguos (`[data-testid="product-card"] a`) por contratos reales**

**Step 2: Convertir assertions “suaves” en verificaciones de negocio (ruta, precio, checkout step)**

**Step 3: Añadir matrix mínima por locale para slugs traducidos clave**

**Step 4: Verificar**
Run:
```bash
pnpm -C apps/storefront test:e2e
```
Expected: pruebas estables y con señales útiles de regresión.

**Step 5: Commit**
```bash
git add apps/storefront/e2e/products.spec.ts apps/storefront/e2e/cart.spec.ts apps/storefront/e2e/checkout.spec.ts apps/storefront/e2e/i18n.spec.ts apps/storefront/playwright.config.ts
git commit -m "test: harden storefront e2e suite for meaningful business assertions"
```

---

### Task 12: Limpieza de documentación operativa dual-repo (fuente única veraz)

**Files:**
- Modify: `DOCS_GUIDE.md`
- Modify: `GEMINI.md`
- Modify: `docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v9.md`
- Create: `docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v10.md`
- Modify: `bootandstrap-admin/GEMINI.md`
- Modify: `bootandstrap-admin/docs/QUALITY_GATES_2026-02-10.md`

**Step 1: Eliminar claims obsoletos (admin “pendiente de separación”, baseline v5 antigua, coverage rota)**

**Step 2: Publicar baseline v10 con evidencia ejecutada y deuda residual explícita**

**Step 3: Agregar tabla de ownership por repo (qué vive dónde y quién rompe qué)**

**Step 4: Verificar**
Run:
```bash
rg -n "pendiente de separación|v5|coverage FAIL|TENANT_ID build fail|EACCES" DOCS_GUIDE.md GEMINI.md docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v10.md bootandstrap-admin/GEMINI.md
```
Expected: docs coherentes con estado actual.

**Step 5: Commit**
```bash
git add DOCS_GUIDE.md GEMINI.md docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v9.md docs/operations/PRODUCTION_READINESS_REPORT_2026-02-10_v10.md bootandstrap-admin/GEMINI.md bootandstrap-admin/docs/QUALITY_GATES_2026-02-10.md
git commit -m "docs: publish v10 dual-repo production baseline and remove stale claims"
```

---

## Exit Criteria (Definition of Done)

1. `bash scripts/ops/dual-repo-release-gate.sh` ejecuta sin `EACCES` y falla solo por deuda real.
2. `bash scripts/check-migration-order.sh && bash scripts/check-rls.sh` PASS.
3. `NODE_ENV=production pnpm -C apps/medusa build` sin stack trace crítico.
4. `pnpm -C CAMPIFRUT lint && pnpm -C CAMPIFRUT type-check && pnpm -C CAMPIFRUT test:run && pnpm -C CAMPIFRUT build` PASS.
5. `pnpm -C bootandstrap-admin lint && pnpm -C bootandstrap-admin type-check && pnpm -C bootandstrap-admin test:run && pnpm -C bootandstrap-admin build` PASS.
6. Navegación i18n consistente (links + rewrites + sitemap/robots + html lang) validada por tests.
7. SuperAdmin usable en móvil y escritorio sin degradación funcional.
8. Documentación de ambos repos refleja exactamente el estado verificado por comandos.
