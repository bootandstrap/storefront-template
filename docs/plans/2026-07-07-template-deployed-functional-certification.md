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
- Automated functional runner coverage currently exists for structured `api_health` targets with concrete `/api/...` routes, read-only `runtime_config` targets with JSON-path assertions, `limit_enforcement` targets with JSON-path assertions, `crud_journey` targets for CRM contacts and ecommerce products, route-observable `grant_unlock` targets with JSON-path assertions, and reversible `module_primary_journey` targets for `module.chatbot`, `module.i18n`, `module.seo`, `module.rrss`, `module.automation`, `module.email_marketing`, `module.ecommerce` and `module.sales_channels`. Mutable limit changes and remaining module primary journeys remain `manual_required` until implemented as reversible canary journeys.
- 2026-07-16 correction: checkout PaymentCollection, customer account, order lifecycle and backup/restore endpoints must not report `verified` from placeholder code. Until they are wired to real runtime/simulator runners, `runBns360CheckoutPrimaryJourney`, `runBns360CustomerAccountPrimaryJourney`, `runBns360OrderLifecyclePrimaryJourney` and `runBns360BackupRestorePrimaryJourney` return `blocked`. The root command `pnpm bns:360:functional:canary` is available and is expected to fail while these runners remain blocked.
- 2026-07-16 correction: the `fresh-produce` template now enforces `max_payment_methods >= 2` so a Campifruit-style tenant can expose WhatsApp plus at least one programmable checkout method such as cash-on-delivery simulator instead of silently truncating to WhatsApp only.
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
- Deployed i18n primary journey was proven from the BSWEB control plane on `2026-07-10` using disposable canary `ops-fullcat-202607091146` / tenant `a8b8034b-2e79-47d9-822d-7e0c60055e30`, deployed from template commit `6570e2b5`.
  - Runtime aggregate artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-runtime-ops-fullcat-202607091146-202607102300.json`.
  - Full sanitized drill artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-functional-i18n-primary-stable-a-20260710T230110Z.jsonl`.
  - Remote template publication: Template Sync `29129170029`, Docker Build & Deploy `29129170018`.
  - Verified scenario: `module.i18n` with `module_primary_journey`.
  - Playwright result: `1/1` passed with `functionalStatus=verified`, real owner authentication and non-localhost base URL.
  - Journey proof: the owner-authenticated config boundary changed language/storefront language to `de`, default currency to `chf`, observed localized render through `/de`, rolled back, and kept evidence redacted. The final implementation uses a loopback render fallback only when the container cannot self-fetch its public hostname; earlier artifacts `20260710T223650Z` and `20260710T224850Z` remain non-closure evidence for the public self-fetch/hairpin diagnosis.
  - Canonical cleanup proof: terminal cleanup reached `finalState=verified`, deletion run `bfdb8e58-73ae-4c2d-ac2e-543f1ca302c4` reached `deleted`, and residue was `0` across tenants/config/profiles/async_jobs/module_orders.
- Deployed SEO primary journey was proven from the BSWEB control plane on `2026-07-11` using disposable canary `ops-fullcat-202607091146` / tenant `628a65d1-79cc-4f73-9b86-496587fd5996`, deployed from template commit `95161a43`.
  - Runtime aggregate artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-runtime-ops-fullcat-202607091146-202607111143.json`.
  - Full sanitized drill artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-functional-seo-primary-stable-a-20260711T114337Z.jsonl`.
  - Remote template publication: Template Sync `29151184317`, Docker Build & Deploy `29151184300`.
  - Verified scenario: `module.seo` with `module_primary_journey`.
  - Playwright result: `1/1` passed with `functionalStatus=verified`, real owner authentication and non-localhost base URL.
  - Journey proof: the owner-authenticated config boundary changed `metaTitle` and `metaDescription`, observed public `/es` metadata (`title`, `description`, `og:title`, `og:description`), rolled back, and kept evidence redacted.
  - Materialization fix: template source `8f91b59b` added the SEO primary runner, and `95161a43` aligned the reusable contract so SEO tiers with `enable_seo_tools` also materialize base `enable_seo`; the BSWEB central `module_flag_map` seed was reapplied with `seo/medio` and `seo/avanzado` at `3` flags.
  - Canonical cleanup proof: terminal cleanup reached `finalState=verified`, deletion run `85858cee-3887-4465-bfda-1e178003adf2` reached `deleted`, and residue was `0` across tenants/config/profiles/async_jobs/module_orders.
