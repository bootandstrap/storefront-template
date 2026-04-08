/**
 * @module billing/__tests__/plans
 * @description Unit tests for plans config auto-derivation.
 *
 * Validates that derivePlansFromContract() correctly transforms
 * governance-contract.json into the PlansConfig structure.
 */
import { describe, it, expect } from 'vitest';
import { derivePlansFromContract, formatPrice, getStartingPrice, getRecommendedTier, } from '../plans';
// ── Mini contract for testing ─────────────────────────────────────────────
const MINI_CONTRACT = {
    modules: {
        catalog: [
            {
                key: 'chatbot',
                name: 'Chatbot IA',
                icon: '🤖',
                description: 'AI chatbot for customer support',
                category: 'engage',
                popular: true,
                requires: [],
                payment_type: 'subscription',
                tiers: [
                    {
                        key: 'basic',
                        name: 'Basic',
                        price_chf: 25,
                        features: ['Widget', '500 msgs/mo'],
                        recommended: false,
                        flag_effects: { enable_chatbot: true },
                        limit_effects: { max_chatbot_messages_month: 500 },
                    },
                    {
                        key: 'pro',
                        name: 'Pro',
                        price_chf: 40,
                        features: ['5000 msgs/mo', 'Analytics'],
                        recommended: true,
                        flag_effects: { enable_chatbot: true },
                        limit_effects: { max_chatbot_messages_month: 5000 },
                    },
                ],
            },
            {
                key: 'i18n',
                name: 'Multi-idioma',
                icon: '🌐',
                description: 'Multiple languages',
                category: 'sell',
                popular: false,
                requires: [],
                payment_type: 'one_time',
                tiers: [
                    {
                        key: 'basic',
                        name: 'Basic',
                        price_chf: 50,
                        features: ['3 languages'],
                        recommended: false,
                        flag_effects: { enable_multi_language: true },
                        limit_effects: { max_languages: 3 },
                    },
                ],
            },
        ],
    },
};
describe('Plans Config', () => {
    describe('derivePlansFromContract', () => {
        it('produces correct PlansConfig structure', () => {
            const config = derivePlansFromContract(MINI_CONTRACT);
            expect(config.maintenance).toBeDefined();
            expect(config.webBase).toBeDefined();
            expect(config.modules).toHaveLength(2);
        });
        it('has correct maintenance defaults', () => {
            const config = derivePlansFromContract(MINI_CONTRACT);
            expect(config.maintenance.prices.CHF).toBe(40);
            expect(config.maintenance.trialDays).toBe(30);
        });
        it('has correct webBase defaults', () => {
            const config = derivePlansFromContract(MINI_CONTRACT);
            expect(config.webBase.prices.CHF).toBe(1500);
        });
        it('converts module catalog entries correctly', () => {
            const config = derivePlansFromContract(MINI_CONTRACT);
            const chatbot = config.modules.find(m => m.key === 'chatbot');
            expect(chatbot.name).toBe('Chatbot IA');
            expect(chatbot.icon).toBe('🤖');
            expect(chatbot.popular).toBe(true);
            expect(chatbot.paymentType).toBe('subscription');
            expect(chatbot.tiers).toHaveLength(2);
        });
        it('converts tier price to EUR using rate', () => {
            const config = derivePlansFromContract(MINI_CONTRACT, { chfToEurRate: 1.1 });
            const chatbot = config.modules.find(m => m.key === 'chatbot');
            expect(chatbot.tiers[0].price.CHF).toBe(25);
            expect(chatbot.tiers[0].price.EUR).toBe(28); // 25 * 1.1 = 27.5 → rounds to 28
        });
        it('preserves flag and limit effects', () => {
            const config = derivePlansFromContract(MINI_CONTRACT);
            const chatbot = config.modules.find(m => m.key === 'chatbot');
            expect(chatbot.tiers[0].flagEffects).toEqual({ enable_chatbot: true });
            expect(chatbot.tiers[0].limitEffects).toEqual({ max_chatbot_messages_month: 500 });
        });
        it('assigns tier levels starting at 1', () => {
            const config = derivePlansFromContract(MINI_CONTRACT);
            const chatbot = config.modules.find(m => m.key === 'chatbot');
            expect(chatbot.tiers[0].level).toBe(1);
            expect(chatbot.tiers[1].level).toBe(2);
        });
        it('sets interval to one_time for one_time payment type', () => {
            const config = derivePlansFromContract(MINI_CONTRACT);
            const i18n = config.modules.find(m => m.key === 'i18n');
            expect(i18n.tiers[0].interval).toBe('one_time');
        });
        it('allows overriding maintenance price', () => {
            const config = derivePlansFromContract(MINI_CONTRACT, {
                maintenancePriceCHF: 60,
            });
            expect(config.maintenance.prices.CHF).toBe(60);
        });
        it('handles empty contract', () => {
            const config = derivePlansFromContract({ modules: { catalog: [] } });
            expect(config.modules).toHaveLength(0);
        });
    });
    describe('formatPrice', () => {
        it('formats monthly subscription', () => {
            expect(formatPrice(25, 'CHF', 'month')).toBe('25 CHF/mo');
        });
        it('formats yearly subscription', () => {
            expect(formatPrice(299, 'EUR', 'year')).toBe('299 EUR/yr');
        });
        it('formats one-time payment', () => {
            expect(formatPrice(1500, 'CHF', 'one_time')).toBe('1\'500 CHF');
        });
    });
    describe('getStartingPrice', () => {
        it('returns cheapest tier price', () => {
            const config = derivePlansFromContract(MINI_CONTRACT);
            const chatbot = config.modules.find(m => m.key === 'chatbot');
            expect(getStartingPrice(chatbot, 'CHF')).toBe(25);
        });
        it('returns null for empty tiers', () => {
            expect(getStartingPrice({ tiers: [] }, 'CHF')).toBeNull();
        });
    });
    describe('getRecommendedTier', () => {
        it('returns the recommended tier', () => {
            const config = derivePlansFromContract(MINI_CONTRACT);
            const chatbot = config.modules.find(m => m.key === 'chatbot');
            const recommended = getRecommendedTier(chatbot);
            expect(recommended?.key).toBe('pro');
            expect(recommended?.recommended).toBe(true);
        });
        it('returns first tier if none recommended', () => {
            const config = derivePlansFromContract(MINI_CONTRACT);
            const i18n = config.modules.find(m => m.key === 'i18n');
            const recommended = getRecommendedTier(i18n);
            expect(recommended?.key).toBe('basic');
        });
    });
});
//# sourceMappingURL=plans.test.js.map