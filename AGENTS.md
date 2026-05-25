# AGENTS.md — ecommerce-template

Fecha de referencia: `2026-05-25`

## Scope

Este archivo es el entrypoint corto para sesiones de desarrollo IA/Codex en este worktree.

## Worktree activo

- `verificado`: worktree activo `/Users/webnorka/.config/superpowers/worktrees/ecommerce-template/starter-owner-panel`
- `verificado`: rama esperada `starter-owner-panel`
- `parcialmente verificado`: el worktree esta sano para seguir desarrollando, pero no esta limpio de git porque contiene trabajo valido en curso de `Phase 1`

## Leer primero

1. `docs/plans/2026-05-25-agentic-development-start-here.md`
2. `docs/plans/2026-05-24-owner-starter-panel-migration.md`
3. `docs/plans/2026-05-25-phase1-production-readiness-board.md`
4. `docs/operations/PLATFORM_KERNEL_PACKAGE_RELEASES.md`
5. `docs/SCHEMA.md`
6. `docs/README.md`
7. `README.md`
8. `GEMINI.md` solo si hace falta contexto adicional amplio

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
- `parcialmente verificado`: el consumidor cross-owner sigue pendiente por auth a GH Packages desde `BOOTANDSTRAP_WEB`

## Siguiente orden preferido

1. Resolver auth de consumo cross-owner desde `BOOTANDSTRAP_WEB`
2. Migrar `BOOTANDSTRAP_WEB` a `@bootandstrap/platform-contract@0.2.0`
3. Migrar `BOOTANDSTRAP_WEB` a `@bootandstrap/tenant-context@1.0.0`
4. Mantener green el contrato `source -> pack -> install artifact -> consumer tests`
5. No abrir `starter-engine` compartido antes de cerrar paquete/versionado y consumers base

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

- `verificado`: no hay que “limpiar” este worktree borrando cambios; primero hay que consolidarlos en commits intencionales
- `verificado`: los `dist/` de `packages/platform-contract` y `packages/tenant-context` ahora son artefactos versionables, no basura local
- `no verificado`: release remoto ejecutado y versiones fijadas desde registry
