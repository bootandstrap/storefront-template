# Dual-Repo Production Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corregir todos los hallazgos P1/P2/P3 de seguridad e integridad en `CAMPIFRUT` + `bootandstrap-admin` con cobertura de pruebas y gates de release.

**Architecture:** Aplicar remediación por capas: primero seguridad de rendering (XSS), luego consistencia transaccional de provisionamiento, después políticas RLS/migration safety, hardening HTTP en admin, y finalmente validación estricta de dominio. Cada capa se implementa con TDD y verificación incremental para evitar regresiones funcionales.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, Supabase (RLS + migrations SQL), Bash quality gates, pnpm/turbo.

---

## Scope y Criterios de Aceptación

- Se elimina el vector de XSS en preview de templates del panel owner.
- La provisión de tenant no puede quedar en estado parcial con owner inconsistente.
- Las migraciones finales dejan `analytics_events` con política de inserción cerrada a `service_role`.
- SuperAdmin incluye headers de seguridad mínimos (CSP, XFO, HSTS, etc.).
- `domain` se valida con formato estricto antes de usarse en deploy/env.
- Gates finales pasan en ambos repos con evidencia reproducible.

## Precondiciones

- Ejecutar en rama dedicada (sugerido):
  - `codex/dual-repo-hardening-2026-02-12`
- Node/pnpm instalados.
- Workspace con ambos repos:
  - `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT`
  - `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin`

---

### Task 1: XSS Hardening en preview de WhatsApp templates (Storefront)

**Files:**
- Modify: `apps/storefront/src/app/[lang]/(panel)/panel/mensajes/MessagesClient.tsx`
- Create: `apps/storefront/src/app/[lang]/(panel)/panel/mensajes/__tests__/preview-render.test.tsx`
- Optional Modify: `apps/storefront/src/lib/security/sanitize-html.ts`

**Step 1: Escribir test que demuestre payload XSS en preview**

- Caso mínimo: template con `<img src=x onerror=alert(1)>`.
- Asegurar que el output de preview no contiene `onerror`, `script`, ni URLs `javascript:`.

**Step 2: Ejecutar test para confirmar fallo inicial**

Run: `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT --filter=storefront test:run -- preview-render`
Expected: FAIL mostrando que el payload llega al HTML de preview.

**Step 3: Implementar rendering seguro**

- Reemplazar `dangerouslySetInnerHTML` del preview por estrategia segura:
  - Opción recomendada: renderizado en texto (`pre-wrap`) + formato de negritas sin HTML arbitrario.
  - Alternativa: sanitización fuerte antes de inyectar HTML.
- Mantener UX visual del preview.

**Step 4: Re-ejecutar test y lint**

Run:
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT --filter=storefront test:run -- preview-render`
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT --filter=storefront lint`
Expected: PASS en ambos.

**Step 5: Commit**

```bash
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT add \
  apps/storefront/src/app/[lang]/(panel)/panel/mensajes/MessagesClient.tsx \
  apps/storefront/src/app/[lang]/(panel)/panel/mensajes/__tests__/preview-render.test.tsx \
  apps/storefront/src/lib/security/sanitize-html.ts
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT commit -m "fix(storefront): harden template preview against XSS"
```

---

### Task 2: Provisioning atómico de owner account (Admin)

**Files:**
- Modify: `src/lib/owner-account.ts`
- Modify: `src/lib/provision.ts`
- Create: `src/lib/__tests__/owner-account.test.ts`
- Modify: `src/lib/__tests__/provision.test.ts`

**Step 1: Añadir tests de consistencia transaccional**

- Test A: si falla update de `profiles`, se elimina user auth creado y la operación falla.
- Test B: `provisionTenantFull` retorna `success=false` y rollback de tenant cuando owner no queda consistente.

**Step 2: Ejecutar tests para confirmar fallo inicial**

Run: `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin test:run -- owner-account provision`
Expected: FAIL en al menos uno de los escenarios nuevos.

**Step 3: Implementar rollback explícito**

- En `createOwnerAccount`:
  - si falla profile update, intentar `auth.admin.deleteUser(createdUserId)`.
  - lanzar error tipado para que caller lo trate como fallo duro.
- En `provisionTenantFull`:
  - mantener rollback de tenant y mensaje de error determinista.

**Step 4: Re-ejecutar tests + type-check**

Run:
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin test:run -- owner-account provision`
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin type-check`
Expected: PASS.

**Step 5: Commit**

```bash
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin add \
  src/lib/owner-account.ts \
  src/lib/provision.ts \
  src/lib/__tests__/owner-account.test.ts \
  src/lib/__tests__/provision.test.ts
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin commit -m "fix(admin): enforce atomic owner provisioning with rollback"
```

---

### Task 3: Cerrar inconsistencia RLS de `analytics_events` (Storefront/Supabase)

**Files:**
- Create: `supabase/migrations/20260212_analytics_events_insert_service_role_finalize.sql`
- Modify: `scripts/check-rls.sh`
- Optional Modify: `docs/operations/RUNBOOK.md`

**Step 1: Añadir migración finalizadora (forward-only)**

- No reescribir migraciones históricas aplicadas.
- Nueva migración debe:
  - `DROP POLICY IF EXISTS` para variantes previas.
  - `CREATE POLICY ... FOR INSERT WITH CHECK (auth.role() = 'service_role')`.

**Step 2: Endurecer gate de RLS**

