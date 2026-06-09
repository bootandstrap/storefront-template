# Universal Suite Next Session Handoff

Fecha de referencia: `2026-06-09`

## Corrección crítica

La afirmación anterior de `storefront type-check: verde` ya no debe asumirse como verdad operativa después de rehidratar dependencias con `pnpm install`.

Verdad actual confirmada en este worktree a `2026-06-09`:

- `pnpm --filter storefront test:run`: sigue verde (`109/109`, `1412` tests, `2` skipped)
- `pnpm turbo lint --filter=storefront`: pasa con warnings, no con errores
- `pnpm --filter storefront build`: compila
- `pnpm --filter storefront type-check`: falla en limpio
- el fallo ya no está concentrado en el batch `schema/ops`; aparece un frente transversal de tipos React/React Aria/Email layouts + `PanelAnimations`

Esto contradice el estado previo de handoff y obliga a tratar `dependency/runtime rehydrate + type-check integrity` como batch propio antes de volver a vender `release-gate` cercano.

## Objetivo

Retomar desde un worktree limpio y cerrar lo que sigue abierto del suite universal en todos los repos, sin reabrir frentes ya reconducidos en `ecommerce-template`.

## Estado ya cerrado en este branch

- `schema ownership` del runtime: verde
- `migration order`: verde
- `sync-governance --check`: verde
- `sentrux check .`: verde
- `sentrux gate .`: verde
- `storefront test:run`: verde
- `billing-portal` auth contract: reparado
- `email-template-registry`, `CatalogClient` y `POSClient`: descompuestos para eliminar `god files`

## Verificación fresca ejecutada en este branch

```bash
bash /Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/scripts/check-schema-ownership.sh data-plane
bash scripts/check-migration-order.sh
bash scripts/sync-governance.sh --check
sentrux check .
sentrux gate .
pnpm --filter storefront test:run
bash scripts/release-gate.sh
```

Resultado real:

- `storefront test:run`: `109` files verdes, `1412` tests verdes, `2` skipped
- `release-gate` histórico del 2026-06-08: `6 passed`, `2 failed`

Verificación adicional ejecutada el `2026-06-09`:

```bash
pnpm install
pnpm --filter storefront type-check
pnpm --filter storefront build
pnpm turbo lint --filter=storefront
bash scripts/check-audit-waiver.sh
```

Resultado real actualizado:

- `storefront build`: verde
- `storefront lint`: verde en errores, con `196` warnings
- `storefront type-check`: rojo tras `pnpm install`
- `check-audit-waiver`: rojo con `87` advisories sin waiver válido

## Lo que sigue bloqueando release-gate

### 0. Storefront Type Check After Fresh Install

Bloqueo real:

- tras `pnpm install`, `pnpm --filter storefront type-check` falla
- la superficie afectada no es solo el batch tocado; incluye:
  - `src/components/panel/PanelAnimations.tsx`
  - `src/components/panel/ModuleSetupOrchestrator.tsx`
  - múltiples wrappers de `react-aria-components` (`button`, `checkbox`, `dropdown`, `input`, `select`, `table`, `tabs`)
  - layouts/emails (`BrandLayout`, `MinimalLayout`, `ModernLayout`, `preview-all`, `lib/email.ts`)
- el patrón dominante es incompatibilidad de tipos `ReactNode/ref` entre React 19 typings y wrappers/UI actuales

Acción siguiente:

1. aislar por qué el worktree “pasaba” antes y ahora no bajo hidratación limpia
2. decidir si la corrección va por:
   - normalizar toolchain/types
   - endurecer wrappers UI para React 19
   - o fijar/pinear versiones exactas de typings/runtime
3. no volver a afirmar `type-check verde` hasta rerun limpio post-`pnpm install`

### 1. Audit Policy

Bloqueo real:

- `87` advisories sin waiver válido en `docs/operations/DEPENDENCY_RISK_REGISTER.md` tras experimento de patch `Next` revertido
- parte son `NO WAIVER found`
- parte son `waiver EXPIRED (Review By: 2026-06-07, Today: 2026-06-09)`
- la concentración dominante está en cadenas transitive-heavy de `Medusa` (`axios`, `fast-xml-parser`, `protobufjs`, `multer`, `minimatch`, etc.)

Acción siguiente:

