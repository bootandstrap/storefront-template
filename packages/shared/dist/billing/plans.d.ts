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
import type { BillingCurrency } from './types';
/** BootandStrap business model: maintenance + per-module subscriptions */
export interface PlansConfig {
    /** Monthly maintenance fee */
    maintenance: {
        name: string;
        prices: PricePerCurrency;
        trialDays: number;
        description: string;
    };
    /** One-time web base fee */
    webBase: {
        name: string;
        prices: PricePerCurrency;
        description: string;
    };
    /** Module add-on plans */
    modules: ModulePlan[];
}
/** Pricing per currency */
export interface PricePerCurrency {
    CHF: number;
    EUR: number;
    USD?: number;
}
/** A module plan with its tier options */
export interface ModulePlan {
    key: string;
    name: string;
    icon: string;
    description: string;
    category: string;
    popular: boolean;
    requires: string[];
    paymentType: 'subscription' | 'one_time' | 'extension';
    tiers: ModuleTierPlan[];
}
/** A tier within a module plan */
export interface ModuleTierPlan {
    key: string;
    name: string;
    level: number;
    price: PricePerCurrency;
    interval: 'month' | 'year' | 'one_time';
    features: string[];
    recommended: boolean;
    flagEffects: Record<string, boolean>;
    limitEffects: Record<string, number>;
    stripePriceIds?: Partial<Record<BillingCurrency, string>>;
}
/**
 * Derive the PlansConfig from a governance contract JSON.
 *
 * This replaces hardcoded pricing data with a single function that reads
 * the canonical contract and produces the full pricing structure.
 *
 * @param contract - Parsed governance-contract.json
 * @param options  - Override defaults (maintenance price, web base price, etc.)
 */
export declare function derivePlansFromContract(contract: {
    modules?: {
        catalog?: Array<{
            key: string;
            name: string;
            icon?: string;
            description?: string;
            category?: string;
            popular?: boolean;
            requires?: string[];
            payment_type?: string;
            tiers?: Array<{
                key: string;
                name: string;
                price_chf?: number;
                features?: string[];
                recommended?: boolean;
                flag_effects?: Record<string, boolean>;
                limit_effects?: Record<string, number>;
            }>;
        }>;
    };
}, options?: {
    maintenancePriceCHF?: number;
    maintenancePriceEUR?: number;
    webBasePriceCHF?: number;
    webBasePriceEUR?: number;
    trialDays?: number;
    chfToEurRate?: number;
}): PlansConfig;
/** Format price for display (e.g., "25 CHF/mo") */
export declare function formatPrice(price: number, currency: BillingCurrency, interval?: 'month' | 'year' | 'one_time'): string;
/** Get the cheapest tier price for a module */
export declare function getStartingPrice(module: ModulePlan, currency?: BillingCurrency): number | null;
/** Get the recommended tier for a module */
export declare function getRecommendedTier(module: ModulePlan): ModuleTierPlan | null;
//# sourceMappingURL=plans.d.ts.map