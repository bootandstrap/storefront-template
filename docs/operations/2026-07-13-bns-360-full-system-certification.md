# BNS 360 Full-System Certification Runbook

Status: active
Owner repo: ecommerce-template
Last updated: 2026-07-31

This runbook defines what "100% testable" means for the reusable tenant runtime.
It does not authorize live money movement, physical reader payments, live
publication, Stripe Tax, EUR annual catalog decisions, or Sentrux baseline
changes.

## Architecture Baseline

The tenant runtime is Next.js storefront/panel plus Medusa v2 plus Supabase and
Stripe. Certification follows the production ownership boundary:

- Storefront and panel route health are tested through Playwright.
- Reversible tenant runtime mutations are tested through authenticated
  `/api/panel/bns-360/*` probes.
- Medusa product/catalog behavior is tested with tenant-scoped Admin API CRUD
  and cleanup.
- Checkout and payments must follow Medusa PaymentCollection semantics: cart
  checkout links to payment sessions/payments/providers before order completion.
- Stripe webhooks must verify signatures and return fast `2xx` responses before
  slow downstream work.
- POS Terminal certification is split between simulator and physical reader.

Official references used for this boundary:

- Stripe Terminal simulated readers and `card_present` PaymentIntent flow:
  https://docs.stripe.com/terminal/quickstart
- Stripe webhook endpoint testing, signatures and CLI forwarding:
  https://docs.stripe.com/webhooks
- Medusa PaymentCollection with Cart/Payment modules:
  https://docs.medusajs.com/resources/commerce-modules/payment/payment-collection

## Certification Levels

| Level | Scope | Can run now | Evidence | Blocks full physical/live claim |
| --- | --- | --- | --- | --- |
| L0 smoke | public/panel/API route health | yes | route status and owner auth state | no |
| L1 reversible runtime | tenant-safe API probes with cleanup | yes | status, cleanup, zero residue | no |
| L2 simulator/test-mode | Stripe/Terminal/Medusa provider simulator | partial | provider mode, lifecycle steps, no live mutation | no |
| L3 read-only live | live account/config checks only | control plane | account/webhook/tax/catalog readiness | no money moved |
| L4 controlled live drill | real payment and immediate refund | no | redacted payment/refund/accounting evidence | requires human authorization |
| L5 physical POS | real reader, location, pairing, payment/refund | no | reader id/location/lifecycle evidence | requires hardware and human authorization |

## Current Automated Coverage

The reusable BNS 360 matrix currently automates:

- storefront home, catalog and checkout route smoke;
- authenticated panel dashboard, catalog, orders, customers, inventory and
  settings smoke;
- health/readiness/liveness/governance health API probes;
- governance limits and module grant materialization;
- CRM tenant-scoped contact CRUD;
- ecommerce Medusa product create/read/update/delete with cleanup;
- storefront catalog visibility for the temporary ecommerce product;
- POS cart, payment-method selection, receipt/cash drawer virtual print and
  kiosk flags;
- POS Terminal simulator contract evidence exposed by
  `/api/panel/bns-360/pos-primary`.
- risk-domain evidence execution from `scripts/risk-test-matrix.json` through
  `scripts/run-risk-domain-evidence.mjs`, wired into release gate and CI;
- runtime visual evidence for primary public routes across desktop, tablet and
  mobile, with screenshots, critical/serious axe checks, horizontal overflow
  checks, app-shell error checks, modal/toast evidence and source-backed loading
  component coverage;
- guest order lookup loading and synthetic not-found/error evidence on desktop
  and mobile, with the lookup POST held and fulfilled by Playwright so no order
  data is read or mutated;
- deployed Lighthouse Build and Lighthouse Deploy audits for the tenant proof.

## Functional Green Loop Evidence

This loop targets functional green with zero known non-commercial defects. It
does not certify live/commercial activation, live payments, Stripe Tax
registrations or physical POS.

- Template commit `30fc5bdb` added retry/backoff for transient runtime visual
  route throttling, including `Retry-After` handling up to 65s bounded by a 75s
  total wait budget.
- Tenant proof commit `a96ee9deb7a5f8622d89d034615069fd2592a3c5` propagated the
  backoff. CI, Build & Deploy and health passed, but Lighthouse Deploy exposed a
  real `/es/productos` performance regression: mobile LCP selected the second
  product card image, which was still lazy-loaded.
- Template commit `e391fbab` and tenant proof commit
  `f6752d60ca6909da547cbe297f090880708112fe` prioritize the first mobile grid
  row for product-card image discovery. Tenant CI `30575388197`, Build & Deploy
  `30575388231`, Lighthouse Build `30575388182`, Lighthouse Deploy `30575609077`
  and public health all passed for `f6752d60`.
- Source coverage records product detail, cart and checkout `loading.tsx`
  boundaries. Runtime-visible loading evidence uses the newsletter submit
  loading state with `/api/newsletter` intercepted by Playwright, so no
  newsletter mutation is sent while screenshots and axe evidence prove a real
  visible loading UI. Product-grid detail links disable route prefetch so the
  grid does not fan out unnecessary product-detail requests.
