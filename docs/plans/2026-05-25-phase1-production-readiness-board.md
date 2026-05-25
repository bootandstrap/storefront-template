# Phase 1 Production Readiness Board — ecommerce-template

Fecha de referencia: `2026-05-25`

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
- `parcialmente verificado`: consumo cross-owner desde `BOOTANDSTRAP_WEB` bloqueado por auth a GH Packages
- `parcialmente verificado`: sigue faltando validacion browser autenticada owner despues de consumir versiones publicadas

## Bloqueantes para llamar esto listo para produccion

1. `no verificado`: resolver auth de `BOOTANDSTRAP_WEB` hacia GH Packages
2. `no verificado`: fijar consumo por version publicada en `BOOTANDSTRAP_WEB`
3. `no verificado`: validar `npm ci` limpio del consumidor usando registry, no `file:` ni tarball local
4. `no verificado`: validar browser owner autenticado real tras consumir versiones publicadas

## Backlog inmediato por orden

1. Resolver si el consumidor usara PAT/secret `read:packages` o acceso de package a repo
2. Sustituir `file:` por versiones publicadas en `BOOTANDSTRAP_WEB`
3. Revalidar las suites focalizadas de consumidor y runtime owner

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

- `verificado`: el siguiente batch correcto en este repo es release-readiness, no feature expansion
- `verificado`: si la publicacion remota ya ocurrio, este doc debe actualizarse antes de seguir con `Workstream C`
