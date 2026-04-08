/**
 * @module billing/providers/stripe
 * @description Stripe implementation of BillingGateway.
 *
 * This is the production provider. All Stripe-specific logic is isolated here
 * so that the rest of the platform remains provider-agnostic.
 *
 * Requirements:
 *   - STRIPE_SECRET_KEY environment variable
 *   - STRIPE_MAINTENANCE_PRICE_ID_CHF / STRIPE_MAINTENANCE_PRICE_ID_EUR
 *   - Stripe account with products configured per governance-contract.json
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */
// ── Lazy Stripe import ─────────────────────────────────────────────────────
// We use dynamic import to avoid requiring stripe as a hard dependency
// at the shared package level. Consumers must have `stripe` installed.
// NOTE: Using `any` for the Stripe instance type to avoid requiring
// stripe types at compile time. The shared package is a peer of stripe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _stripe = null;
async function getStripe() {
    if (_stripe)
        return _stripe;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key)
        throw new Error('[StripeBillingGateway] STRIPE_SECRET_KEY not set');
    // Dynamic import — only loaded at runtime when Stripe is needed
    // @ts-ignore — stripe is an optional peer dependency, only available at runtime
    const mod = await import('stripe');
    const Stripe = mod.default || mod;
    _stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' });
    return _stripe;
}
// ── Helpers ────────────────────────────────────────────────────────────────
function getMaintenancePriceId(currency = 'EUR') {
    if (currency === 'CHF') {
        return process.env.STRIPE_MAINTENANCE_PRICE_ID_CHF
            || process.env.STRIPE_MAINTENANCE_PRICE_ID
            || null;
    }
    return process.env.STRIPE_MAINTENANCE_PRICE_ID_EUR
        || process.env.STRIPE_MAINTENANCE_PRICE_ID
        || null;
}
function mapStripeStatus(status) {
    const map = {
        active: 'active',
        trialing: 'trialing',
        past_due: 'past_due',
        unpaid: 'unpaid',
        canceled: 'cancelled',
        cancelled: 'cancelled',
        incomplete: 'incomplete',
        incomplete_expired: 'cancelled',
    };
    return map[status] ?? 'incomplete';
}
// ── StripeBillingGateway ───────────────────────────────────────────────────
export class StripeBillingGateway {
    store;
    provider = 'stripe';
    constructor(store) {
        this.store = store;
    }
    // ── Customer ──────────────────────────────────────────────────────────
    async createCustomer(params) {
        try {
            const stripe = await getStripe();
            const customer = await stripe.customers.create({
                name: params.tenantName,
                email: params.ownerEmail || undefined,
                metadata: {
                    tenant_id: params.tenantId,
                    source: 'bootandstrap_saas',
                    ...params.metadata,
                },
            });
            await this.store.setStripeIds(params.tenantId, customer.id);
            return { customerId: customer.id, email: customer.email, error: null };
        }
        catch (err) {
            return { customerId: null, error: this.errorMessage(err) };
        }
    }
    async getCustomer(tenantId) {
        try {
            const { customerId } = await this.store.getStripeIds(tenantId);
            if (!customerId)
                return { customerId: null, error: null };
            const stripe = await getStripe();
            const customer = await stripe.customers.retrieve(customerId);
            if (customer.deleted)
                return { customerId: null, error: 'Customer deleted' };
            return {
                customerId: customer.id,
                email: customer.email,
                error: null,
            };
        }
        catch (err) {
            return { customerId: null, error: this.errorMessage(err) };
        }
    }
    async createPortalSession(params) {
        try {
            const { customerId } = await this.store.getStripeIds(params.tenantId);
            if (!customerId)
                return { url: null, error: 'No Stripe customer for this tenant' };
            const stripe = await getStripe();
            const session = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: params.returnUrl,
            });
            return { url: session.url, error: null };
        }
        catch (err) {
            return { url: null, error: this.errorMessage(err) };
        }
    }
    // ── Subscriptions ─────────────────────────────────────────────────────
    async createMaintenanceSubscription(params) {
        try {
            const stripe = await getStripe();
            const priceId = getMaintenancePriceId(params.currency);
            if (!priceId) {
                return {
                    subscriptionId: null,
                    customerId: null,
                    status: null,
                    error: `STRIPE_MAINTENANCE_PRICE_ID_${params.currency ?? 'EUR'} not set`,
                };
            }
            // Ensure customer exists
            let { customerId } = await this.store.getStripeIds(params.tenantId);
            if (!customerId) {
                const customerResult = await this.createCustomer({
                    tenantId: params.tenantId,
                    tenantName: params.tenantName,
                    ownerEmail: params.ownerEmail,
                    currency: params.currency,
                });
                if (customerResult.error)
                    return { subscriptionId: null, customerId: null, status: null, error: customerResult.error };
                customerId = customerResult.customerId;
            }
            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: priceId, metadata: { type: 'maintenance' } }],
                trial_period_days: params.trialDays ?? 30,
                metadata: {
                    tenant_id: params.tenantId,
                    source: 'bootandstrap_saas',
                },
                payment_settings: {
                    save_default_payment_method: 'on_subscription',
                },
            });
            await this.store.setStripeIds(params.tenantId, customerId, subscription.id);
            return {
                subscriptionId: subscription.id,
                customerId: customerId,
                status: mapStripeStatus(subscription.status),
                error: null,
            };
        }
        catch (err) {
            return { subscriptionId: null, customerId: null, status: null, error: this.errorMessage(err) };
        }
    }
    async getSubscription(tenantId) {
        try {
            const { customerId, subscriptionId } = await this.store.getStripeIds(tenantId);
            if (!subscriptionId)
                return { subscriptionId: null, customerId, status: null, error: null };
            const stripe = await getStripe();
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            return {
                subscriptionId: sub.id,
                customerId,
                status: mapStripeStatus(sub.status),
                error: null,
            };
        }
        catch (err) {
            return { subscriptionId: null, customerId: null, status: null, error: this.errorMessage(err) };
        }
    }
    async cancelSubscription(params) {
        try {
            const { subscriptionId } = await this.store.getStripeIds(params.tenantId);
            if (!subscriptionId)
                return { error: null };
            const stripe = await getStripe();
            if (params.immediately) {
                await stripe.subscriptions.cancel(subscriptionId);
            }
            else {
                await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
            }
            return { error: null };
        }
        catch (err) {
            return { error: this.errorMessage(err) };
        }
    }
    // ── Module Billing ────────────────────────────────────────────────────
    async createModuleCheckout(params) {
        try {
            const { customerId } = await this.store.getStripeIds(params.tenantId);
            if (!customerId)
                return { checkoutUrl: null, sessionId: null, error: 'No Stripe customer' };
            const stripe = await getStripe();
            // Look up price from module_tiers in production — for now, placeholder
            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                mode: 'subscription',
                success_url: params.successUrl,
                cancel_url: params.cancelUrl,
                metadata: {
                    tenant_id: params.tenantId,
                    module_key: params.moduleKey,
                    tier_level: String(params.tierLevel),
                    source: 'module_checkout',
                },
            });
            return { checkoutUrl: session.url, sessionId: session.id, error: null };
        }
        catch (err) {
            return { checkoutUrl: null, sessionId: null, error: this.errorMessage(err) };
        }
    }
    async addModuleToSubscription(params) {
        try {
            const { subscriptionId } = await this.store.getStripeIds(params.tenantId);
            if (!subscriptionId)
                return { subscriptionItemId: null, error: 'No subscription' };
            const stripe = await getStripe();
            const item = await stripe.subscriptionItems.create({
                subscription: subscriptionId,
                price: params.priceId,
                metadata: {
                    type: 'module_addon',
                    module_key: params.moduleKey,
                    tenant_id: params.tenantId,
                },
            });
            return { subscriptionItemId: item.id, error: null };
        }
        catch (err) {
            return { subscriptionItemId: null, error: this.errorMessage(err) };
        }
    }
    async removeModuleFromSubscription(params) {
        try {
            const { subscriptionId } = await this.store.getStripeIds(params.tenantId);
            if (!subscriptionId)
                return { error: null };
            const stripe = await getStripe();
            const sub = await stripe.subscriptions.retrieve(subscriptionId, {
                expand: ['items.data'],
            });
            const moduleItem = sub.items.data.find((item) => item.metadata?.module_key === params.moduleKey && item.metadata?.type === 'module_addon');
            if (!moduleItem)
                return { error: null }; // Already removed
            await stripe.subscriptionItems.del(moduleItem.id, {
                proration_behavior: 'create_prorations',
            });
            return { error: null };
        }
        catch (err) {
            return { error: this.errorMessage(err) };
        }
    }
    async changeModuleTier(params) {
        try {
            const { subscriptionId } = await this.store.getStripeIds(params.tenantId);
            if (!subscriptionId)
                return { error: 'No subscription' };
            const stripe = await getStripe();
            const sub = await stripe.subscriptions.retrieve(subscriptionId, {
                expand: ['items.data'],
            });
            const currentItem = sub.items.data.find((item) => item.metadata?.module_key === params.moduleKey && item.metadata?.type === 'module_addon');
            if (!currentItem)
                return { error: `Module ${params.moduleKey} not found in subscription` };
            await stripe.subscriptionItems.update(currentItem.id, {
                price: params.newPriceId,
                proration_behavior: 'create_prorations',
            });
            return { error: null };
        }
        catch (err) {
            return { error: this.errorMessage(err) };
        }
    }
    async listModuleSubscriptions(tenantId) {
        try {
            const { subscriptionId } = await this.store.getStripeIds(tenantId);
            if (!subscriptionId)
                return { modules: [], error: null };
            const stripe = await getStripe();
            const sub = await stripe.subscriptions.retrieve(subscriptionId, {
                expand: ['items.data'],
            });
            const modules = sub.items.data
                .filter((item) => item.metadata?.type === 'module_addon')
                .map((item) => ({
                moduleKey: item.metadata?.module_key || 'unknown',
                itemId: item.id,
                priceId: typeof item.price === 'string' ? item.price : item.price.id,
                tierLevel: item.metadata?.tier_level ? parseInt(item.metadata.tier_level) : undefined,
                status: mapStripeStatus(sub.status),
            }));
            return { modules, error: null };
        }
        catch (err) {
            return { modules: [], error: this.errorMessage(err) };
        }
    }
    // ── Entitlements ──────────────────────────────────────────────────────
    async resolveEntitlements(tenantId) {
        try {
            const { subscriptionId } = await this.store.getStripeIds(tenantId);
            if (!subscriptionId)
                return { entitlements: [], error: null };
            const stripe = await getStripe();
            const sub = await stripe.subscriptions.retrieve(subscriptionId, {
                expand: ['items.data.price.product'],
            });
            const entitlements = sub.items.data
                .filter((item) => item.metadata?.type === 'module_addon')
                .map((item) => {
                const product = item.price?.product;
                const metadata = product?.metadata ?? {};
                return {
                    moduleKey: item.metadata?.module_key || metadata.module_key || 'unknown',
                    tierLevel: parseInt(metadata.tier_level || item.metadata?.tier_level || '1'),
                    tierName: metadata.tier_name || 'basic',
                    enabledFlags: (metadata.enabled_flags || '').split(',').filter(Boolean),
                    limitOverrides: metadata.limit_overrides ? JSON.parse(metadata.limit_overrides) : {},
                    providerItemId: item.id,
                };
            });
            return { entitlements, error: null };
        }
        catch (err) {
            return { entitlements: [], error: this.errorMessage(err) };
        }
    }
    // ── Webhooks ───────────────────────────────────────────────────────────
    async handleWebhook(event) {
        // Webhook handling delegates to the consumer (BSWEB) since it requires
        // Supabase mutations, email sending, and governance engine calls.
        // The gateway only normalizes the event format.
        return {
            handled: false,
            eventType: event.type,
            error: 'Webhook processing must be handled by the consumer (BSWEB billing-events handler)',
        };
    }
    // ── Private Helpers ───────────────────────────────────────────────────
    errorMessage(err) {
        return err instanceof Error ? err.message : 'Unknown Stripe billing error';
    }
}
//# sourceMappingURL=stripe.js.map