# Phase 1 Production Readiness Board — ecommerce-template

Fecha de referencia: `2026-05-29`

## Objetivo

Dejar un board corto y ejecutable para terminar `Phase 1` sin reabrir decisiones ya resueltas.

## Estado actual

- `verificado`: `platform-contract` y `tenant-context` ya existen como paquetes publicables
- `verificado`: el runtime owner ya consume `resolveTenantContext()` y `ownerExperienceMode`
- `verificado`: `pnpm pack:contracts` genera tarballs reales consumibles por `BOOTANDSTRAP_WEB`
- `verificado`: el contrato `source -> pack -> install artifact -> consumer tests` ya fue validado localmente
- `verificado`: `shared-package-publication-contract.test.ts` ya cubre tambien `pull_request` y `workflow_dispatch` del workflow de release
- `verificado`: `changeset status` proyecta `@bootandstrap/platform-contract@0.2.0` y `@bootandstrap/tenant-context@1.0.0`
- `verificado`: publicacion remota real completada en `main`
- `verificado`: `@bootandstrap/platform-contract@0.2.0` publicado
- `verificado`: `@bootandstrap/tenant-context@1.0.0` publicado
- `verificado`: `BOOTANDSTRAP_WEB` ya consume las versiones publicadas desde registry y `npm ci` real del consumidor ya pasó
- `verificado`: el smoke local autenticado owner + QA customer ya pasó sobre `local-dev`
- `verificado`: el `delete_tenant()` SQL canónico ya fue alineado con tolerancia a drift y reaplicado en producción
- `verificado`: el loop smoke real `create -> deploy -> owner login -> QA login -> cleanup` ya quedó revalidado desde el control-plane el `2026-05-29`
- `verificado`: el cleanup físico automático y la evidencia estructurada canónica ya existen en el runner del control-plane

## Bloqueantes para llamar esto listo para produccion

1. `parcialmente verificado`: el runtime local está listo para desarrollo y smoke local, pero no sustituye la validación continua del control-plane productivo
2. `parcialmente verificado`: siguen existiendo errores `tsc` preexistentes ajenos a este slice

## Backlog inmediato por orden

1. Mantener verde el contrato `source -> pack -> install artifact -> consumer`
2. Mantener `delete_tenant()` alineado con el protocolo real de lifecycle cross-repo
3. No reintroducir rutas locales/shared `.env` que rompan aislamiento de worktree

## Reglas de continuidad

- `verificado`: no abrir `starter-engine` compartido antes de cerrar este corte de release
- `verificado`: si cambias un paquete, revalida tambien el consumidor
- `verificado`: si la validacion difiere entre carpeta viva y artefacto empaquetado, manda el artefacto empaquetado
- `verificado`: no usar `build` global roto como argumento para bloquear este slice si la deuda es previa

## Validacion rapida

```bash
pnpm exec vitest run \
  apps/storefront/src/lib/__tests__/shared-package-publication-contract.test.ts \
  apps/storefront/src/lib/__tests__/tenant-context.test.ts \
  apps/storefront/src/lib/__tests__/panel-owner-experience-contract.test.ts \
  apps/storefront/src/lib/__tests__/proxy-owner-routing-contract.test.ts \
  apps/storefront/src/lib/__tests__/auth-routing.test.ts \
  apps/storefront/src/lib/__tests__/auth-entrypoint-contract.test.ts \
  apps/storefront/src/lib/__tests__/account-entrypoint-contract.test.ts \
  apps/storefront/src/lib/__tests__/health-schema-version-contract.test.ts \
  apps/storefront/src/app/api/health/__tests__/route.test.ts

pnpm pack:contracts
```

## Nota para IA/Codex

- `verificado`: el siguiente batch correcto en este repo es soporte del lifecycle canónico y limpieza de source-of-truth, no feature expansion
- `verificado`: si cambia el protocolo smoke/live/delete en `BOOTANDSTRAP_WEB`, este board debe reflejarlo antes de seguir
