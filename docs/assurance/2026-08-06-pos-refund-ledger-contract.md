# POS Refund Ledger Contract

Status: active
Owner: Medusa runtime (`ecommerce-template`)
Schema: `bootandstrap.pos-refund-operation/v1`

## Authority

Medusa Payment remains authoritative for provider refunds, captured/refunded
amounts and the durable `refund` row. The POS module owns only the operation
ledger needed to make a terminal request replayable and to reserve cumulative
line-item quantities. BSWEB and the storefront never author authoritative refund
state.

Each request is scoped to the tenant derived from authenticated server context,
then identified by `(tenant_id, idempotency_key)` and `(tenant_id, operation_id)`.
The normalized payload hash covers order ID, sorted line-item IDs/quantities,
server-recomputed amount and reason. A key reused with different normalized bytes
is a conflict.

## States

- `pending`: the operation and its quantities are durably reserved; no completed
  refund may be shown.
- `acknowledged`: Medusa Payment returned a durable `refund_id`. Only this state
  may project POS status `completed`.
- `failed`: the Medusa boundary produced a definitive rejection before any
  provider attempt (for example, captured amount unavailable). Its reserved
  quantities no longer block a new operation, but replay of the same key returns
  the same failed result. Unknown provider/transport outcomes remain `pending`.

Exact replay never invokes the provider twice. A pending replay first attempts to
find the Medusa refund carrying the exact operation metadata. If found, it
acknowledges the ledger and returns it; otherwise it stays pending/unavailable and
does not guess whether a provider commit occurred.

## Quantity and concurrency rules

The server loads ordered quantities and prices from Medusa. Client amount,
already-refunded quantities and tenant IDs are not trusted. Reservation takes an
order-scoped PostgreSQL advisory transaction lock and counts all `pending` and
`acknowledged` quantities. A line may never exceed its ordered quantity and the
request total may never exceed the remaining captured amount enforced again by
Medusa Payment.

Concurrent requests are serialized at reservation. At most one can reserve the
last refundable quantity. Failed operations are excluded from later cumulative
totals. All money uses integer minor units.

## Fault semantics

- Timeout before reservation commit leaves no row; retry may reserve normally.
- Timeout after reservation but before provider call returns/replays `pending`.
- Timeout after Payment committed is reconciled by operation metadata and cannot
  create a second refund.
- Lost response after acknowledgement is an exact acknowledged replay.
- A definitive pre-provider rejection records `failed`; an ambiguous provider
  failure remains `pending`. Neither may mark completed.

The availability read counts `pending` and `acknowledged` line quantities,
ignores `failed`, revalidates tenant and sales-channel scope, and treats an empty
set as valid. A malformed or unavailable ledger fails closed instead of restoring
the original ordered quantity.

Provider calls in automated evidence are injected mocks/test-mode only. No real
payment, Stripe live call or real refund is authorized by this contract.
