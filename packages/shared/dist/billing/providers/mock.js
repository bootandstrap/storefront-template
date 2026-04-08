/**
 * @module billing/providers/mock
 * @description Mock implementation of BillingGateway for tests, local dev, and demo mode.
 *
 * This gateway simulates all billing operations in-memory without touching
 * any external service. It allows the full provisioning pipeline to run
 * locally without Stripe credentials.
 *
 * Usage:
 *   const gateway = new MockBillingGateway()
 *   const result = await gateway.createMaintenanceSubscription({ ... })
 *   // result.subscriptionId === 'mock_sub_xxx'
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */
let counter = 0;
function mockId(prefix) {
    return `${prefix}_mock_${++counter}_${Date.now().toString(36)}`;
}
// ── MockBillingGateway ─────────────────────────────────────────────────────
export class MockBillingGateway {
    provider = 'mock';
    customers = new Map(); // tenantId → customer
    subscriptions = new Map(); // tenantId → subscription
    /** Optional: track calls for test assertions */
    calls = [];
    track(method, params) {
        this.calls.push({ method, params, timestamp: Date.now() });
    }
    /** Reset all state (useful between tests) */
    reset() {
        this.customers.clear();
        this.subscriptions.clear();
        this.calls.length = 0;
        counter = 0;
    }
    // ── Customer ──────────────────────────────────────────────────────────
    async createCustomer(params) {
        this.track('createCustomer', params);
        const customer = {
            id: mockId('cus'),
            tenantId: params.tenantId,
            name: params.tenantName,
            email: params.ownerEmail ?? null,
        };
        this.customers.set(params.tenantId, customer);
        return { customerId: customer.id, email: customer.email, error: null };
    }
    async getCustomer(tenantId) {
        this.track('getCustomer', { tenantId });
        const customer = this.customers.get(tenantId);
        if (!customer)
            return { customerId: null, error: null };
        return { customerId: customer.id, email: customer.email, error: null };
    }
    async createPortalSession(params) {
        this.track('createPortalSession', params);
        return { url: `https://mock-portal.bootandstrap.test/${params.tenantId}`, error: null };
    }
    // ── Subscriptions ─────────────────────────────────────────────────────
    async createMaintenanceSubscription(params) {
        this.track('createMaintenanceSubscription', params);
        // Auto-create customer if needed
        if (!this.customers.has(params.tenantId)) {
            await this.createCustomer({
                tenantId: params.tenantId,
                tenantName: params.tenantName,
                ownerEmail: params.ownerEmail,
                currency: params.currency,
            });
        }
        const customer = this.customers.get(params.tenantId);
        const sub = {
            id: mockId('sub'),
            customerId: customer.id,
            tenantId: params.tenantId,
            status: (params.trialDays ?? 30) > 0 ? 'trialing' : 'active',
            modules: new Map(),
        };
        this.subscriptions.set(params.tenantId, sub);
        return {
            subscriptionId: sub.id,
            customerId: customer.id,
            status: sub.status,
            error: null,
        };
    }
    async getSubscription(tenantId) {
        this.track('getSubscription', { tenantId });
        const sub = this.subscriptions.get(tenantId);
        if (!sub)
            return { subscriptionId: null, customerId: null, status: null, error: null };
        return {
            subscriptionId: sub.id,
            customerId: sub.customerId,
            status: sub.status,
            error: null,
        };
    }
    async cancelSubscription(params) {
        this.track('cancelSubscription', params);
        const sub = this.subscriptions.get(params.tenantId);
        if (sub) {
            sub.status = 'cancelled';
            if (params.immediately)
                this.subscriptions.delete(params.tenantId);
        }
        return { error: null };
    }
    // ── Module Billing ────────────────────────────────────────────────────
    async createModuleCheckout(params) {
        this.track('createModuleCheckout', params);
        const sessionId = mockId('cs');
        return {
            checkoutUrl: `https://mock-checkout.bootandstrap.test/${sessionId}`,
            sessionId,
            error: null,
        };
    }
    async addModuleToSubscription(params) {
        this.track('addModuleToSubscription', params);
        const sub = this.subscriptions.get(params.tenantId);
        if (!sub)
            return { subscriptionItemId: null, error: 'No subscription' };
        const itemId = mockId('si');
        sub.modules.set(params.moduleKey, {
            itemId,
            priceId: params.priceId,
            tierLevel: 1,
        });
        return { subscriptionItemId: itemId, error: null };
    }
    async removeModuleFromSubscription(params) {
        this.track('removeModuleFromSubscription', params);
        const sub = this.subscriptions.get(params.tenantId);
        if (sub)
            sub.modules.delete(params.moduleKey);
        return { error: null };
    }
    async changeModuleTier(params) {
        this.track('changeModuleTier', params);
        const sub = this.subscriptions.get(params.tenantId);
        if (!sub)
            return { error: 'No subscription' };
        const existing = sub.modules.get(params.moduleKey);
        if (!existing)
            return { error: `Module ${params.moduleKey} not in subscription` };
        existing.priceId = params.newPriceId;
        existing.tierLevel = (existing.tierLevel ?? 1) + 1; // Simple increment for mock
        return { error: null };
    }
    async listModuleSubscriptions(tenantId) {
        this.track('listModuleSubscriptions', { tenantId });
        const sub = this.subscriptions.get(tenantId);
        if (!sub)
            return { modules: [], error: null };
        const modules = [];
        for (const [key, val] of sub.modules) {
            modules.push({
                moduleKey: key,
                itemId: val.itemId,
                priceId: val.priceId,
                tierLevel: val.tierLevel,
                status: sub.status === 'cancelled' ? 'cancelled' : 'active',
            });
        }
        return { modules, error: null };
    }
    // ── Entitlements ──────────────────────────────────────────────────────
    async resolveEntitlements(tenantId) {
        this.track('resolveEntitlements', { tenantId });
        const sub = this.subscriptions.get(tenantId);
        if (!sub)
            return { entitlements: [], error: null };
        const entitlements = [];
        for (const [key, val] of sub.modules) {
            entitlements.push({
                moduleKey: key,
                tierLevel: val.tierLevel,
                tierName: `tier_${val.tierLevel}`,
                enabledFlags: [`enable_${key}`],
                limitOverrides: {},
                providerItemId: val.itemId,
            });
        }
        return { entitlements, error: null };
    }
    // ── Webhooks ───────────────────────────────────────────────────────────
    async handleWebhook(event) {
        this.track('handleWebhook', event);
        return { handled: true, eventType: event.type, error: null };
    }
}
//# sourceMappingURL=mock.js.map