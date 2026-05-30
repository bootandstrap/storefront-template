# AGENTS.md — ecommerce-template

Fecha de referencia: `2026-05-30`

## Scope

Este archivo es el entrypoint corto para sesiones de desarrollo IA/Codex en este worktree.

## Worktree activo

- `verificado`: worktree activo `/Users/webnorka/.config/superpowers/worktrees/ecommerce-template/p0p1-runtime-main`
- `verificado`: rama esperada `promote/p0p1-runtime-main`
- `verificado`: el worktree esta limpio y sirve como companion runtime del cierre P0/P1 cross-repo

## Leer primero

1. `docs/plans/2026-05-30-next-session-handoff-prompt.md`
2. `../bootandstrap-web/p0p1-main-promotion/docs/plans/2026-05-30-next-session-handoff-prompt.md` para continuidad cross-repo exacta
3. `../bootandstrap-web/p0p1-main-promotion/docs/operations/2026-05-29-p0p1-lifecycle-evidence.md`
4. `docs/plans/2026-05-25-agentic-development-start-here.md`
5. `docs/plans/2026-05-25-phase1-production-readiness-board.md`
6. `docs/plans/2026-05-24-owner-starter-panel-migration.md`
7. `docs/operations/PLATFORM_KERNEL_PACKAGE_RELEASES.md`
8. `../bootandstrap-web/p0p1-main-promotion/docs/operations/TENANT_LAUNCH_PROTOCOL.md` si la sesion toca lifecycle/launch/auth de tenant
9. `docs/SCHEMA.md`
10. `docs/README.md`
11. `README.md`
12. `GEMINI.md` solo si hace falta contexto adicional amplio

## Reglas duras

- `verificado`: no tocar repos originales sucios fuera de worktrees activos
- `verificado`: no revertir cambios ajenos
- `verificado`: usar `apply_patch` para edicion manual
- `verificado`: owner starter vive en el runtime tenant, no en `BOOTANDSTRAP_WEB`
- `verificado`: `owner_experience_mode` vive en `tenants`, no en `config`
- `verificado`: no introducir hardcode irreversible por cliente

## Estado actual de alta señal

- `verificado`: el panel owner starter ya vive en `/(panel)/panel`
- `verificado`: `ownerExperienceMode` ya gobierna la surface policy del panel
- `verificado`: `schemaVersion` ya sale en `health`, `live`, `ready` y `governance/health`
- `verificado`: existen `@bootandstrap/platform-contract` y `@bootandstrap/tenant-context` como paquetes publicables
- `verificado`: `pnpm pack:contracts` genera tarballs reales consumibles por `BOOTANDSTRAP_WEB`
- `verificado`: el workflow `publish-platform-kernel.yml` ya valida en `pull_request` y soporta `workflow_dispatch` para release manual una vez exista en `main`
- `verificado`: `pnpm exec changeset status --output=.changeset/status.json` proyecta `@bootandstrap/platform-contract@0.2.0` y `@bootandstrap/tenant-context@1.0.0`
- `verificado`: publish remoto real ejecutado el `2026-05-25`
- `verificado`: versiones publicadas reales `@bootandstrap/platform-contract@0.2.0` y `@bootandstrap/tenant-context@1.0.0`
- `verificado`: el consumidor `BOOTANDSTRAP_WEB` ya consume versiones publicadas
- `verificado`: el runtime de registro customer ahora vuelve a enlazar `profiles.tenant_id`
- `verificado`: el protocolo smoke/live ahora depende del mismo access kit owner + QA customer
- `verificado`: el worktree runtime ya puede resolver `.env.worktree` como source of truth local sin tocar el repo original sucio
- `verificado`: `scripts/governance-check.ts --dry-run` ya vuelve a pasar desde el root del monorepo contra `local-dev`
- `verificado`: smoke local autenticado `owner -> /es/panel` y `qa customer -> /es/cuenta` ya pasó en `http://localhost:3002` contra `local-dev`
- `verificado`: el SQL canónico del runtime ya incluye `tenant_medusa_scope` en cleanup y ahora debe tolerar drift de tablas opcionales al reaplicarse
- `verificado`: el loop real `create -> deploy -> owner login -> QA login -> cleanup` ya quedó revalidado desde el control-plane el `2026-05-29`
- `verificado`: la evidencia operativa canónica del lifecycle ya vive en el control-plane, no en este repo
- `parcialmente verificado`: siguen existiendo errores `tsc` preexistentes ajenos a este slice

## Siguiente orden preferido

1. Mantener el runtime y sus migraciones alineados con el source-of-truth operativo cross-repo
2. Soportar el siguiente drill no demo sin reabrir drift entre SQL canónico, auth y lifecycle protocol
3. No reabrir deuda de `.env`/worktree ni volver a tocar repos originales sucios
4. No abrir `starter-engine` compartido antes de cerrar lifecycle/launch protocol base

## Validacion focalizada

```bash
cd apps/storefront
pnpm exec vitest run \
  src/lib/__tests__/panel-owner-experience-contract.test.ts \
  src/lib/__tests__/panel-route-guards.test.ts \
  src/lib/__tests__/panel-modules.test.ts \
  src/__tests__/governance/graceful-degradation.test.ts \
  src/lib/__tests__/tenant-context.test.ts \
  src/lib/__tests__/starter-owner-mode.test.ts \
  src/lib/__tests__/panel-auth.test.ts \
  src/lib/__tests__/proxy-owner-routing-contract.test.ts \
  src/lib/__tests__/auth-routing.test.ts \
  src/lib/__tests__/auth-entrypoint-contract.test.ts \
  src/lib/__tests__/account-entrypoint-contract.test.ts \
  src/lib/__tests__/chat-route-tenant-context-contract.test.ts \
  src/lib/__tests__/module-purchase-tenant-context-contract.test.ts \
  src/lib/__tests__/billing-portal-tenant-context-contract.test.ts \
  src/lib/__tests__/supabase-types-sync-contract.test.ts \
  src/lib/__tests__/health-schema-version-contract.test.ts \
  src/lib/__tests__/shared-package-publication-contract.test.ts \
  src/app/api/health/__tests__/route.test.ts
```

## Higiene de repo

- `verificado`: este worktree ya esta limpio; el siguiente batch debe entrar como cambios nuevos e intencionales
- `verificado`: los `dist/` de `packages/platform-contract` y `packages/tenant-context` ahora son artefactos versionables, no basura local
- `verificado`: release remoto ejecutado y versiones fijadas desde registry
