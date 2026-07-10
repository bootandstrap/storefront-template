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
- Automated functional runner coverage currently exists for structured `api_health` targets with concrete `/api/...` routes, read-only `runtime_config` targets with JSON-path assertions, `limit_enforcement` targets with JSON-path assertions, `crud_journey` for CRM contacts, and route-observable `grant_unlock` targets with JSON-path assertions. Mutable limit changes and module primary journeys remain `manual_required` until implemented as reversible canary journeys.
- The runtime runner can emit a reusable aggregate evidence artifact when `BNS_360_EVIDENCE_PATH` is set. The artifact schema is `bootandstrap.template.bns-360.runtime-evidence/v1` and records the template commit, non-secret tenant reference, base URL, per-scenario execution mode, route status, functional status, checked paths, redacted credential state, pass/fail and cleanup status without full response bodies.
- Lane 1 deployed runtime health was proven from the BSWEB control plane on `2026-07-08` using canary `ops-live-202607081954` / tenant `934ac146-4498-47f0-89c8-b78383acf95f`.
  - Runtime proof artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-lane1-runtime-health-20260708T2022Z.json` (`pass=true`).
  - Cleanup proof artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-lane1-cleanup-closure-20260708T2040Z.json` (`pass=true`).
  - Canonical residue proof after cleanup: tenants/config/profiles/async_jobs/module_orders all `0`.
- Deployed functional limits were proven from the BSWEB control plane on `2026-07-10` using stable canary slot `ops-fullcat-202607091146` / tenant `c2955b8f-d0e3-4969-ade1-37b29e9cbbb7`, deployed from template commit `d78a0a23`.
  - Runtime aggregate artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-runtime-ops-fullcat-202607091146-202607101607.json`.
  - Full sanitized drill artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-functional-limits-drill-20260710T160748Z.jsonl`.
  - Verified scenarios: `governance.central_policy_read`, `commerce.modules_marketplace_and_limits`, `module.capacidad`, `module.chatbot`.
  - Playwright result: `4/4` passed with `functionalStatus=verified`, real owner authentication, non-localhost base URL, `/api/panel/limits`, `/api/panel/vault` and `/api/chat/usage` JSON-path checks.
  - Canonical cleanup proof: terminal cleanup reached `finalState=verified`, deletion run `bfe4e97b-cf6c-42fc-924e-6fe9c255c020` reached `deleted`, and residue was `0` across tenants/config/profiles/async_jobs/module_orders.
- Deployed chatbot primary journey was proven from the BSWEB control plane on `2026-07-10` using disposable canary `ops-fullcat-202607091146` / tenant `ad00eda8-12a6-450c-8870-57a4b00150d7`, deployed from template commit `c4ac70b0`.
  - Runtime aggregate artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-runtime-ops-fullcat-202607091146-202607102211.json`.
  - Full sanitized drill artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-functional-chatbot-primary-stable-a-20260710T221142Z.jsonl`.
  - Remote template publication: Template Sync `29126906368`, Docker Build & Deploy `29126906407`.
  - Verified scenario: `module.chatbot` with `module_primary_journey`.
  - Playwright result: `1/1` passed with `functionalStatus=verified`, real owner authentication and non-localhost base URL.
  - Journey proof: the owner-authenticated module config boundary updated chatbot name, welcome message and auto-open delay; the runtime projection observed the update; rollback restored the initial config; `/api/chat/usage` preserved a real monthly limit.
  - Canonical cleanup proof: terminal cleanup reached `finalState=verified`, deletion run `1b40ea60-1901-401a-9fe5-283947d2896b` reached `deleted`, and residue was `0` across tenants/config/profiles/async_jobs/module_orders.

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
- Deployed proof on `2026-07-10` verified the read-only policy and limits lane against `https://ops-fullcat-202607091146.bootandstrap.com` with real owner authentication. This keeps Lane 2 `in_progress` because the mutable lock/unlock/materialization half is still assigned to Lane 3.

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
- `/api/module-purchase` source contracts now prove the storefront proxy:
  - maps semantic module/tier selection to a BSWEB `product_key`;
  - sends the resolved `tenant_id`, currency, billing interval, idempotency key and tenant-origin return URLs;
  - fails closed when `BSWEB_INTERNAL_API_TOKEN` is absent;
  - blocks dependent modules unless central active grants satisfy reusable module requirements;
  - propagates BSWEB commercial checkout conflicts without writing local grant state.