- Deployed RRSS primary journey was proven from the BSWEB control plane on `2026-07-11` using disposable canary `ops-fullcat-202607091146` / tenant `f0ffaf16-04b7-43f9-8265-8aebfa6e4d12`, deployed from template commit `dbd7350d`.
  - Runtime aggregate artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-runtime-ops-fullcat-202607091146-202607111253.json`.
  - Full sanitized drill artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-functional-rrss-primary-stable-a-20260711T125345Z.jsonl`.
  - Post-run cleanup proof: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-functional-rrss-primary-cleanup-proof-20260711T125935Z.json`.
  - Remote template publication: Template Sync `29153235130`, Docker Build & Deploy `29153235116` rerun, Governance Quality Gate `29167660171`.
  - Verified scenario: `module.rrss` with `module_primary_journey`.
  - Playwright result: `1/1` passed with `functionalStatus=verified`, real owner authentication and non-localhost base URL.
  - Journey proof: the owner-authenticated endpoint `POST /api/panel/bns-360/rrss-primary` changed social Facebook and Instagram links, read the persisted runtime projection, observed public JSON-LD `sameAs`, rolled back, and kept evidence redacted.
  - Source chain: `6fbae784` added the RRSS primary runner, `58e006c1` reduced runner complexity for Sentrux, `0dc1884b` aligned the endpoint/runner with deployed `config.social_facebook` and `config.social_instagram` columns, and `dbd7350d` removed stale `runtime.socialTiktok` evidence expectations.
  - Cleanup proof: the drill JSONL timed out while polling cleanup with a stale `terminating` snapshot, but post-run verification records deletion run `47365b98-c573-490a-a0ce-77da50df8f73` as `deleted`; Dokploy/GitHub/auth/Supabase cleanup systems were `ok`, and residue was `0` across tenants/config/profiles/async_jobs/module_orders.
- Deployed automation primary journey was proven from the BSWEB control plane on `2026-07-11` using disposable canary `ops-fullcat-202607091146`, deployed from template commit `9672534a`.
  - Runtime aggregate artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-runtime-ops-fullcat-202607091146-202607112121.json`.
  - Full sanitized drill artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-functional-automation-primary-stable-a-20260711T212143Z.jsonl`.
  - Earlier non-closure artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-functional-automation-primary-stable-a-20260711T210631Z.jsonl` exposed the missing deployed `config.notification_channels`/`config.notification_events` columns before the schema migration.
  - Remote template publication: Template Sync `29168123236`, Docker Build & Deploy `29168123276` for `c1842bbf`; Template Sync `29168578974`, Docker Build & Deploy `29168578975` for `9672534a`.
  - Verified scenario: `module.automation` with `module_primary_journey`.
  - Playwright result: `1/1` passed with `functionalStatus=verified`, real owner authentication and non-localhost base URL.
  - Journey proof: the owner-authenticated endpoint `POST /api/panel/bns-360/automation-primary` changed notification channel and event mapping config, read the persisted runtime projection with webhook host and secret redacted, proved `order.placed` mapping, rolled back, and did not send an external notification.
  - Source chain: `c1842bbf` added the automation primary runner and BNS 360 matrix target; `9672534a` added `config.notification_channels`/`config.notification_events` JSONB columns and `update_owner_config` allowlist support. The live Supabase schema was migrated on `2026-07-11`.
  - Cleanup proof: terminal cleanup reached `finalState=verified`, deletion run `49cc7425-47e5-45cf-bfa1-c308f50b9b28` reached `deleted`, and residue was `0` across tenants/config/profiles/async_jobs/module_orders.
