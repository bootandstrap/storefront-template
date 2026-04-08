/**
 * @module billing/__tests__/mock-gateway
 * @description Unit tests for MockBillingGateway.
 *
 * Validates that the mock gateway:
 *   - Implements the full BillingGateway interface
 *   - Tracks all operations in .calls[]
 *   - Produces correct return types
 *   - Auto-increments IDs
 *   - Supports reset
 *
 * These tests also serve as contract tests for ANY BillingGateway implementation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MockBillingGateway } from '../providers/mock';
describe('MockBillingGateway', () => {
    let gateway;
    beforeEach(() => {
        gateway = new MockBillingGateway();
    });
    // ── Provider Identity ─────────────────────────────────────────────
    it('identifies as mock provider', () => {
        expect(gateway.provider).toBe('mock');
    });
    // ── Customer ──────────────────────────────────────────────────────
    it('creates a customer and returns customerId', async () => {
        const result = await gateway.createCustomer({
            tenantId: 'tenant-1',
            tenantName: 'Test Store',
            ownerEmail: 'test@example.com',
        });
        expect(result.customerId).toBeTruthy();
        expect(result.customerId).toContain('cus_mock_');
        expect(result.error).toBeNull();
    });
    it('gets a previously created customer', async () => {
        await gateway.createCustomer({
            tenantId: 'tenant-1',
            tenantName: 'Store',
        });
        const result = await gateway.getCustomer('tenant-1');
        expect(result.customerId).toBeTruthy();
        expect(result.error).toBeNull();
    });
    it('returns null for non-existent customer', async () => {
        const result = await gateway.getCustomer('non-existent');
        expect(result.customerId).toBeNull();
        expect(result.error).toBeNull();
    });
    it('creates billing portal session', async () => {
        await gateway.createCustomer({
            tenantId: 'tenant-1',
            tenantName: 'Store',
        });
        const result = await gateway.createPortalSession({
            tenantId: 'tenant-1',
            returnUrl: 'https://example.com/dashboard',
        });
        expect(result.url).toBeTruthy();
        expect(result.url).toContain('mock-portal');
        expect(result.error).toBeNull();
    });
    // ── Subscriptions ─────────────────────────────────────────────────
    it('creates maintenance subscription', async () => {
        const result = await gateway.createMaintenanceSubscription({
            tenantId: 'tenant-1',
            tenantName: 'Store',
            ownerEmail: 'test@example.com',
        });
        expect(result.subscriptionId).toBeTruthy();
        expect(result.subscriptionId).toContain('sub_mock_');
        expect(result.status).toBe('trialing');
        expect(result.error).toBeNull();
    });
    it('retrieves subscription after creation', async () => {
        await gateway.createMaintenanceSubscription({
            tenantId: 'tenant-1',
            tenantName: 'Store',
        });
        const result = await gateway.getSubscription('tenant-1');
        expect(result.subscriptionId).toBeTruthy();
        expect(result.status).toBe('trialing');
        expect(result.error).toBeNull();
    });
    it('cancels subscription', async () => {
        await gateway.createMaintenanceSubscription({
            tenantId: 'tenant-1',
            tenantName: 'Store',
        });
        // Cancel without immediately — just marks as cancelled
        const result = await gateway.cancelSubscription({
            tenantId: 'tenant-1',
            immediately: false,
        });
        expect(result.error).toBeNull();
        const check = await gateway.getSubscription('tenant-1');
        expect(check.status).toBe('cancelled');
    });
    // ── Modules ───────────────────────────────────────────────────────
    it('creates module checkout session', async () => {
        await gateway.createCustomer({
            tenantId: 'tenant-1',
            tenantName: 'Store',
        });
        const result = await gateway.createModuleCheckout({
            tenantId: 'tenant-1',
            moduleKey: 'ecommerce',
            tierLevel: 2,
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
        });
        expect(result.checkoutUrl).toBeTruthy();
        expect(result.sessionId).toBeTruthy();
        expect(result.error).toBeNull();
    });
    it('adds module to subscription', async () => {
        await gateway.createMaintenanceSubscription({
            tenantId: 'tenant-1',
            tenantName: 'Store',
        });
        const result = await gateway.addModuleToSubscription({
            tenantId: 'tenant-1',
            moduleKey: 'chatbot',
            priceId: 'price_chatbot_pro',
        });
        expect(result.subscriptionItemId).toBeTruthy();
        expect(result.error).toBeNull();
    });
    it('lists module subscriptions', async () => {
        await gateway.createMaintenanceSubscription({
            tenantId: 'tenant-1',
            tenantName: 'Store',
        });
        await gateway.addModuleToSubscription({
            tenantId: 'tenant-1',
            moduleKey: 'chatbot',
            priceId: 'price_chat',
        });
        await gateway.addModuleToSubscription({
            tenantId: 'tenant-1',
            moduleKey: 'crm',
            priceId: 'price_crm',
        });
        const result = await gateway.listModuleSubscriptions('tenant-1');
        expect(result.modules).toHaveLength(2);
        expect(result.modules.map(m => m.moduleKey)).toContain('chatbot');
        expect(result.modules.map(m => m.moduleKey)).toContain('crm');
        expect(result.error).toBeNull();
    });
    it('removes module from subscription', async () => {
        await gateway.createMaintenanceSubscription({
            tenantId: 'tenant-1',
            tenantName: 'Store',
        });
        await gateway.addModuleToSubscription({
            tenantId: 'tenant-1',
            moduleKey: 'chatbot',
            priceId: 'price_chat',
        });
        const result = await gateway.removeModuleFromSubscription({
            tenantId: 'tenant-1',
            moduleKey: 'chatbot',
        });
        expect(result.error).toBeNull();
        const list = await gateway.listModuleSubscriptions('tenant-1');
        expect(list.modules).toHaveLength(0);
    });
    it('changes module tier', async () => {
        await gateway.createMaintenanceSubscription({
            tenantId: 'tenant-1',
            tenantName: 'Store',
        });
        await gateway.addModuleToSubscription({
            tenantId: 'tenant-1',
            moduleKey: 'ecommerce',
            priceId: 'price_ecom_basic',
        });
        const result = await gateway.changeModuleTier({
            tenantId: 'tenant-1',
            moduleKey: 'ecommerce',
            newTierKey: 'pro',
            newPriceId: 'price_ecom_pro',
        });
        expect(result.error).toBeNull();
    });
    // ── Entitlements ──────────────────────────────────────────────────
    it('resolves entitlements from module subscriptions', async () => {
        await gateway.createMaintenanceSubscription({
            tenantId: 'tenant-1',
            tenantName: 'Store',
        });
        await gateway.addModuleToSubscription({
            tenantId: 'tenant-1',
            moduleKey: 'chatbot',
            priceId: 'price_chat',
        });
        const result = await gateway.resolveEntitlements('tenant-1');
        expect(result.entitlements).toHaveLength(1);
        expect(result.entitlements[0].moduleKey).toBe('chatbot');
        expect(result.error).toBeNull();
    });
    // ── Call Tracking ─────────────────────────────────────────────────
    it('tracks all method calls in .calls array', async () => {
        await gateway.createCustomer({
            tenantId: 'tenant-1',
            tenantName: 'Store',
        });
        await gateway.createMaintenanceSubscription({
            tenantId: 'tenant-1',
            tenantName: 'Store',
        });
        expect(gateway.calls).toHaveLength(2);
        expect(gateway.calls[0].method).toBe('createCustomer');
        expect(gateway.calls[1].method).toBe('createMaintenanceSubscription');
    });
    it('call entries include params and timestamps', async () => {
        await gateway.createCustomer({
            tenantId: 'tenant-42',
            tenantName: 'TestStore',
        });
        const call = gateway.calls[0];
        expect(call.method).toBe('createCustomer');
        expect(call.params).toBeDefined();
        expect(typeof call.timestamp).toBe('number');
    });
    // ── Reset ─────────────────────────────────────────────────────────
    it('reset() clears all state', async () => {
        await gateway.createCustomer({
            tenantId: 'tenant-1',
            tenantName: 'Store',
        });
        await gateway.createMaintenanceSubscription({
            tenantId: 'tenant-1',
            tenantName: 'Store',
        });
        gateway.reset();
        expect(gateway.calls).toHaveLength(0);
        const result = await gateway.getCustomer('tenant-1');
        expect(result.customerId).toBeNull();
    });
    // ── Interface Completeness ────────────────────────────────────────
    it('implements all 13 BillingGateway methods', () => {
        const methods = [
            'createCustomer',
            'getCustomer',
            'createPortalSession',
            'createMaintenanceSubscription',
            'getSubscription',
            'cancelSubscription',
            'createModuleCheckout',
            'addModuleToSubscription',
            'removeModuleFromSubscription',
            'changeModuleTier',
            'listModuleSubscriptions',
            'resolveEntitlements',
            'handleWebhook',
        ];
        for (const method of methods) {
            expect(typeof gateway[method]).toBe('function');
        }
    });
});
//# sourceMappingURL=mock-gateway.test.js.map