1. decidir si se abre batch de upgrade de `Medusa`/tooling o si se aceptan/ruevan waivers con criterio de riesgo real
2. volver a correr `bash scripts/release-gate.sh`

### 2. Storefront Lint

Bloqueo real:

- siguen errores horizontales de lint ajenos al batch de schema/structure
- ejemplos confirmados por el gate:
  - `apps/storefront/get-config.js`: `require()` + `console`
  - `apps/storefront/scripts/check-i18n-sync.ts`: `prefer-const`
  - `src/app/[lang]/(panel)/layout.tsx`: `no-explicit-any`
  - `RevenueChartClient.tsx`: acceso a `ref` durante render
  - `AnalyticsCharts.tsx`: problema con memoización / React Compiler

Acción siguiente:

1. abrir batch exclusivo de warnings cleanup cuando `type-check` vuelva a baseline verde
2. priorizar warnings que apuntan a deuda real de hooks/deps y no solo `unused`
3. revalidar con `bash scripts/release-gate.sh`

## Cambios concretos de este branch

### Schema / governance truth

- `supabase/migrations/001_schema_core.sql`
- `supabase/migrations/20260412_custom_email_domain.sql`
- `supabase/migrations/20260413_email_governance_v1.sql`

Dirección aplicada:

- el DDL legacy de `custom_email_domain` y `email_preferences` se reabsorbió al squash base
- las migraciones post-cutoff del data-plane ya no introducen DDL nuevo sobre tablas de control-plane

### Structural cleanup

- `apps/storefront/src/emails/email-template-registry.ts`
- `apps/storefront/src/emails/email-layout-registry.ts`
- `apps/storefront/src/emails/email-template-loaders.ts`
- `apps/storefront/src/emails/email-subjects.ts`
- `apps/storefront/src/emails/email-designs.ts`
- `apps/storefront/src/app/[lang]/(panel)/panel/catalogo/CatalogClient.tsx`
- `apps/storefront/src/app/[lang]/(panel)/panel/catalogo/catalog-deps.ts`
- `apps/storefront/src/app/[lang]/(panel)/panel/pos/POSClient.tsx`
- `apps/storefront/src/app/[lang]/(panel)/panel/pos/pos-client-types.ts`
- `apps/storefront/src/app/[lang]/(panel)/panel/pos/pos-client-runtime.ts`

### Contract / test alignment

- `apps/storefront/src/app/api/billing-portal/route.ts`
- `apps/storefront/src/__tests__/governance/graceful-degradation.test.ts`
- `apps/storefront/src/lib/__tests__/panel-route-guards.test.ts`
- `apps/storefront/src/lib/__tests__/features.test.ts`
- `apps/storefront/src/lib/__tests__/payment-methods.test.ts`

## Orden recomendado para la siguiente sesión

1. seguir en `ecommerce-template` con `type-check integrity after fresh install`
2. después atacar `audit policy` con decisión explícita entre `upgrade path` y `waiver path`
3. luego limpiar warnings de lint
4. cuando `release-gate` quede verde aquí, volver al universal suite y revalidar `store-campifruit`
5. después retomar `BOOTANDSTRAP_WEB`
   - `sentrux` layer violation
   - `contract:verify`
   - `test:run`
6. al final revisar `react-bits-source`
   - normalizar entorno (`eslint`, `jsrepo`)

## Contexto universal fuera de este repo

Fuente canónica del audit universal:

- `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/artifacts/tooling/universal-audit/20260608T193906Z/UNIVERSAL_AUDIT_SUMMARY.md`

Plan local de remediación universal:

- `/Users/webnorka/DESARROLLO/BOOTANDSTRAP/PLANTILLA+ADMIN/docs/plans/2026-06-08-universal-audit-remediation-plan.md`

Resumen operativo:

- `ecommerce-template` ya no está bloqueado por schema truth ni por debt estructural base
- pero sí vuelve a estar bloqueado por `type-check` tras hidratación limpia de dependencias
- `store-campifruit` sigue siendo downstream validation target, no superficie primaria
- `BOOTANDSTRAP_WEB` sigue pendiente de contrato/test/layering
- `react-bits-source` sigue siendo debt de entorno más que de producto

## Regla de continuidad

No reabrir:

- `schema ownership`
- `migration order`
- `sync governance`
- `god files`

salvo que fallen de nuevo en un worktree limpio desde `origin/main`.