- Deployed email marketing primary journey was proven from the BSWEB control plane on `2026-07-12` using disposable canary `ops-fullcat-202607091146` / tenant `a647a6d8-31e0-47c5-a65e-5f2501a63eae`, deployed from template commit `4e49abc3`.
  - Runtime aggregate artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-runtime-ops-fullcat-202607091146-202607120007.json`.
  - Full sanitized drill artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-functional-email-marketing-primary-stable-a-20260712T000728Z.jsonl`.
  - Earlier non-closure artifacts: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-functional-email-marketing-primary-stable-a-20260711T214721Z.jsonl` exposed the initial deployed timeout under the wrong data boundary, and `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-functional-email-marketing-primary-stable-a-20260711T235214Z.jsonl` exposed that `email_preferences`/`email_automation_config` are service-only RLS tables while the first fix still used the anon `createAdminClient()`.
  - Remote template publication: Template Sync `29169320623`, Docker Build & Deploy `29169320626` for `bc3bb700`; Template Sync `29172741417`, Docker Build & Deploy `29172741439` for `faca933f`; Template Sync `29173156867`, Docker Build & Deploy `29173156875` for `4e49abc3` (`Build Storefront` job `86597518455`, `Deploy to Dokploy` job `86597636532`).
  - Verified scenario: `module.email_marketing` with `module_primary_journey`.
  - Playwright result: `1/1` passed with `functionalStatus=verified`, real owner authentication and non-localhost base URL.
  - Journey proof: the owner-authenticated endpoint `POST /api/panel/bns-360/email-marketing-primary` changed email preferences and automation config, read the persisted runtime projection including `max_email_sends_month`, rolled back, and kept provider secrets redacted. No external email was sent; external delivery remains `manual_required`.
  - Source chain: `bc3bb700` added the email marketing primary runner and matrix target, `faca933f` diagnosed the service-only table boundary, and `4e49abc3` switched the certification data client to a server-only privileged boundary guarded by owner auth and tenant-scoped filters.
  - Cleanup proof: terminal cleanup reached `finalState=verified`, deletion run `0d9f60fa-a379-4994-bdf5-c2041002de90` reached `deleted`, and residue was `0` across tenants/config/profiles/async_jobs/module_orders.
- Deployed ecommerce primary journey was proven from the BSWEB control plane on `2026-07-12` using disposable canary `ops-fullcat-202607091146` / tenant `ad0a73d1-0fc3-4541-af2e-012cb5a397ec`, deployed from template commit `482935a5`.
  - Runtime aggregate artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-runtime-ops-fullcat-202607091146-202607120042.json`.
  - Full sanitized drill artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-functional-ecommerce-primary-stable-a-20260712T004249Z.jsonl`.
  - Earlier non-closure artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-functional-ecommerce-primary-stable-a-20260712T002947Z.jsonl` exposed that Medusa product creation must include an explicit `sales_channels` association and product/variant options rather than relying only on tenant scope headers.
  - Remote template publication: Template Sync `29173714260`, Docker Build & Deploy `29173714208` for `de2dd624`; Template Sync `29174076496`, Docker Build & Deploy `29174076509` for `482935a5`.
  - Verified scenario: `module.ecommerce` with `crud_journey` and `module_primary_journey`.
  - Playwright result: `1/1` passed with `functionalStatus=verified`, real owner authentication and non-localhost base URL.
  - Journey proof: the owner-authenticated endpoint `POST /api/panel/bns-360/ecommerce-primary` created a unique draft Medusa product in the tenant sales channel, read it by handle, updated title/metadata, verified the durable update, deleted it, and proved zero product residue. The route also exercised the public catalog/panel routes declared for `module.ecommerce`.
  - Source chain: `de2dd624` added the ecommerce primary runner, endpoint and BNS 360 matrix target; `482935a5` aligned the product payload with the deployed Medusa v2 boundary by adding explicit `sales_channels`, product options and variant options.
  - Cleanup proof: terminal cleanup reached `finalState=verified`, deletion run `b00d6fd3-58ae-42fc-9b2c-c548bf5a300b` reached `deleted`, and residue was `0` across tenants/config/profiles/async_jobs/module_orders.