- Actualizar `scripts/check-rls.sh` para detectar explícitamente políticas de `INSERT` permisivas en `analytics_events`.
- El check debe fallar si detecta `WITH CHECK (true)` en la política efectiva.

**Step 3: Ejecutar checks de migraciones/RLS**

Run:
- `bash /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT/scripts/check-migration-order.sh`
- `bash /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT/scripts/check-rls.sh`
Expected: PASS.

**Step 4: (Opcional recomendado) test de contrato API analytics**

- Extender `apps/storefront/src/app/api/analytics/__tests__/route.test.ts` para validar comportamiento esperado cuando inserción no autorizada ocurre a nivel DB.

**Step 5: Commit**

```bash
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT add \
  supabase/migrations/20260212_analytics_events_insert_service_role_finalize.sql \
  scripts/check-rls.sh \
  docs/operations/RUNBOOK.md \
  apps/storefront/src/app/api/analytics/__tests__/route.test.ts
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT commit -m "fix(rls): finalize analytics insert policy to service_role only"
```

---

### Task 4: Security Headers en SuperAdmin

**Files:**
- Modify: `next.config.ts`
- Create: `src/app/api/__tests__/security-headers.test.ts` (o equivalente)

**Step 1: Añadir test de presencia de headers críticos**

- Validar al menos en rutas app/api:
  - `X-Frame-Options=DENY`
  - `X-Content-Type-Options=nosniff`
  - `Referrer-Policy`
  - `Strict-Transport-Security`
  - `Content-Security-Policy`

**Step 2: Ejecutar test para ver fallo inicial**

Run: `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin test:run -- security-headers`
Expected: FAIL.

**Step 3: Implementar headers en `next.config.ts`**

- Reutilizar baseline del storefront y ajustar `connect-src` a dominios necesarios del admin.
- Evitar romper login de Supabase ni requests internas.

**Step 4: Verificación local**

Run:
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin test:run -- security-headers`
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin build`
Expected: PASS.

**Step 5: Commit**

```bash
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin add \
  next.config.ts \
  src/app/api/__tests__/security-headers.test.ts
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin commit -m "feat(admin): add production security headers"
```

---

### Task 5: Validación estricta de dominio en tenant creation (Admin)

**Files:**
- Modify: `src/lib/validation.ts`
- Modify: `src/lib/__tests__/validation-contract.test.ts`
- Optional Modify: `src/app/(dashboard)/tenants/new/TenantWizard.tsx`

**Step 1: Añadir tests de dominio válido/inválido**

- Válidos: `store.example.com`, `cliente.es`.
- Inválidos: `https://store.com`, `store`, `bad domain`, `a..b.com`, `-foo.com`.

**Step 2: Ejecutar test para confirmar fallo inicial**

Run: `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin test:run -- validation-contract`
Expected: FAIL en casos inválidos aceptados.

**Step 3: Implementar schema robusto**

- En `createTenantSchema.domain`, usar regex/normalización de hostname DNS-safe.
- Mantener nullable/optional para tenants sin dominio custom.

**Step 4: Re-ejecutar tests + type-check**

Run:
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin test:run -- validation-contract`
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin type-check`
Expected: PASS.

**Step 5: Commit**

```bash
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin add \
  src/lib/validation.ts \
  src/lib/__tests__/validation-contract.test.ts \
  src/app/(dashboard)/tenants/new/TenantWizard.tsx
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin commit -m "fix(admin): enforce strict custom domain validation"
```

---

### Task 6: Verificación integral dual-repo y criterio de release

**Files:**
- Optional Modify: `scripts/ops/dual-repo-release-gate.sh`
- Optional Modify: `docs/operations/DEPENDENCY_RISK_REGISTER.md`

**Step 1: Ejecutar checks completos repo por repo**

Run CAMPIFRUT:
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT lint`
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT type-check`
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT test:run`
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT build`

Run Admin:
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin lint`
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin type-check`
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin test:run`
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin build`

Expected: PASS global.

**Step 2: Ejecutar release gate unificado**

Run:
- `bash /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT/scripts/ops/dual-repo-release-gate.sh`
Expected: `ALL GATES PASSED`.

**Step 3: Validar audit + waivers vigentes**

Run:
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT audit --prod --audit-level moderate`
- `pnpm -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/bootandstrap-admin audit --prod --audit-level moderate`
Expected: sin findings no-waived moderados/altos.

**Step 4: Commit final de ajustes de gate/docs (si aplica)**

```bash
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT add \
  scripts/ops/dual-repo-release-gate.sh \
  docs/operations/DEPENDENCY_RISK_REGISTER.md
git -C /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/CAMPIFRUT commit -m "chore(release): tighten dual-repo hardening verification"
```

---

## Rollout Recomendado

1. Deploy staging de ambos repos.
2. Ejecutar smoke E2E crítico:
   - login super_admin
   - creación tenant end-to-end
   - edición template WhatsApp + preview
   - `/api/analytics` con payload válido e inválido
3. Ejecutar migraciones en producción.
4. Deploy app layer.
5. Monitorear 24h: errores críticos, retries webhook, revalidate failures, provisioning failures.

## Definition of Done

- Cero hallazgos abiertos P1/P2/P3.
- Pruebas nuevas y existentes en verde.
- Gates dual-repo en verde.
- Evidencia de staging validada y checklist de rollout completado.
