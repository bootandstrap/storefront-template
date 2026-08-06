# POS Device And History Operational Contracts

Status: active
Owner: `ecommerce-template`
Contract version: `bootandstrap.pos-device-history/v1`

These contracts close executable POS gaps without claiming hardware certification.
Browser adapters are convenience boundaries; server authentication, tenant scope,
Medusa and the POS ledger remain authoritative.

## Shared states

- `unavailable`: a required browser API or Medusa runtime is absent. It is never
  converted to `ready`, an empty list or a successful operation.
- `error`: the capability exists but an attempted operation failed. The original
  failure remains observable through the public result.
- `ready`: the adapter can accept an operation. It does not assert that physical
  hardware, a provider or a deployed runtime has been certified.
- Retries are caller-controlled. These adapters do not retry mutations or create
  hidden timers beyond the scanner framing timeout and scheduled sound sequence.

## `useBarcodeScanner.ts`

- Authority: the browser `keydown` stream only proposes barcode input; product
  identity, price and inventory remain server/runtime decisions.
- Capability: `window.addEventListener` is required for automatic scanning.
  Manual scan remains available without the listener.
- States: missing browser event APIs are `unavailable`; accepted scanner framing
  is `ready`; callback failures remain caller errors.
- Framing: printable unmodified keys within `maxKeyInterval` form a candidate;
  Enter or the deterministic idle timer ends it. Normal input/textarea typing is
  ignored unless the element declares `data-pos-search="true"`.
- Cleanup: disabling or disposing removes the capture listener, clears the idle
  timer and discards the buffered candidate. No callback may fire after cleanup.

## `usePOSSounds.ts`

- Authority: sound and vibration are optional UI feedback and never confirm a
  scan, payment, refund or sale.
- Capability: Web Audio must exist and reduced-motion must not be requested.
  Vibration is separately optional.
- States: missing/denied Web Audio and reduced-motion are `unavailable`; context
  construction or resume failure is `error`; an active context is `ready`.
- Retries: a later explicit play call may recreate a context after an error; no
  background retry or sleep is allowed.
- Cleanup: disposal cancels every scheduled tone, stops/disconnects active audio
  nodes and closes the owned `AudioContext`. No delayed tone may start afterward.

## `usePrinterConnection.ts`

- Authority: the print engine owns Web Serial interaction. A print completion is
  device feedback only and does not confirm a commercial transaction.
- Capability: absence of `navigator.serial` is `unavailable`; a disconnected but
  supported engine is `ready`; connection/print failures are `error`.
- Retries: connect and print execute once per explicit caller request. There is no
  implicit retry, polling or hardware sleep.
- Cleanup: every hook subscription returns an unsubscribe operation. Explicit
  disconnect delegates to the engine so its Web Serial port is released. Because
  the engine is shared, component unmount removes only its listener and does not
  disconnect another mounted consumer.
- Virtual printer operations remain the allowed deterministic proof surface; they
  never imply Web Serial or physical-printer certification.

## `history/sales-history.ts`

- Authority: the authenticated panel user selects the governance tenant;
  `getTenantMedusaScope(tenantId)` derives the only permitted Medusa scope.
- Capability: both list and detail require `enable_pos_shifts` through
  `withPanelGuard({ requiredFlag: 'enable_pos_shifts' })` before scope resolution.
- States: an authorized Medusa response with zero POS orders is a valid `ready`
  empty result. Missing scope, transport failure or malformed/missing Medusa data
  is `unavailable`/`error` with an explicit error and must not resemble success.
- Tenant mismatch is rejected by the scope boundary; caller-supplied tenant IDs
  are forbidden.
- Reads have no retries in this action and allocate no persistent resources.

## `history/daily-stats.ts`

- Authority: the authenticated panel user and `enable_pos_reports` capability
  authorize the report; the sales-history action supplies tenant-scoped records.
- Capability: `withPanelGuard({ requiredFlag: 'enable_pos_reports' })` must run
  before history access. The nested history failure is propagated explicitly.
- States: a valid empty day returns zero-valued stats. Runtime unavailable or any
  history error returns `stats: null` and the error; it is never aggregated as an
  empty day.
- Dates are strict `YYYY-MM-DD` UTC report keys. Invalid input fails closed.
- Reads have no retries, timers or persistent resources.

## Prohibited claims

These contracts and their browser fakes do not execute or certify physical POS,
real payments, real refunds, Stripe live mode or a deployed tenant runtime.