- Deployed sales channels primary journey was proven from the BSWEB control plane on `2026-07-13` using disposable canary `ops-live-202607130154` / tenant `cc41e90c-46f8-458b-8594-2e24c7108218`, deployed from template commit `c1181192`.
  - Runtime aggregate artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-runtime-ops-live-202607130154-202607130154.json`.
  - Earlier non-closure artifacts: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-functional-sales-channels-primary-stable-a-20260712T142900Z.jsonl` exposed the missing email-auth substrate when only `sales_channels.basic` was provisioned, and `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-functional-sales-channels-primary-stable-a-20260712T143900Z.jsonl` exposed that central `module_flag_map` lacked `enable_sales_channels`, causing the panel guard to fail before the runner.
  - Remote template publication: Template Sync `29218243287`, Docker Build & Deploy `29218243292`, Governance Quality Gate `29218243279`.
  - Verified scenario: `module.sales_channels` with `module_primary_journey`.
  - Playwright result: `1/1` passed with `functionalStatus=verified`, real owner authentication and non-localhost base URL.
  - Journey proof: the owner-authenticated endpoint `POST /api/panel/bns-360/sales-channels-primary` changed sales channel config fields, projected payment/channel runtime state through existing payment method rules and `max_payment_methods`, rolled back, and kept the WhatsApp greeting redacted. No payment, Stripe live flow or external message was executed.
  - Source chain: `83965da0` added the sales channels primary runner, endpoint and BNS 360 matrix target; `c1181192` aligned the reusable contract so sales channel tiers materialize the base `enable_sales_channels` panel capability. The BSWEB central `module_flag_map` was patched for `sales_channels` rows so deployed canary materialization includes the same flag.
  - Cleanup proof: terminal cleanup reached `finalState=verified`, deletion run `ea81976c-38ab-4c7e-b4d6-1867d01c8ed0` reached `deleted`, and residue was `0` across tenants/config/profiles/async_jobs/module_orders.
