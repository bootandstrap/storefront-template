# Platform Kernel Package Releases

Fecha de referencia: `2026-05-25`

## Paquetes cubiertos

- `@bootandstrap/platform-contract`
- `@bootandstrap/tenant-context`

## Objetivo

Estos paquetes son el primer corte del `platform kernel` compartido entre:

- `BOOTANDSTRAP_WEB`
- `ecommerce-template` / `apps/storefront`

La meta operativa es que el consumidor pueda depender de un artefacto versionado y publicable, no de una carpeta viva enlazada localmente.

## Validacion local minima

### 1. Contrato de publicacion

```bash
cd apps/storefront
pnpm exec vitest run src/lib/__tests__/shared-package-publication-contract.test.ts
```

Debe validar:

- `package.json` con `dist` como entrypoint
- `README.md`
- `publishConfig` hacia GitHub Packages
- `npm pack --dry-run` incluyendo solo artefactos publicables

### 2. Generar tarballs reales

```bash
pnpm pack:contracts
```

Salida esperada en `.artifacts/packages/`:

- `bootandstrap-platform-contract-<version>.tgz`
- `bootandstrap-tenant-context-<version>.tgz`

### 3. Smoke de consumidor

Instalar los artefactos en `BOOTANDSTRAP_WEB` sin persistir el cambio:

```bash
npm install --no-save \
  /abs/path/.artifacts/packages/bootandstrap-platform-contract-<version>.tgz \
  /abs/path/.artifacts/packages/bootandstrap-tenant-context-<version>.tgz
```

Validar:

```bash
node -e "import('@bootandstrap/platform-contract').then(m=>console.log(Object.keys(m)))"
node -e "import('@bootandstrap/tenant-context').then(m=>console.log(Object.keys(m)))"
```

Luego correr la suite focalizada del consumidor.

## Versionado

El repo usa `changesets`.

Crear release intent:

```bash
pnpm changeset
pnpm exec changeset status --output=.changeset/status.json
```

Notas:

- `storefront` y `apps/medusa` estan ignorados en `.changeset/config.json`.
- El release de estos paquetes no debe introducir bump semantico en apps consumidoras.
- `verificado`: en la auditoria de `2026-05-25`, `changeset status` proyecta `@bootandstrap/platform-contract@0.2.0` y `@bootandstrap/tenant-context@1.0.0`.

## Publicacion CI

Workflow:

- `.github/workflows/publish-platform-kernel.yml`

Comportamiento:

- valida contrato de publicacion tambien en `pull_request` hacia `main`
- escucha cambios en `packages/platform-contract/**`
- escucha cambios en `packages/tenant-context/**`
- aplica `changeset version`
- publica solo paquetes con release real pendiente
- empuja el commit de versionado
- soporta `workflow_dispatch` para release manual una vez el workflow exista en la rama por defecto `main`

## Checklist de release real

1. `verificado`: correr `pnpm exec vitest run apps/storefront/src/lib/__tests__/shared-package-publication-contract.test.ts`
2. `verificado`: correr `pnpm pack:contracts`
3. `verificado`: instalar los `.tgz` en `BOOTANDSTRAP_WEB` y revalidar su suite focalizada
4. `verificado`: revisar `pnpm exec changeset status --output=.changeset/status.json`
5. `parcialmente verificado`: semver candidato actual `@bootandstrap/platform-contract@0.2.0` y `@bootandstrap/tenant-context@1.0.0`; falta aceptar si `1.0.0` es el corte deseado
6. `no verificado`: ejecutar el workflow `.github/workflows/publish-platform-kernel.yml`
7. `no verificado`: actualizar el consumidor `BOOTANDSTRAP_WEB` para fijar versiones publicadas
8. `no verificado`: ejecutar `npm ci` limpio del consumidor usando registry
9. `no verificado`: revalidar browser owner autenticado y smoke del dashboard starter

## Riesgos abiertos

- Las dependencias `file:` entre worktrees siguen siendo utiles para desarrollo local, pero no sustituyen la estrategia de artefacto publicado.
- `tenant-context` puede recibir bumps mas agresivos si cambia una dependencia interna pre-1.0; revisar siempre `changeset status` antes de publicar.
- `verificado`: mientras este workflow no viva en la rama remota `main`, el publish CI real sigue bloqueado aunque la worktree local este lista
