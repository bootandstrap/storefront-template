# Template Deployed Functional Certification

Fecha semantica: `2026-07-07`

Owner: `ecommerce-template`

Status: `in_progress`

## Goal

Prove the reusable tenant runtime works as a deployed, client-agnostic product, not only as a local test/build artifact. The certification must exercise the deployed storefront, panel, Medusa backend, Supabase governance state, BSWEB commercial/grants flow and module gates as one system.

## Product Objective

Bootandstrap sells an operated commerce platform: BSWEB creates and governs tenants, while this template is the reusable runtime that every tenant receives. The runtime must prove that:

- a new tenant can run without customer-specific assumptions;
- BSWEB remains the central authority for grants, flags, limits and lifecycle;
- module activation changes runtime behavior through the grants/PDP/materialization pipeline;
- each module works independently and in a full-catalog combination;
- tenant data CRUD remains scoped, recoverable and observable.

## Current Evidence

- Existing reusable runtime matrix:
  - `apps/storefront/e2e/bns-360-runtime.spec.ts`
  - `apps/storefront/e2e/bns-360.matrix.ts`
  - `apps/storefront/e2e/support/bns-360-tenant-profiles.ts`
- Existing source contract tests:
  - `apps/storefront/src/lib/__tests__/bns-360-e2e-matrix.test.ts`
  - `apps/storefront/src/lib/__tests__/module-setup-registry-contract.test.ts`
- Current limitation: the matrix is route/render smoke. It verifies that critical surfaces load, but it does not yet prove CRUD, bidirectional grants, webhook-driven unlocks, or primary journeys per module.
- The runtime evidence envelope now separates:
  - `routeStatus`: smoke/API route certification status;
  - `functionalStatus`: deployed functional journey status;
  - `executionMode`: `smoke` by default, `functional` only with `BNS_360_FUNCTIONAL_JOURNEYS=1`.
- In `functional` mode, declared-only functional evidence is rejected unless a runner marks it `verified`. This prevents route smoke from being reported as CRUD/grants certification.
- In `functional` mode, authenticated scenarios now require owner credentials and fail explicitly when they are missing. The regular smoke path can still skip authenticated routes for public/runtime health diagnostics, but `cert:360:functional` can no longer finish green by skipping panel, CRUD, grants or module journeys.
- Automated functional runner coverage currently exists for structured `api_health` targets with concrete `/api/...` routes and read-only `runtime_config` targets with JSON-path assertions. CRUD, grants, mutable limit changes and primary journeys remain `manual_required` until implemented as reversible canary journeys.
- Lane 1 deployed runtime health was proven from the BSWEB control plane on `2026-07-08` using canary `ops-live-202607081954` / tenant `934ac146-4498-47f0-89c8-b78383acf95f`.
  - Runtime proof artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-lane1-runtime-health-20260708T2022Z.json` (`pass=true`).
  - Cleanup proof artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-lane1-cleanup-closure-20260708T2040Z.json` (`pass=true`).
  - Canonical residue proof after cleanup: tenants/config/profiles/async_jobs/module_orders all `0`.

## Certification Lanes

### Lane 1: Deployed Runtime Health

Status: `verified`

Evidence target:

- `/api/health`
- `/api/health/ready`
- `/api/health/live`
- `/api/v1/governance/health` with `BNS_360_HEALTH_CHECK_TOKEN` sent as `x-health-token`
- Medusa `/health`

Required proof:

- deployed URL is not localhost;
- Supabase and Medusa checks are `ok`;
- schema version matches the control-plane ground truth;
- runtime reports the configured tenant id.
- health tokens are read from env at execution time and are not persisted in evidence artifacts.

Evidence:

- `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-lane1-runtime-health-20260708T2022Z.json`
- `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-lane1-cleanup-closure-20260708T2040Z.json`

### Lane 2: Central Governance Connectivity

Status: `in_progress`

Evidence target:

- `get_tenant_governance` through storefront runtime;
- `feature_flags` and `plan_limits` reflected in panel policy;
- realtime or cache revalidation path after BSWEB materialization.

Required proof:

- a flag disabled in BSWEB locks the corresponding module route;
- a grant/materialization enables it again without redeploying the storefront;
- limits are visible and enforced server-side.

Source harness state:

- `governance.central_policy_read` exercises `/api/panel/limits?resources=products,categories,badges` as an authenticated API scenario.
- The associated functional evidence is `runtime_config` and asserts deployed JSON includes:
  - `products.limitKey`
  - `products.limit`
  - `categories.limitKey`
  - `badges.limitKey`
