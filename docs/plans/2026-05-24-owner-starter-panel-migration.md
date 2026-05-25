# 2026-05-24 Owner Starter Panel Migration

## Estado de partida

- `verificado`: el owner starter actual ya existe en `BOOTANDSTRAP_WEB`, pero hoy cuelga de `/dashboard` del control-plane compartido.
- `verificado`: el shell owner real del storefront vive en `apps/storefront/src/app/[lang]/(panel)/panel`.
- `verificado`: el admin/control-plane debe quedarse en `BOOTANDSTRAP_WEB`.
- `verificado`: el proyecto Supabase real ya tiene tablas `starter_*`, pero `ecommerce-template` todavia no las refleja en su capa tipada local.
- `parcialmente verificado`: `ecommerce-template` puede leer governance por RPC/anon, pero el owner starter requiere una lectura adicional de proyecto/request/assets no modelada aun aqui.

## Decision target

- `verificado`: el owner starter temporal del cliente debe vivir en `/${lang}/panel`.
- `verificado`: cuando `config.owner_experience_mode === 'starter_collaborative'`, la home del panel deja de mostrar el dashboard de negocio clasico y renderiza la experiencia starter.
- `verificado`: el resto del panel normal no se elimina para todos los tenants; solo se colapsa o se restringe cuando el tenant esta en starter.

## Contrato minimo

1. `BOOTANDSTRAP_WEB` mantiene:
   - activacion starter
   - blueprint base y materializacion
   - operativa admin interna
   - cambios de estado internos

2. `ecommerce-template` expone solo superficie owner-safe:
   - timeline/fases del proyecto starter
   - requests visibles al owner
   - respuesta persistente del owner
   - assets subidos por request

3. Eje de datos:
   - `tenant_id` sigue siendo la clave de aislamiento
   - no se introduce `customer_id`
   - no se usa `project_milestones`

4. Compatibilidad:
   - tenants no starter siguen viendo el panel actual
   - el shell `(panel)` y sus guards no deben romperse
   - la deteccion de starter se hace de forma tolerante leyendo `config.owner_experience_mode` sin modificar los schemas compartidos bloqueados en este repo

## Implementacion prevista

1. Añadir helper local para detectar modo owner starter desde `config`.
2. Añadir capa local `starter-build` en storefront para:
   - tipos owner
   - query server-side del proyecto starter por `tenant_id`
   - acciones owner-safe para guardar respuestas y uploads
3. Hacer `apps/storefront/src/app/[lang]/(panel)/panel/page.tsx` starter-aware.
4. Ajustar la navegacion del panel para que no genere ambiguedad en starter.
5. Validar con tests de routing/contracto y con build del worktree.

## Riesgos vigentes

- `verificado`: hay drift de contrato entre el schema real del governance hub y `ecommerce-template` para tablas `starter_*`.
- `parcialmente verificado`: puede hacer falta ampliar los tipos RPC o usar acceso tipado local hasta que el sync del schema compartido incorpore starter.
