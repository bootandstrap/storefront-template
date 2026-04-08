/**
 * @module modules/registry
 * @description ModuleRegistry runtime — generates registry from governance-contract.json.
 *
 * The registry is the bridge between the governance contract (SSOT) and
 * the feature-gate-config.ts / panel-policy.ts that were previously hardcoded.
 *
 * Usage:
 *   import { createModuleRegistry, getFeatureGateMap } from '@bootandstrap/shared/modules'
 *   const registry = createModuleRegistry(contractJson)
 *   const gateMap = getFeatureGateMap(registry)
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */
import type { ModuleRegistry, ModuleRegistryEntry, FeatureGateMapping, PanelPolicyEntry } from './types';
/**
 * Build a ModuleRegistry from a governance-contract.json object.
 *
 * The contract provides:
 *   - modules[].key, name, tiers, flags, limits
 *   - flags.keys (all feature flag names)
 *   - limits.keys (all plan limit names)
 *
 * The registry enriches this with static metadata (icons, categories, etc.)
 * and computes derived data (feature gate mappings, panel policies).
 */
export declare function createModuleRegistry(contract: {
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
                stripe_price_ids?: Record<string, string>;
            }>;
        }>;
    };
    flags?: {
        keys: string[];
    };
    limits?: {
        keys: string[];
    };
}): ModuleRegistry;
/**
 * Generate the feature gate map from the registry.
 * This replaces the hardcoded FEATURE_GATE_MAP in feature-gate-config.ts.
 */
export declare function getFeatureGateMap(registry: ModuleRegistry): FeatureGateMapping[];
/**
 * Generate panel policy entries from the registry.
 * This replaces the hardcoded panel_routes in panel-policy.ts.
 */
export declare function getPanelPolicy(registry: ModuleRegistry): PanelPolicyEntry[];
/** Get a module by key */
export declare function getModule(registry: ModuleRegistry, key: string): ModuleRegistryEntry | undefined;
/** Get all modules in a category */
export declare function getModulesByCategory(registry: ModuleRegistry, category: ModuleRegistryEntry['category']): ModuleRegistryEntry[];
/** Check if a flag belongs to any module */
export declare function findModuleByFlag(registry: ModuleRegistry, flag: string): ModuleRegistryEntry | undefined;
//# sourceMappingURL=registry.d.ts.map