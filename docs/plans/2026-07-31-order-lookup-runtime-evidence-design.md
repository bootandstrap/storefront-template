# Order Lookup Runtime Evidence Design

## Goal

Extend the visual runtime certification with deterministic, visible evidence for
guest order lookup loading and not-found states without creating orders, calling
payment providers, or mutating Medusa.

## Selected approach

Use the existing `/es/pedido` form and intercept its browser request to
`/api/orders/lookup` in Playwright. The test holds the request pending, verifies
that the real submit button is disabled and its spinner is visible, captures
runtime evidence, then fulfills the request with a synthetic `404` response and
verifies the real not-found alert.

This approach is preferred over checkout-method evidence for this increment
because checkout requires a real cart plus multiple server-action transitions.
It is preferred over another cart transition because add-to-cart feedback and
the cart drawer already have runtime evidence. Checkout remains the next
critical candidate after this deterministic harness is green remotely.

## Runtime contract

The order lookup page exposes stable evidence hooks on existing UI elements:

- `order-lookup-email`
- `order-lookup-id`
- `order-lookup-submit`
- `order-lookup-spinner`
- `order-lookup-error`

The hooks do not change business behavior. The error container uses
`role="alert"` so the visible state is also announced to assistive technology.
No new copy or locale keys are introduced.

## Evidence flow

1. Navigate to `/es/pedido`.
2. Verify the form is visible.
3. Route the next POST to `/api/orders/lookup` and keep it pending.
4. Fill safe synthetic values and submit.
5. Verify the submit button is disabled and the spinner is visible.
6. Capture screenshot and axe evidence for the loading state.
7. Fulfill the intercepted request with a synthetic `404`.
8. Verify the not-found alert is visible and non-empty.
9. Capture screenshot and axe evidence for the error state.
10. Release and remove interception in `finally` so failures cannot hang the
    suite.

The harness accepts only a `POST` to `/api/orders/lookup` and waits until that
exact request has been intercepted before asserting the loading UI. This makes
an endpoint or method drift fail instead of accidentally exercising a different
request.

The interactive-state requirement remains fail-closed for remote targets and
for runs with `BNS_RUNTIME_REQUIRE_INTERACTIVE_STATES=1`. Tenant CI additionally
sets the narrower `BNS_RUNTIME_REQUIRE_ORDER_LOOKUP_STATES=1` contract and
reuses the tenant's standard `NEXT_PUBLIC_SUPABASE_*` Actions secrets plus its
`TENANT_ID` Actions variable, so maintenance-mode skips cannot make this
evidence appear green. Local template runs may still skip when the test-safe
runtime is intentionally unavailable.

## Contract and governance

`ci-artifacts-contract.test.ts` must require the order lookup state names,
request path, POST-only interception, interception acknowledgment, evidence
hooks, tenant CI enforcement flag, test-safe secret references, and
loading/error evidence attachment names.
The `visual-runtime-primary-routes` risk domain continues to execute the same
Playwright spec, while its failure-mode wording is expanded to name order lookup
loading and not-found/error evidence explicitly.

The operations certification document records template source verification,
tenant propagation, and runtime proof separately. No commercial/live readiness
claim is added.

## Verification

The change follows RED-GREEN:

1. Strengthen the CI artifact contract and observe failure.
2. Add the minimal runtime hooks and Playwright harness.
3. Run the focused contract and risk-matrix checks.
4. Run the template release gate and diff checks.
5. Propagate the verified source diff to the tenant proof.
6. Run the tenant focused checks and release gate.
7. Push template and tenant commits, then verify tenant CI, deploy, public
   health SHA, and remote Playwright evidence.
