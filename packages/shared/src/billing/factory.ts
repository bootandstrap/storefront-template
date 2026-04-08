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

import type { BillingGateway, BillingProvider } from './types'
import { MockBillingGateway } from './providers/mock'
import type { TenantBillingStore } from './providers/stripe'

// ── Factory ────────────────────────────────────────────────────────────────

export interface BillingGatewayOptions {
    /** Override auto-detected provider */
    provider?: BillingProvider
    /** Required for Stripe provider — DB access for tenant↔Stripe mapping */
    store?: TenantBillingStore
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
export function createBillingGateway(options: BillingGatewayOptions = {}): BillingGateway {
    const provider = options.provider
        ?? (process.env.BILLING_PROVIDER as BillingProvider)
        ?? detectProvider()

    switch (provider) {
        case 'stripe': {
            if (!options.store) {
                throw new Error(
                    '[BillingGatewayFactory] StripeBillingGateway requires a TenantBillingStore. '
                    + 'Pass `store` option or use MockBillingGateway for local dev.'
                )
            }
            // Dynamic import to avoid loading stripe dependency in environments that don't need it
            const { StripeBillingGateway } = require('./providers/stripe') as typeof import('./providers/stripe')
            return new StripeBillingGateway(options.store)
        }

        case 'mock':
            return new MockBillingGateway()

        case 'lemon_squeezy':
            throw new Error(
                '[BillingGatewayFactory] LemonSqueezy provider not yet implemented. '
                + 'Planned for future phase. Use Stripe or Mock.'
            )

        case 'paddle':
            throw new Error(
                '[BillingGatewayFactory] Paddle provider not yet implemented. '
                + 'Planned for future phase. Use Stripe or Mock.'
            )

        default:
            console.warn(`[BillingGatewayFactory] Unknown provider '${provider}' — falling back to Mock`)
            return new MockBillingGateway()
    }
}

// ── Auto-detection ─────────────────────────────────────────────────────────

function detectProvider(): BillingProvider {
    // In test environment, always use mock
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
        return 'mock'
    }

    // If Stripe key is configured, use Stripe
    if (process.env.STRIPE_SECRET_KEY) {
        return 'stripe'
    }

    // Local dev / demo without Stripe credentials
    if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
        console.warn(
            '[BillingGatewayFactory] No STRIPE_SECRET_KEY found — using MockBillingGateway. '
            + 'Set BILLING_PROVIDER=stripe and STRIPE_SECRET_KEY for production billing.'
        )
        return 'mock'
    }

    // Production without Stripe — this is a misconfiguration
    console.error(
        '[BillingGatewayFactory] ⚠️ Production environment without STRIPE_SECRET_KEY. '
        + 'Billing operations will be no-ops. Set STRIPE_SECRET_KEY.'
    )
    return 'mock'
}
