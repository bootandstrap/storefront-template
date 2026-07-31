# Cart Hydration Runtime Evidence Design

## Context

`CartContext` starts with `isLoading=true`, but the cart page and drawer ignore
that state and start separate `useTransition` fetches. Their local transitions
start as idle, so a stored cart can briefly render the true-empty state before
hydration starts. If `getCartAction` returns `null`, the UI also remains
indistinguishable from a cart that is genuinely empty.

## Considered approaches

1. Consume the provider's existing `isLoading` flag and keep the duplicate page
   and drawer fetches. This removes the first empty frame, but preserves multiple
   hydration owners and still collapses failures into empty.
2. Move hydration entirely into the page. This would help the full cart route,
   but the drawer and header still need independently consistent cart state.
3. Make `CartContext` the single hydration owner and expose loading, error, and
   retry state to consumers. This is the selected approach because it removes
   duplicate requests and gives every cart surface one fail-closed state model.

## Design

`CartContext` will retain the persisted cart ID while hydration is unavailable,
set a distinct `hydrationError` flag when the server action returns `null`, and
expose `retryHydration`. No cart ID will be deleted automatically: a transient
Medusa failure must remain retryable, and add-to-cart already owns stale-cart
replacement.

The cart page and drawer will remove their local hydration effects. They will
render an accessible status while the provider is loading, an accessible alert
with a retry action on failure, and the existing empty state only when hydration
has completed without an error and there are no items. Stable test IDs will make
these states observable.

Runtime evidence will seed a safe synthetic stored cart ID, intercept the
Next.js Server Action request without forwarding it, hold it pending to prove
the loading UI, then abort it to prove the error UI and enabled retry action.
The harness will not create, mutate, pay for, or remove any real cart.

## Success criteria

- A stored cart never renders the true-empty state while hydration is pending.
- A failed hydration renders a visible, accessible error with retry.
- Page and drawer do not issue their own hydration requests.
- Contract tests and Playwright evidence fail closed when required markers or
  visible states disappear.