- Deployed POS and POS kiosk primary journey was proven from the BSWEB control plane on `2026-07-13` using disposable canary `ops-live-202607130227` / tenant `e238a261-1e46-4ec9-8e51-22f98fe99f47`, deployed from template commit `77bae2e5`.
  - Runtime aggregate artifact: `BOOTANDSTRAP_WEB/artifacts/production-mvp/bns-360-template-runtime-ops-live-202607130227-202607130227.json`.
  - Remote template publication: Template Sync `29219443142` and Docker Build & Deploy `29219443115` passed for `77bae2e5`; Build & Deploy Storefront `29219443176`, CI `29219443146`, Lighthouse Build Audit `29219443178` and Lighthouse Deploy Audit `29219445295` were skipped.
  - Verified scenarios: `module.pos` and `module.pos_kiosk` with `module_primary_journey`.
  - Playwright result: `2/2` passed with `functionalStatus=verified`, real owner authentication and non-localhost base URL.
  - Journey proof: the owner-authenticated endpoint `POST /api/panel/bns-360/pos-primary` verified a POS cart, payment method materialization through `max_pos_payment_methods`, virtual receipt printing and cash-drawer pulse, plus kiosk capability flags, without creating Medusa orders, executing payments, issuing refunds, requiring physical hardware or calling external providers.
  - Source chain: `77bae2e5` added the POS primary runner, endpoint, route contract tests and BNS 360 matrix targets for `module.pos` and `module.pos_kiosk`.
  - Cleanup proof: terminal cleanup reached `finalState=verified`, deletion run `0ca94611-eec1-4b6c-9c87-de6ab27a5cd0` reached `deleted`, and residue was `0` across tenants/config/profiles/async_jobs/module_orders.

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
- Source runner state on `2026-07-10`: `module.i18n` now declares an automated reversible `module_primary_journey` through owner-authenticated `POST /api/panel/bns-360/i18n-primary`. The runner uses the tenant-scoped config RLS boundary, performs durable reads of i18n config plus language/currency plan limits, changes language/storefront language to `de` and default currency to `chf`, observes `/de` render, rolls back in `finally`, and emits redacted evidence.
- Deployed i18n primary drill on `2026-07-10` against disposable canary `ops-fullcat-202607091146` verified update/read/render/rollback for `module.i18n` with zero tenant residue after cleanup. Earlier same-day attempts remain non-closure evidence only: they exposed public-host self-fetch limitations inside the deployed container and led to the loopback render fallback used by `6570e2b5`.
- Source runner state on `2026-07-11`: `module.seo` now declares an automated reversible `module_primary_journey` through owner-authenticated `POST /api/panel/bns-360/seo-primary`. The runner uses the tenant-scoped config RLS boundary, performs durable reads of SEO metadata fields only, changes `metaTitle`/`metaDescription`, observes public metadata render on `/es`, rolls back in `finally`, and emits redacted evidence.
- Deployed SEO primary drill on `2026-07-11` against disposable canary `ops-fullcat-202607091146` verified metadata update/read/public-render/rollback for `module.seo` with zero tenant residue after cleanup. The first deployed attempt `bns-360-template-functional-seo-primary-stable-a-20260711T094750Z.jsonl` remains non-closure evidence only: it exposed that central SEO tier materialization had `enable_seo_tools` without the base `enable_seo` panel capability.
- Source runner state on `2026-07-11`: `module.rrss` declares an automated reversible `module_primary_journey` through owner-authenticated `POST /api/panel/bns-360/rrss-primary`; deployed proof verified social link update/read/public JSON-LD observation/rollback for `module.rrss` with zero residue after cleanup.
- Source runner state on `2026-07-11`: `module.automation` declares an automated reversible `module_primary_journey` through owner-authenticated `POST /api/panel/bns-360/automation-primary`. The runner uses tenant-scoped config columns for notification channels and events, changes a redacted webhook channel plus `order.placed` mapping, verifies persisted runtime projection, rolls back in `finally`, and emits redacted evidence without sending an external notification.
- Deployed automation primary drill on `2026-07-11` against disposable canary `ops-fullcat-202607091146` verified notification config update/read/runtime projection/rollback for `module.automation` with zero tenant residue after cleanup. The first deployed attempt `bns-360-template-functional-automation-primary-stable-a-20260711T210631Z.jsonl` remains non-closure evidence only: it exposed the missing deployed notification config columns before `9672534a` and the live schema migration.
- Source runner state on `2026-07-12`: `module.email_marketing` declares an automated reversible `module_primary_journey` through owner-authenticated `POST /api/panel/bns-360/email-marketing-primary`. The runner uses tenant-scoped service-only email config tables through a server-only privileged boundary, changes email preferences and automations, verifies persisted runtime projection plus `max_email_sends_month`, rolls back in `finally`, and emits redacted evidence without reading provider secrets or sending external email.
- Deployed email marketing primary drill on `2026-07-12` against disposable canary `ops-fullcat-202607091146` verified email preference and automation update/read/runtime projection/rollback for `module.email_marketing` with zero tenant residue after cleanup. The earlier deployed attempts `bns-360-template-functional-email-marketing-primary-stable-a-20260711T214721Z.jsonl` and `bns-360-template-functional-email-marketing-primary-stable-a-20260711T235214Z.jsonl` remain non-closure evidence only for the timeout and service-only RLS boundary diagnosis.
- Source runner state on `2026-07-12`: `module.ecommerce` declares an automated reversible `crud_journey` and `module_primary_journey` through owner-authenticated `POST /api/panel/bns-360/ecommerce-primary`. The runner uses the tenant Medusa scope, creates a unique draft product with explicit sales-channel attachment and optioned variant, reads it by handle, updates title/metadata, verifies the durable update, deletes it in `finally`, and emits redacted evidence with residue zero.
- Deployed ecommerce primary drill on `2026-07-12` against disposable canary `ops-fullcat-202607091146` verified Medusa product create/read/update/delete plus catalog/panel route observation for `module.ecommerce` with zero tenant residue after cleanup. The earlier deployed attempt `bns-360-template-functional-ecommerce-primary-stable-a-20260712T002947Z.jsonl` remains non-closure evidence only for the missing sales-channel/options payload diagnosis.
- Source runner state on `2026-07-13`: `module.sales_channels` declares an automated reversible `module_primary_journey` through owner-authenticated `POST /api/panel/bns-360/sales-channels-primary`. The runner reads only sales channel config plus payment feature flags and `max_payment_methods`, changes non-secret channel config, verifies runtime payment/channel projection, rolls back in `finally`, and emits redacted evidence without executing payments or external messages.
- Deployed sales channels primary drill on `2026-07-13` against disposable canary `ops-live-202607130154` verified sales channel config update/read/runtime projection/rollback for `module.sales_channels` with zero tenant residue after cleanup. The earlier deployed attempts `bns-360-template-functional-sales-channels-primary-stable-a-20260712T142900Z.jsonl` and `bns-360-template-functional-sales-channels-primary-stable-a-20260712T143900Z.jsonl` remain non-closure evidence only for the missing auth substrate and missing central `enable_sales_channels` materialization diagnosis.
- Source runner state on `2026-07-13`: `module.pos` and `module.pos_kiosk` declare automated reversible `module_primary_journey` targets through owner-authenticated `POST /api/panel/bns-360/pos-primary`. The runner reads materialized feature flags and `max_pos_payment_methods`, composes a virtual POS cart, verifies allowed payment methods, prints a virtual receipt, pulses the virtual cash drawer, reports kiosk flags, and emits redacted evidence without creating Medusa orders, payments, refunds or external-provider side effects.
- Deployed POS/POS kiosk primary drill on `2026-07-13` against disposable canary `ops-live-202607130227` verified `module.pos` and `module.pos_kiosk` with zero tenant residue after cleanup. This extends the earlier POS virtual lab closure from `pos.core_checkout` to deployed module primary journey evidence; it does not claim physical POS hardware or provider payment certification.
- Source runner state on `2026-07-10`: `module.crm` now declares an automated reversible `crud_journey` through owner-authenticated `POST /api/panel/bns-360/crm-crud`. The runner creates a unique Medusa customer contact, reads it by email, updates metadata, verifies the durable update, deletes it, and proves zero residue in `finally`. Local verification is green for the BNS 360 matrix, the CRM CRUD runner and the endpoint contract (`44/44` focused Vitest), plus `npm run type-check`, `npm run lint`, `npm run cert:360:list`, `git diff --check` and `sentrux gate .`.
- Deployed CRM drill on `2026-07-10` against disposable canary `ops-live-202607101737` verified create/read/update/delete through Medusa Admin, zero contact residue, and terminal tenant cleanup after `7f70c5fe` fixed durable customer detail fields. This closes the first deployed reversible CRUD proof for `module.crm`; it does not certify other module CRUD journeys.

