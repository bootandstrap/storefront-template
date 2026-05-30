# Next Session Handoff Prompt — ecommerce-template — 2026-05-30

Fecha de referencia: `2026-05-30`  
Timezone operativa: `Europe/Zurich`

## Rol operativo en la siguiente sesion

Actua como companion runtime architect de `BOOTANDSTRAP_WEB` para cualquier cambio que toque:

- `apps/storefront`
- `apps/medusa`
- paquetes compartidos `platform-contract` y `tenant-context`
- SQL/migraciones que afecten lifecycle, auth o cleanup

Trabaja en `LOOP` estricto y trata el control-plane como fuente canónica de evidencia operativa.

## Leer primero

1. `../../../bootandstrap-web/p0p1-main-promotion/docs/plans/2026-05-30-next-session-handoff-prompt.md`
2. `../../../bootandstrap-web/p0p1-main-promotion/docs/operations/2026-05-29-p0p1-lifecycle-evidence.md`
3. `../../AGENTS.md`
4. `2026-05-25-phase1-production-readiness-board.md`
5. `2026-05-24-owner-starter-panel-migration.md`

## Estado cerrado

- `verificado`: `platform-contract` y `tenant-context` ya estan publicados y consumidos por el control-plane
- `verificado`: `delete_tenant()` SQL canónico ya incluye `tenant_medusa_scope` y tolerancia a drift
- `verificado`: el loop real `create -> deploy -> owner login -> QA login -> cleanup` ya fue validado desde el control-plane el `2026-05-29`
- `verificado`: el runtime local ya soporta smoke autenticado `owner -> /es/panel` y `qa customer -> /es/cuenta`
- `parcialmente verificado`: la evidencia operativa canónica vive fuera de este repo

## Lo que este repo debe proteger

1. no reintroducir drift entre SQL canónico y RPC desplegado
2. no romper `resolveTenantContext()` ni contratos `owner/customer/admin`
3. no volver a rutas `.env` compartidas que contaminen worktrees
4. no duplicar semántica de lifecycle que ya vive en el control-plane

## Siguiente backlog correcto

1. mantener verde `source -> pack -> install artifact -> consumer`
2. acompañar la decisión semántica `active vs seed_data` si exige cambios runtime
3. acompañar el drill no demo con repo GitHub propio si exige ajustes storefront/auth
4. actualizar docs runtime en el mismo batch si cambia el protocolo cross-repo
