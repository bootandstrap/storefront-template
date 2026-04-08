/**
 * @module billing/plans
 * @description Auto-derivable plans configuration from governance-contract.json.
 *
 * This file provides the Makerkit-inspired `PlansConfig` pattern:
 *   - Declarative plan definitions
 *   - Module pricing, features, and flag/limit effects
 *   - Auto-derived from governance contract at build time
 *
 * Usage:
 *   import { derivePlansFromContract, type PlanConfig } from '@bootandstrap/shared/billing'
 *
 * The key insight: our "plans" are actually per-module tiers, not platform-wide tiers.
 * Each module defines its own tier hierarchy with independent pricing.
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */
// ── Contract → Plans Derivation ───────────────────────────────────────────
/**
 * Derive the PlansConfig from a governance contract JSON.
 *
 * This replaces hardcoded pricing data with a single function that reads
 * the canonical contract and produces the full pricing structure.
 *
 * @param contract - Parsed governance-contract.json
 * @param options  - Override defaults (maintenance price, web base price, etc.)
 */
export function derivePlansFromContract(contract, options = {}) {
    const rate = options.chfToEurRate ?? 1.1; // CHF → EUR approximate rate
    const config = {
        maintenance: {
            name: 'Mantenimiento Mensual',
            prices: {
                CHF: options.maintenancePriceCHF ?? 40,
                EUR: options.maintenancePriceEUR ?? Math.round((options.maintenancePriceCHF ?? 40) * rate),
            },
            trialDays: options.trialDays ?? 30,
            description: 'Hosting, SSL, actualizaciones de seguridad y soporte técnico',
        },
        webBase: {
            name: 'Web Base',
            prices: {
                CHF: options.webBasePriceCHF ?? 1500,
                EUR: options.webBasePriceEUR ?? Math.round((options.webBasePriceCHF ?? 1500) * rate),
            },
            description: 'Desarrollo y configuración inicial de la web',
        },
        modules: [],
    };
    // Convert catalog entries to ModulePlan
    for (const mod of contract.modules?.catalog ?? []) {
        const tiers = (mod.tiers ?? []).map((tier, index) => ({
            key: tier.key,
            name: tier.name,
            level: index + 1,
            price: {
                CHF: tier.price_chf ?? 0,
                EUR: Math.round((tier.price_chf ?? 0) * rate),
            },
            interval: mod.payment_type === 'one_time' ? 'one_time' : 'month',
            features: tier.features ?? [],
            recommended: tier.recommended ?? false,
            flagEffects: tier.flag_effects ?? {},
            limitEffects: tier.limit_effects ?? {},
        }));
        config.modules.push({
            key: mod.key,
            name: mod.name,
            icon: mod.icon ?? '📦',
            description: mod.description ?? '',
            category: mod.category ?? 'platform',
            popular: mod.popular ?? false,
            requires: mod.requires ?? [],
            paymentType: (mod.payment_type ?? 'subscription'),
            tiers,
        });
    }
    return config;
}
// ── Utility: Get pricing for display ──────────────────────────────────────
/** Format price for display (e.g., "25 CHF/mo") */
export function formatPrice(price, currency, interval = 'month') {
    const formatted = new Intl.NumberFormat('de-CH', {
        style: 'decimal',
        minimumFractionDigits: 0,
    }).format(price);
    if (interval === 'one_time')
        return `${formatted} ${currency}`;
    return `${formatted} ${currency}/${interval === 'month' ? 'mo' : 'yr'}`;
}
/** Get the cheapest tier price for a module */
export function getStartingPrice(module, currency = 'CHF') {
    if (module.tiers.length === 0)
        return null;
    return Math.min(...module.tiers.map(t => t.price[currency] ?? Infinity));
}
/** Get the recommended tier for a module */
export function getRecommendedTier(module) {
    return module.tiers.find(t => t.recommended) ?? module.tiers[0] ?? null;
}
//# sourceMappingURL=plans.js.map