- The broad commerce checkout/grants replay remains `manual_required` until a deployed canary can execute a reversible central grant flow and observe materialized limits end to end.
- The `2026-07-10` focused functional-limits deployment intentionally excluded the `central grants materialized` target. The published limit probe for `commerce.modules_marketplace_and_limits` is verified through `/api/panel/limits?resources=products,categories,badges`; reversible grant lock/unlock must not be inferred from that artifact.
- Source state for the first low-risk grant unlock path now declares `module.auth_advanced` as an automated `grant_unlock` target through `/api/panel/modules/grants/self-test?required=auth_advanced`. It expects `status=verified`, `summary.requiredCount=1` and `summary.missingCount=0` after the control-plane runner applies and materializes `module.auth_advanced.enterprise`.
- Deployed grant unlock proof on `2026-07-10` verified template commit `218b3063` (`Fix grants self-test authorization source`) against stable validation slot `ops-fullcat-202607091146`. BSWEB applied a manual BNS 360 grant for `module.auth_advanced.enterprise`, materialized capabilities without redeploy, verified `/api/panel/modules/grants/self-test?required=auth_advanced` through Playwright `module.auth_advanced` `1/1`, replayed the same grant idempotently, rolled it back, and proved residue zero before terminal tenant cleanup. Earlier same-day attempts remain non-closure evidence only: the disposable hostname run blocked at `medusa_tls`, and the first stable-slot run exposed that this self-test must read authorized panel config rather than direct anon table reads.

### Lane 4: Module Primary Journeys

Status: `in_progress`

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

Source harness state:

- The BNS 360 module route matrix is now contract-checked against `MODULE_SETUP_REGISTRY` quick actions so module certification routes cannot drift from the actual owner setup surface.
- This caught and fixed real drift:
  - `i18n` now follows `/es/panel/ajustes?tab=idiomas` instead of stale `tab=tienda`.
  - `seo` now follows `/es/panel/ajustes?tab=analiticas` instead of the stale standalone analytics route.
- This remains source-route alignment, not deployed CRUD/primary-journey proof.
- Deployed proof on `2026-07-10` verified the current non-mutating primary-adjacent limit probes for:
  - `module.capacidad`: `/api/panel/vault` health plus `usage.total.mb`, `limit_mb`, `usage_percent`.
  - `module.chatbot`: authenticated `/api/chat/usage` with `messageCount`, `limit`, `authenticated`.
  These are deployed functional limit probes, not mutable module primary journeys.
- Source runner state on `2026-07-10`: `module.chatbot` now declares an automated reversible `module_primary_journey` through owner-authenticated `POST /api/panel/bns-360/chatbot-primary`. The runner uses the same tenant-scoped RLS boundary as panel module configuration, performs a durable read of only chatbot config fields plus `max_chatbot_messages_month`, updates chatbot name/welcome/auto-open delay, verifies runtime projection, rolls back in `finally`, and emits redacted evidence.
- Deployed chatbot primary drill on `2026-07-10` against disposable canary `ops-fullcat-202607091146` verified update/read/runtime projection/rollback for `module.chatbot` with zero tenant residue after cleanup. Earlier same-day attempts remain non-closure evidence only: the first route version used the wrong config write boundary, and the intermediate durable-read fix still exposed that the RPC returned success without materializing module fields.
- Source runner state on `2026-07-10`: `module.crm` now declares an automated reversible `crud_journey` through owner-authenticated `POST /api/panel/bns-360/crm-crud`. The runner creates a unique Medusa customer contact, reads it by email, updates metadata, verifies the durable update, deletes it, and proves zero residue in `finally`. Local verification is green for the BNS 360 matrix, the CRM CRUD runner and the endpoint contract (`44/44` focused Vitest), plus `npm run type-check`, `npm run lint`, `npm run cert:360:list`, `git diff --check` and `sentrux gate .`.
- Deployed CRM drill on `2026-07-10` against disposable canary `ops-live-202607101737` verified create/read/update/delete through Medusa Admin, zero contact residue, and terminal tenant cleanup after `7f70c5fe` fixed durable customer detail fields. This closes the first deployed reversible CRUD proof for `module.crm`; it does not certify other module CRUD journeys.

