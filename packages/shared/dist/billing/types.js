/**
 * @module billing/types
 * @description Provider-agnostic billing types for multi-provider payment support.
 *
 * BootandStrap Business Model:
 *   - Web Base: 1500 CHF one-time (Stripe manual capture → reserve → capture)
 *   - Maintenance: 40 CHF/mo recurring (1st month free trial)
 *   - Modules: variable per module/tier (recurring subscriptions)
 *
 * This abstraction enables swapping Stripe for LemonSqueezy, Paddle, etc.
 * without changing business logic in the governance engine or provisioning pipeline.
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */
export {};
//# sourceMappingURL=types.js.map