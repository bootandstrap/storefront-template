# Checkout Method Runtime Evidence Design

## Context

`CheckoutModal` loads every enabled payment method with `Promise.all` when the
modal opens. If any availability Server Action rejects, the effect has no
error path: `loadingMethods` remains `true`, the rejection is unhandled, and
the customer cannot distinguish a transient failure from a slow request.

## Considered approaches

1. Keep the spinner indefinitely. This is fail-open UX because a failed request
   appears to still be progressing and offers no recovery.
2. Treat failed availability checks as unavailable methods. This hides a
   runtime failure as a valid empty configuration and could incorrectly remove
   every checkout option.
3. Render a distinct error with retry while retaining the existing method
   availability contract. This is selected because it fails closed, preserves
   feature-flag and plan-limit ownership, and gives the customer a safe recovery
   action.

## Design

`CheckoutModal` will own one memoized `loadMethods` callback. It will clear the
previous error, set loading, run the existing availability checks, and always
leave loading through `finally`. A rejected check will clear the visible method
list and set a dedicated `methodsError`; it will not initialize a payment
session, create an order, or reinterpret the failure as an empty configuration.

`CheckoutMethodStep` will render accessible loading, unavailable, and error
states with stable test IDs. The error state will include an enabled retry
button wired to `loadMethods`. The modal and its navigation controls will also
receive the missing dialog and accessible-name semantics needed by the runtime
test.

Playwright will create only the existing disposable evidence cart, intercept
one payment-method availability Server Action before it reaches the server,
hold it to prove loading, and abort it to prove error plus retry. Order submit
actions and Stripe initialization remain untouched.

## Success criteria

- A rejected method availability request cannot leave checkout loading forever.
- Failure is distinct from a valid zero-method configuration.
- Error and retry are visible, accessible, localized, and observable.
- Runtime evidence proves loading, error, and a real retry request without
  creating an order or initializing a payment.
