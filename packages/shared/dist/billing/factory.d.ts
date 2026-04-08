/**
 * @module billing/factory
 * @description Factory for creating BillingGateway instances based on environment.
 *
 * Resolves the billing provider from the BILLING_PROVIDER env var:
 *   - 'stripe' (default in production) → StripeBillingGateway
 *   - 'mock' (default in test/dev)     → MockBillingGateway
 *   - 'lemon_squeezy' (future)         → LemonSqueezyGateway
 *
 * Auto-detection: If STRIPE_SECRET_KEY is not set, falls back to MockBillingGateway
 * with a warning. This ensures local dev always works without credentials.
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */
import type { BillingGateway, BillingProvider } from './types';
import type { TenantBillingStore } from './providers/stripe';
export interface BillingGatewayOptions {
    /** Override auto-detected provider */
    provider?: BillingProvider;
    /** Required for Stripe provider — DB access for tenant↔Stripe mapping */
    store?: TenantBillingStore;
}
/**
 * Create a BillingGateway instance.
 *
 * Default behavior:
 * - If STRIPE_SECRET_KEY is set → StripeBillingGateway
 * - Otherwise → MockBillingGateway (with console warning)
 *
 * Override with BILLING_PROVIDER env var or options.provider.
 */
export declare function createBillingGateway(options?: BillingGatewayOptions): BillingGateway;
//# sourceMappingURL=factory.d.ts.map