- This proves read-only central policy visibility through the storefront runtime. It does not yet prove mutable flag lock/unlock, BSWEB materialization, or cache/realtime revalidation after grants.

### Lane 3: Bidirectional Commercial Grants

Status: `todo`

Evidence target:

- Storefront `/api/module-purchase`;
- BSWEB `/api/commercial-checkout`;
- Stripe sandbox signed webhook or equivalent internal replay;
- `tenant_product_grants`;
- `reconcile_modules`;
- `materializeCapabilities`.

Required proof:

- storefront initiates checkout using semantic module/tier keys;
- BSWEB resolves the commercial catalog and creates checkout;
- webhook/reconciliation writes product grants;
- materializer updates `feature_flags`/`plan_limits`;
- deployed storefront reflects the unlocked module.

Source harness state:

- `commerce.modules_marketplace_and_limits` now carries functional evidence for `/api/module-purchase -> BSWEB /api/commercial-checkout -> grants materialization`.
- The target remains `manual_required` in functional mode until the deployed canary can execute a reversible checkout/grants replay and observe materialized limits.

### Lane 4: Module Primary Journeys

Status: `todo`

Evidence target:

- all modules in `BNS_360_REQUIRED_MODULE_KEYS`;
- each module has at least one deployed primary journey beyond route visibility.

Required proof examples:

- `ecommerce`: create/update/delete product or category against Medusa;
- `sales_channels`: update a payment/channel config and observe checkout method availability;
- `chatbot`: update config and call chat API with limit enforcement;
- `crm`: create/update/delete tenant-scoped contact;
- `email_marketing`: update email config or template without leaking secrets;
- `i18n`: change language/currency config and observe route/runtime effect;
- `seo`: update metadata and observe rendered SEO output;
- `rrss`: update social links and observe storefront output;
- `automation`: save notification config and validate guarded secret handling;
- `auth_advanced`: prove advanced auth flags gate the panel surface;
- `capacidad`: prove limits/backup vault visibility and non-destructive backup access;
- `pos` and `pos_kiosk`: prove POS core journey without requiring physical hardware.

### Lane 5: Full Catalog Combination

Status: `todo`

Evidence target:

- full-catalog tenant profile at highest published tier per module.

Required proof:

- all module routes load under one tenant;
- no route or config collision;
- dependency constraints are satisfied;
- POS and kiosk coexist;
- limits merge by max where multiple modules affect the same limit.

### Lane 6: Propagation Runtime Proof

Status: `todo`

Evidence target:

- `store-campifruit` after template source proof is green.

Required proof:

- no reusable fix originates in Campifruit;
- propagation preserves tenant overlay;
- Campifruit runtime health remains green after source propagation.

## Non Goals

- Do not close Stripe Tax, EUR amounts, annual pricing or live catalog publication in this slice.
- Do not claim physical POS lab certification.
- Do not use Campifruit as the source of reusable fixes.
- Do not weaken tests, exclude modules or downgrade gates to obtain green.

## First Implementation Batch

1. Turn the BNS 360 matrix into a richer contract that distinguishes `route_smoke`, `api_health`, `crud_journey`, `grant_unlock`, `limit_enforcement` and `module_primary_journey`.
2. Add a source test requiring every reusable module to declare at least one non-route functional evidence target.
3. Add Playwright fixture helpers that can run in read-only mode first, then support mutating canary journeys behind an explicit environment flag.
4. Keep existing route smoke as the fast first gate; do not replace it.
5. Add the first automated functional runner for non-mutating `api_health` evidence while preserving `manual_required` for all categories that do not yet have a real runner.
6. Add read-only `runtime_config` functional evidence for central governance policy reads through `/api/panel/limits`, including JSON-path assertions for materialized plan limit keys.

## Execution Commands

- Smoke/list only:
  - `pnpm --dir apps/storefront cert:360:list`
  - `pnpm --dir apps/storefront cert:360:smoke`
- Functional certification:
  - `pnpm --dir apps/storefront cert:360:functional`
  - Requires deployed runtime credentials and `BNS_360_FUNCTIONAL_JOURNEYS=1`.
  - Expected state until mutating functional runners are implemented: fail with `functionalStatus=manual_required` for CRUD, grants, limit mutation and module primary journeys rather than reporting false green.