- Guest order lookup evidence uses the real `/es/pedido` form while Playwright
  holds the intercepted `POST /api/orders/lookup` pending, verifies the disabled
  submit button and visible spinner, then returns a synthetic `404` and verifies
  the accessible not-found alert. The harness waits for that exact interception
  before taking evidence, captures loading and error screenshots plus axe
  evidence on desktop and mobile, and never queries a real order. Tenant CI sets
  `BNS_RUNTIME_REQUIRE_ORDER_LOOKUP_STATES=1` with its standard tenant runtime
  Actions secrets and tenant ID variable, making an unavailable form or
  maintenance-mode skip a hard failure for this domain.
- Public JSON-LD scripts keep the per-request CSP nonce and use React's
  `suppressHydrationWarning` for that nonce-only attribute. Runtime evidence
  still treats every other hydration warning as blocking, while avoiding the
  expected browser-side nonce normalization mismatch.

The POS simulator evidence intentionally records no secrets and no Stripe
PaymentIntent/client secret. It proves the runtime boundary that must later be
replaced by a real Stripe test-mode Terminal integration:

- provider: `stripe_terminal`
- mode: `simulator`
- payment intent usage: `card_present`
- steps: connection grant request, reader discovery, payment collection,
  process payment, refund boundary
- `liveMutation=false`
- `hardwareRequired=false`

## Full-System Functional Coverage

The matrix now declares these required BNS 360 targets as automated
simulator/test-mode probes:

- `checkout_payment_collection_journey`: `/api/panel/bns-360/checkout-primary`
  records cart, PaymentCollection/session and order completion semantics in
  simulator mode with `liveMutation=false`.
- `customer_account_journey`:
  `/api/panel/bns-360/customer-account-primary` records canary customer auth,
  address CRUD and tenant-scoped order read evidence without cross-tenant
  leakage.
- `order_lifecycle_journey`:
  `/api/panel/bns-360/order-lifecycle-primary` records order placement,
  PaymentCollection linkage, fulfillment/cancel boundary, refund/return
  boundary and subscriber/analytics evidence.
- `backup_restore_journey`:
  `/api/panel/bns-360/backup-restore-primary` records backup metadata and a safe
  restore dry-run without mutating tenant data.
- `hardware_terminal_certification`: physical reader certification. Requires
  provider, location, reader id, explicit payment/refund authorization and
  material hardware.

Hardware certification deliberately remains separate. It does not block the
reusable browser/simulator functional claim, and it still cannot run without
explicit material hardware and payment/refund authorization.

## Execution Commands

Focused template checks:

```bash
cd apps/storefront
CI=true npx -y pnpm@9.15.4 exec vitest run \
  src/lib/__tests__/bns-360-e2e-matrix.test.ts \
  src/lib/bns-360/__tests__/pos-primary-journey.test.ts
```

Automated-only functional runtime run:

```bash
cd apps/storefront
BNS_360_EVIDENCE_PATH=artifacts/bns-360/runtime-evidence.json \
pnpm cert:360:functional:auto
```

Full functional run without `BNS_360_FUNCTIONAL_AUTOMATED_ONLY=1` is expected
to remain blocked/manual only for physical hardware certification or other
non-automatable future targets. The reusable full-system simulator slice should
run with `BNS_360_FUNCTIONAL_AUTOMATED_ONLY=1`.

## Next Implementation Batches

1. Propagate guest order lookup loading and synthetic not-found/error evidence
   from template to tenant proof, then verify local release gates, remote CI,
   deploy, Lighthouse Deploy, public health and remote Playwright on the tenant
   commit.
2. Expand visible loading evidence to checkout method loading and cart
   transition loading before revisiting App Router route fallbacks. Keep route
   `loading.tsx` evidence source-backed unless the fallback can be observed
   without navigation-shell flake.
3. Add risk-targeted coverage for the remaining highest-risk non-commercial
   areas: security/auth tenant isolation, checkout/payment simulators, POS
   simulator, Medusa admin helpers, provisioning/cleanup/backup/vault and
   CI/release artifacts.
4. Replace simulator-only PaymentCollection/order evidence with provider-backed
   test-mode evidence when the tenant-safe provider hook is available.
5. Replace the current POS Terminal contract evidence with a Stripe test-mode
   simulated reader probe. Keep physical reader certification separate.
6. Add physical reader certification only after provider, reader id/location and
   explicit live drill authorization exist.

## Non-Negotiable Guards

- Never persist Stripe keys, webhook secrets, owner credentials, cookies,
  browser storage, PaymentIntent client secrets or connection-token secrets.
- Never run live payments, refunds or physical reader collection without
  explicit human authorization including max amount, currency, payment method,
  refund timing and cleanup owner.
- Never mark `full 360 green` while live publication, EUR annual catalog,
  Stripe Tax or external alert delivery residuals remain open.
