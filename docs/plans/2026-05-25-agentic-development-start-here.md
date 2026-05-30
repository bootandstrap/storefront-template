# Agentic Development Start Here — ecommerce-template

Fecha de referencia: `2026-05-30`

## Objetivo

Dejar un entrypoint corto y vivo para retomar el companion runtime del cierre P0/P1 sin reauditar toda la sesion.

## Read order minimo

1. `../../AGENTS.md`
2. `2026-05-30-next-session-handoff-prompt.md`
3. `../../../bootandstrap-web/p0p1-main-promotion/docs/plans/2026-05-30-next-session-handoff-prompt.md`
4. `2026-05-25-phase1-production-readiness-board.md`
5. `2026-05-24-owner-starter-panel-migration.md`
6. `../operations/PLATFORM_KERNEL_PACKAGE_RELEASES.md`
7. `../SCHEMA.md`
8. `../README.md`

## Estado actual

- `verificado`: owner starter ya vive en `/(panel)/panel`
- `verificado`: la surface policy del panel ya usa `ownerExperienceMode`
- `verificado`: `resolveTenantContext()` ya es contrato compartido entre storefront y control-plane
- `verificado`: `tenant-context` ahora preserva `profileTenantId` tambien para actores no panel
- `verificado`: `platform-contract` y `tenant-context` ya son publicables localmente
- `verificado`: `pnpm pack:contracts` genera artefactos consumibles por `BOOTANDSTRAP_WEB`
- `verificado`: el workflow de publish ya tiene gate en `pull_request` y `workflow_dispatch` para release manual post-merge
- `verificado`: el smoke `source -> pack -> install artifact -> consumer tests` fue revalidado el `2026-05-25`
- `verificado`: `changeset status` proyecta ahora `@bootandstrap/platform-contract@0.2.0` y `@bootandstrap/tenant-context@1.0.0`
- `verificado`: publish real a GitHub Packages y consumo por version publicada ya quedaron cerrados
- `verificado`: el `delete_tenant()` SQL canónico ya tolera drift de tablas opcionales
- `verificado`: el loop real `create -> deploy -> owner login -> QA login -> cleanup` ya quedó revalidado desde el control-plane el `2026-05-29`
- `parcialmente verificado`: la evidencia operativa del lifecycle vive en el control-plane; este repo solo debe mantenerse alineado

## Lo mas importante que NO olvidar

- `verificado`: no volver a esconder `starter_collaborative` dentro de `featureFlags`
- `verificado`: no mover owner starter de vuelta a `BOOTANDSTRAP_WEB`
- `verificado`: no tratar Dokploy como source of truth
- `verificado`: los `dist/` de `packages/platform-contract` y `packages/tenant-context` son ahora parte del flujo de release

## Siguiente backlog ejecutable

1. Mantener green el contrato `source -> pack -> install artifact -> tests`
2. Mantener alineado `delete_tenant()` y el protocolo lifecycle cross-repo
3. Soportar el siguiente drill no demo sin reintroducir drift de auth o source-of-truth
4. Posponer `starter-engine` compartido hasta cerrar el siguiente corte operativo

## Validacion rapida

```bash
cd ../../apps/storefront
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

## Notas para IA/Codex

- `verificado`: si tocas `packages/platform-contract` o `packages/tenant-context`, revalida tambien el consumidor `BOOTANDSTRAP_WEB`
- `verificado`: si tocas `package.json` de estos paquetes, piensa en `npm pack` antes que en solo `pnpm test`
- `verificado`: si hay drift entre docs y artefacto, el artefacto empaquetado manda para release

## Higiene y continuidad

- `verificado`: repo sano para seguir desarrollando
- `verificado`: repo limpio para abrir el siguiente batch intencional
- `verificado`: el siguiente punto de limpieza real es mantener docs y SQL canónico alineados, no “hacer reset”
