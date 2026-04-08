/**
 * @module modules/__tests__/medusa-router.test
 * @description Tests for MedusaModuleRouter — governance → Medusa action mapping.
 */
import { describe, it, expect } from 'vitest';
import { MedusaModuleRouter } from '../medusa-router';
// ── Test Fixtures ─────────────────────────────────────────────────────────
const mockModules = {
    ecommerce: {
        key: 'ecommerce',
        name: 'E-Commerce',
        description: 'Full online store capabilities',
        icon: '🛒',
        category: 'commerce',
        bswSlug: { es: 'ecommerce', en: 'ecommerce' },
        flags: ['enable_ecommerce'],
        limits: ['max_products'],
        dependencies: [],
        tiers: [
            {
                level: 1,
                name: 'Básico',
                pricing: { CHF: { amount: 29, interval: 'month' } },
                enabledFlags: ['enable_ecommerce'],
                limitOverrides: { max_products: 50 },
            },
            {
                level: 2,
                name: 'Pro',
                pricing: { CHF: { amount: 49, interval: 'month' } },
                enabledFlags: ['enable_ecommerce', 'enable_advanced_filters'],
                limitOverrides: { max_products: 500 },
            },
        ],
        medusaIntegration: {
            modulePath: 'src/modules/ecommerce',
            entities: ['Product', 'CartCompletion'],
            workflows: ['create-order-flow', 'process-payment-flow'],
            subscribers: ['order.placed', 'order.completed', 'product.updated'],
            links: [
                { from: 'product', to: 'category', type: 'many-to-many' },
            ],
        },
    },
    seo: {
        key: 'seo',
        name: 'SEO',
        description: 'Search engine optimization tools',
        icon: '🔍',
        category: 'marketing',
        bswSlug: { es: 'seo', en: 'seo' },
        flags: ['enable_seo_tools'],
        limits: [],
        dependencies: [],
        tiers: [
            {
                level: 1,
                name: 'Básico',
                pricing: { CHF: { amount: 15, interval: 'month' } },
                enabledFlags: ['enable_seo_tools'],
                limitOverrides: {},
            },
        ],
        // No medusaIntegration — SEO is storefront-only
    },
    chatbot: {
        key: 'chatbot',
        name: 'Chatbot',
        description: 'AI-powered chatbot',
        icon: '🤖',
        category: 'communication',
        bswSlug: { es: 'chatbot', en: 'chatbot' },
        flags: ['enable_chatbot'],
        limits: ['max_chatbot_messages'],
        dependencies: [],
        tiers: [
            {
                level: 1,
                name: 'Básico',
                pricing: { CHF: { amount: 20, interval: 'month' } },
                enabledFlags: ['enable_chatbot'],
                limitOverrides: { max_chatbot_messages: 1000 },
            },
        ],
        medusaIntegration: {
            subscribers: ['order.placed'], // Chatbot listens to orders for notifications
        },
    },
};
// ── Tests ─────────────────────────────────────────────────────────────────
describe('MedusaModuleRouter', () => {
    const router = new MedusaModuleRouter(mockModules);
    // ── Activation ────────────────────────────────────────────────────
    describe('Activation', () => {
        it('produces complete action set for module with full integration', () => {
            const result = router.route({
                type: 'activate',
                tenantId: 'tenant-1',
                moduleKey: 'ecommerce',
                newTierLevel: 1,
                previousTierLevel: 0,
            });
            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
            // Should have: configure_module + 3 subscribers + 2 workflows + 1 link + 1 seed
            expect(result.actions.length).toBe(8);
            // Check action types are present
            const types = result.actions.map(a => a.type);
            expect(types).toContain('configure_module');
            expect(types).toContain('register_subscriber');
            expect(types).toContain('enable_workflow');
            expect(types).toContain('create_link');
            expect(types).toContain('seed_data');
        });
        it('sets correct tenantId and moduleKey on all actions', () => {
            const result = router.route({
                type: 'activate',
                tenantId: 'tenant-abc',
                moduleKey: 'ecommerce',
                newTierLevel: 2,
                previousTierLevel: 0,
            });
            for (const action of result.actions) {
                expect(action.tenantId).toBe('tenant-abc');
                expect(action.moduleKey).toBe('ecommerce');
                expect(action.tierLevel).toBe(2);
            }
        });
        it('orders actions by priority (module first, data last)', () => {
            const result = router.route({
                type: 'activate',
                tenantId: 'tenant-1',
                moduleKey: 'ecommerce',
                newTierLevel: 1,
                previousTierLevel: 0,
            });
            const priorities = result.actions.map(a => a.priority);
            // Should be sorted ascending
            for (let i = 1; i < priorities.length; i++) {
                expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i - 1]);
            }
            // Module config should come first
            expect(result.actions[0].type).toBe('configure_module');
        });
        it('marks all actions as idempotent', () => {
            const result = router.route({
                type: 'activate',
                tenantId: 'tenant-1',
                moduleKey: 'ecommerce',
                newTierLevel: 1,
                previousTierLevel: 0,
            });
            for (const action of result.actions) {
                expect(action.idempotent).toBe(true);
            }
        });
        it('returns warning for module without Medusa integration', () => {
            const result = router.route({
                type: 'activate',
                tenantId: 'tenant-1',
                moduleKey: 'seo',
                newTierLevel: 1,
                previousTierLevel: 0,
            });
            expect(result.success).toBe(true);
            expect(result.actions).toHaveLength(0);
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0]).toContain('no medusaIntegration');
        });
        it('returns minimal actions for module with partial integration', () => {
            const result = router.route({
                type: 'activate',
                tenantId: 'tenant-1',
                moduleKey: 'chatbot',
                newTierLevel: 1,
                previousTierLevel: 0,
            });
            expect(result.success).toBe(true);
            expect(result.actions).toHaveLength(1); // Only 1 subscriber
            expect(result.actions[0].type).toBe('register_subscriber');
        });
    });
    // ── Upgrade ───────────────────────────────────────────────────────
    describe('Upgrade', () => {
        it('re-produces all actions with new tier level', () => {
            const result = router.route({
                type: 'upgrade',
                tenantId: 'tenant-1',
                moduleKey: 'ecommerce',
                newTierLevel: 2,
                previousTierLevel: 1,
            });
            expect(result.success).toBe(true);
            expect(result.actions.length).toBe(8);
            // All actions should have tier 2
            for (const action of result.actions) {
                expect(action.tierLevel).toBe(2);
            }
        });
    });
    // ── Downgrade ─────────────────────────────────────────────────────
    describe('Downgrade', () => {
        it('re-produces actions with lower tier level', () => {
            const result = router.route({
                type: 'downgrade',
                tenantId: 'tenant-1',
                moduleKey: 'ecommerce',
                newTierLevel: 1,
                previousTierLevel: 2,
            });
            expect(result.success).toBe(true);
            for (const action of result.actions) {
                expect(action.tierLevel).toBe(1);
            }
        });
    });
    // ── Deactivation ──────────────────────────────────────────────────
    describe('Deactivation', () => {
        it('produces cleanup actions in reverse order', () => {
            const result = router.route({
                type: 'deactivate',
                tenantId: 'tenant-1',
                moduleKey: 'ecommerce',
                newTierLevel: 0,
                previousTierLevel: 1,
            });
            expect(result.success).toBe(true);
            // Should have: cleanup_data + 1 remove_link + 2 disable_workflow + 3 unregister_subscriber
            expect(result.actions.length).toBe(7);
            const types = result.actions.map(a => a.type);
            expect(types).toContain('cleanup_data');
            expect(types).toContain('remove_link');
            expect(types).toContain('disable_workflow');
            expect(types).toContain('unregister_subscriber');
        });
        it('sets tierLevel to 0 on all deactivation actions', () => {
            const result = router.route({
                type: 'deactivate',
                tenantId: 'tenant-1',
                moduleKey: 'ecommerce',
                newTierLevel: 0,
                previousTierLevel: 2,
            });
            for (const action of result.actions) {
                expect(action.tierLevel).toBe(0);
            }
        });
    });
    // ── Error cases ───────────────────────────────────────────────────
    describe('Error cases', () => {
        it('fails for unknown module key', () => {
            const result = router.route({
                type: 'activate',
                tenantId: 'tenant-1',
                moduleKey: 'nonexistent',
                newTierLevel: 1,
                previousTierLevel: 0,
            });
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('not found in registry');
        });
    });
    // ── Utility methods ───────────────────────────────────────────────
    describe('Utility methods', () => {
        it('getMedusaModules() returns only modules with integration', () => {
            const medusaModules = router.getMedusaModules();
            expect(medusaModules).toContain('ecommerce');
            expect(medusaModules).toContain('chatbot');
            expect(medusaModules).not.toContain('seo');
        });
        it('getIntegration() returns metadata for valid module', () => {
            const integration = router.getIntegration('ecommerce');
            expect(integration).toBeDefined();
            expect(integration.modulePath).toBe('src/modules/ecommerce');
            expect(integration.workflows).toHaveLength(2);
        });
        it('getIntegration() returns undefined for non-Medusa module', () => {
            expect(router.getIntegration('seo')).toBeUndefined();
        });
        it('getIntegration() returns undefined for unknown module', () => {
            expect(router.getIntegration('nonexistent')).toBeUndefined();
        });
    });
});
//# sourceMappingURL=medusa-router.test.js.map