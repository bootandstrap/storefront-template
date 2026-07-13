# BNS 360 Full-System Certification Runbook

Status: active
Owner repo: ecommerce-template
Last updated: 2026-07-13

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

1. Run the BSWEB `functional-system` canary scope against a newly deployed or
   freshly reconciled validation tenant and record the root functional canary
   artifact.
2. Replace simulator-only PaymentCollection/order evidence with provider-backed
   test-mode evidence when the tenant-safe provider hook is available.
3. Replace the current POS Terminal contract evidence with a Stripe test-mode
   simulated reader probe. Keep physical reader certification separate.
4. Add physical reader certification only after provider, reader id/location and
   explicit live drill authorization exist.

## Non-Negotiable Guards

- Never persist Stripe keys, webhook secrets, owner credentials, cookies,
  browser storage, PaymentIntent client secrets or connection-token secrets.
- Never run live payments, refunds or physical reader collection without
  explicit human authorization including max amount, currency, payment method,
  refund timing and cleanup owner.
- Never mark `full 360 green` while live publication, EUR annual catalog,
  Stripe Tax or external alert delivery residuals remain open.