### Lane 5: Full Catalog Combination

Status: `in_progress`

Evidence target:

- full-catalog tenant profile at highest published tier per module.

Required proof:

- all module routes load under one tenant;
- no route or config collision;
- dependency constraints are satisfied;
- POS and kiosk coexist;
- limits merge by max where multiple modules affect the same limit.

Source harness state:

- `full_catalog_highest_tier` still pins every reusable module to its highest published tier.
- The profile now runs as a combined tenant profile instead of isolated module pages only:
  - `governance.central_policy_read`
  - `commerce.modules_marketplace_and_limits`
  - `pos.core_checkout`
  - `pos.offline_sync`
  - `pos.refunds_and_history`
  - all `module.*` scenarios, including `module.pos` and `module.pos_kiosk`.
- This proves the intended certification envelope at source level. It does not yet prove deployed no-collision behavior under a fresh full-catalog tenant.

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
7. Harden `/api/module-purchase` source contracts for semantic BSWEB checkout initiation, dependency gates, missing internal token behavior and BSWEB error propagation.
8. Contract-check BNS 360 module runtime routes against `MODULE_SETUP_REGISTRY` quick actions and remove stale i18n/SEO route hints.
9. Expand `full_catalog_highest_tier` from isolated module route coverage to a combined profile that includes central governance, commerce and POS/kiosk coexistence scenarios.
10. Emit aggregate deployed runtime evidence through `BNS_360_EVIDENCE_PATH` for focused functional runs, and support filtering automated evidence kinds so a limit-only batch does not claim grants certification.
11. Verify the published limit probes against a deployed stable-slot canary: `governance.central_policy_read`, `commerce.modules_marketplace_and_limits`, `module.capacidad` and `module.chatbot` all reached `functionalStatus=verified` on `2026-07-10`.
12. Add the first mutable chatbot primary journey and verify it deployed: `module.chatbot` reached `functionalStatus=verified` for `module_primary_journey` on `2026-07-10` with rollback and terminal cleanup proven.
13. Add the first reversible module CRUD runner for CRM contacts, using owner-authenticated panel boundaries and tenant-scoped Medusa customer APIs with cleanup verification.
14. Declare the first route-observable `grant_unlock` contract for `module.auth_advanced`, scoped to a control-plane runner that applies a manual BNS 360 product grant, materializes capabilities, verifies `/api/panel/modules/grants/self-test?required=auth_advanced`, replays idempotently, and rolls back before tenant cleanup.
15. Close the first deployed `grant_unlock` proof for `module.auth_advanced` on `2026-07-10`: template source fix `218b3063`, Template Sync `29115569397`, Docker Build & Deploy `29115569391`, stable-slot artifact `bns-360-template-functional-grants-stable-a-20260710T184737Z.jsonl`, aggregate runtime evidence `bns-360-template-runtime-ops-fullcat-202607091146-202607101847.json`, logical rollback verified, terminal cleanup deletion run `1931a2c8-3c31-4e56-87fb-b79cd1bb3e70` `deleted`, residue `0`.

## Execution Commands

- Smoke/list only:
  - `pnpm --dir apps/storefront cert:360:list`
  - `pnpm --dir apps/storefront cert:360:smoke`
- Functional certification:
  - `pnpm --dir apps/storefront cert:360:functional`
  - Requires deployed runtime credentials and `BNS_360_FUNCTIONAL_JOURNEYS=1`.
  - Expected state until mutating functional runners are implemented: fail with `functionalStatus=manual_required` for CRUD, grants, limit mutation and module primary journeys rather than reporting false green.