### Lane 5: Full Catalog Combination

Status: `verified_scope`

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
- Template commit `7f1e42fa` (`Harden BNS 360 route loading probe`) fixes the
  deployed route-loading harness so rendered commerce pages do not fail
  certification solely because `load` waits on slow external resources.
  Verification before publish: focused BNS 360 matrix Vitest `48/48`,
  `npm run type-check`, `npm run lint`, `npm run cert:360:list` (`27`
  scenarios), `npm run test:run` (`1622` tests), `npm run build`,
  `git diff --check`, and `sentrux gate .` (`Quality 6289 -> 6329`, cycles
  `0`). Remote Template Sync `29238550794` and Docker Build & Deploy
  `29238550814` passed.
- Deployed full-catalog functional composition was proven from BSWEB on
  `2026-07-13` against disposable canary `ops-live-202607130944` using
  non-localhost runtime `https://ops-live-202607130944.bootandstrap.com`, real
  owner authentication, and template commit `7f1e42fa`. Runtime aggregate
  evidence:
  `artifacts/production-mvp/bns-360-template-runtime-ops-live-202607130944-202607130944.json`.
  Playwright `15/15` passed for governance policy, marketplace/limits,
  `auth_advanced`, `automation`, `capacidad`, `chatbot`, `crm`, `ecommerce`,
  `email_marketing`, `i18n`, `pos`, `pos_kiosk`, `rrss`, `sales_channels` and
  `seo`, each with `executionMode=functional` and
  `functionalStatus=verified`. Terminal cleanup deletion run
  `8a025f8c-4fd6-4c6a-bbd3-fee49771a611` reached `deleted` with residue `0`
  across tenants/config/profiles/async_jobs/module_orders.
- This closes the deployed full-catalog functional composition scope for the
  automated BNS 360 scenarios in the current matrix. It does not claim
  `full 360 green`: `external_alert_delivery`, `eur_annual_catalog` and
  `live_catalog_publication` remain outside this proof.

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
16. Add and deploy the reversible i18n primary journey: `module.i18n` reached `functionalStatus=verified` on `2026-07-10` from template commit `6570e2b5`, Template Sync `29129170029`, Docker Build & Deploy `29129170018`, stable-slot artifact `bns-360-template-functional-i18n-primary-stable-a-20260710T230110Z.jsonl`, aggregate runtime evidence `bns-360-template-runtime-ops-fullcat-202607091146-202607102300.json`, rollback verified, terminal cleanup deletion run `bfdb8e58-73ae-4c2d-ac2e-543f1ca302c4` `deleted`, residue `0`.
17. Add and deploy the reversible SEO primary journey: `module.seo` reached `functionalStatus=verified` on `2026-07-11` from template commit `95161a43`, Template Sync `29151184317`, Docker Build & Deploy `29151184300`, stable-slot artifact `bns-360-template-functional-seo-primary-stable-a-20260711T114337Z.jsonl`, aggregate runtime evidence `bns-360-template-runtime-ops-fullcat-202607091146-202607111143.json`, rollback verified, terminal cleanup deletion run `85858cee-3887-4465-bfda-1e178003adf2` `deleted`, residue `0`.
18. Add and deploy the reversible RRSS primary journey: `module.rrss` reached `functionalStatus=verified` on `2026-07-11` from template commit `dbd7350d`, Template Sync `29153235130`, Docker Build & Deploy `29153235116` rerun, Governance Quality Gate `29167660171`, stable-slot artifact `bns-360-template-functional-rrss-primary-stable-a-20260711T125345Z.jsonl`, aggregate runtime evidence `bns-360-template-runtime-ops-fullcat-202607091146-202607111253.json`, rollback verified, post-run cleanup proof deletion run `47365b98-c573-490a-a0ce-77da50df8f73` `deleted`, residue `0`.
19. Add and deploy the reversible automation primary journey: `module.automation` reached `functionalStatus=verified` on `2026-07-11` from template commit `9672534a`, Template Sync `29168578974`, Docker Build & Deploy `29168578975`, stable-slot artifact `bns-360-template-functional-automation-primary-stable-a-20260711T212143Z.jsonl`, aggregate runtime evidence `bns-360-template-runtime-ops-fullcat-202607091146-202607112121.json`, rollback verified, cleanup deletion run `49cc7425-47e5-45cf-bfa1-c308f50b9b28` `deleted`, residue `0`. External alert delivery remains `manual_required`; this journey proves config persistence/redaction only.
20. Add and deploy the reversible email marketing primary journey: `module.email_marketing` reached `functionalStatus=verified` on `2026-07-12` from template commit `4e49abc3`, Template Sync `29173156867`, Docker Build & Deploy `29173156875`, stable-slot artifact `bns-360-template-functional-email-marketing-primary-stable-a-20260712T000728Z.jsonl`, aggregate runtime evidence `bns-360-template-runtime-ops-fullcat-202607091146-202607120007.json`, rollback verified, cleanup deletion run `0d9f60fa-a379-4994-bdf5-c2041002de90` `deleted`, residue `0`. External email delivery remains `manual_required`; this journey proves config persistence/redaction only.
21. Add and deploy the reversible sales channels primary journey: `module.sales_channels` reached `functionalStatus=verified` on `2026-07-13` from template commit `c1181192`, Template Sync `29218243287`, Docker Build & Deploy `29218243292`, Governance Quality Gate `29218243279`, aggregate runtime evidence `bns-360-template-runtime-ops-live-202607130154-202607130154.json`, rollback verified, cleanup deletion run `ea81976c-38ab-4c7e-b4d6-1867d01c8ed0` `deleted`, residue `0`. Payments, Stripe live flows and external messages were not executed.
22. Harden deployed route loading and certify the first full-catalog functional
    composition: template commit `7f1e42fa`, Template Sync `29238550794`,
    Docker Build & Deploy `29238550814`, BSWEB runtime evidence
    `bns-360-template-runtime-ops-live-202607130944-202607130944.json`,
    Playwright `15/15`, terminal cleanup deletion run
    `8a025f8c-4fd6-4c6a-bbd3-fee49771a611` `deleted`, residue `0`.
    This is automated full-catalog functional composition evidence only; it
    does not execute external alert delivery, EUR annual catalog decisions,
    Stripe live publication, real payments, refunds or physical POS hardware.

## Execution Commands

- Smoke/list only:
  - `pnpm --dir apps/storefront cert:360:list`
  - `pnpm --dir apps/storefront cert:360:smoke`
- Functional certification:
  - `pnpm --dir apps/storefront cert:360:functional`
  - Requires deployed runtime credentials and `BNS_360_FUNCTIONAL_JOURNEYS=1`.
  - Expected state until mutating functional runners are implemented: fail with `functionalStatus=manual_required` for CRUD, grants, limit mutation and module primary journeys rather than reporting false green.
