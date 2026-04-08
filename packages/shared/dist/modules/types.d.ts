/**
 * @module modules/types
 * @description ModuleRegistry types — Mercur-inspired module definition system.
 *
 * Each module is defined with:
 *   - Feature flags it controls
 *   - Plan limits it governs
 *   - Tiers with pricing
 *   - UI metadata (icon, color, routes)
 *   - Dependencies on other modules
 *
 * The registry is auto-derived from governance-contract.json at build time.
 * This eliminates manual hardcodes in feature-gate-config.ts and panel-policy.ts.
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */
/** Full module definition in the registry */
export interface ModuleRegistryEntry {
    /** Unique module key (matches DB `modules.key`) */
    key: string;
    /** Display name */
    name: string;
    /** Short description */
    description: string;
    /** Emoji icon for UI */
    icon: string;
    /** Module category for grouping */
    category: ModuleCategory;
    /** URL slugs for the BSWEB module detail page */
    bswSlug: Record<string, string>;
    /** Feature flags this module controls */
    flags: string[];
    /** Plan limits this module affects */
    limits: string[];
    /** Dependencies on other modules (must be active first) */
    dependencies: string[];
    /** Available tiers with pricing */
    tiers: ModuleTierDefinition[];
    /** Medusa integration surface (which Medusa entities/APIs this module touches) */
    medusaIntegration?: MedusaModuleIntegration;
    /** UI components this module provides */
    components?: ModuleComponent[];
}
/** Module category for grouping in UI */
export type ModuleCategory = 'commerce' | 'marketing' | 'communication' | 'management' | 'platform';
/** Tier within a module */
export interface ModuleTierDefinition {
    /** Tier level (1 = basic, 2 = pro, 3 = enterprise) */
    level: number;
    /** Tier display name */
    name: string;
    /** Pricing per currency */
    pricing: Record<string, {
        amount: number;
        interval: 'month' | 'year';
    }>;
    /** Flags enabled at this tier (additive — higher tiers include lower tier flags) */
    enabledFlags: string[];
    /** Limit overrides at this tier */
    limitOverrides: Record<string, number>;
    /** Stripe Price ID per currency */
    stripePriceIds?: Record<string, string>;
}
/** Describes how a module integrates with Medusa v2 */
export interface MedusaModuleIntegration {
    /** Custom Medusa module path (e.g., 'src/modules/loyalty') */
    modulePath?: string;
    /** Medusa entities this module produces or consumes */
    entities?: string[];
    /** Medusa workflows this module registers */
    workflows?: string[];
    /** Medusa events this module subscribes to */
    subscribers?: string[];
    /** Link modules: associations with core Medusa entities */
    links?: Array<{
        from: string;
        to: string;
        type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
    }>;
}
/** UI component provided by a module */
export interface ModuleComponent {
    type: 'page' | 'widget' | 'settings' | 'api';
    path: string;
    /** Owner Panel route (if type is 'page') */
    route?: string;
}
/** The complete module registry */
export interface ModuleRegistry {
    /** Schema version — bump on breaking changes */
    version: string;
    /** Last generated timestamp */
    generatedAt: string;
    /** Source file used for generation */
    source: string;
    /** All registered modules */
    modules: Record<string, ModuleRegistryEntry>;
}
/** Maps a feature flag key → the module that owns it */
export interface FeatureGateMapping {
    flag: string;
    moduleKey: string;
    moduleName: string;
    icon: string;
    bswSlug: Record<string, string>;
    /** Minimum tier level required for this flag */
    minTierLevel: number;
}
/** Defines Owner Panel access rules per module */
export interface PanelPolicyEntry {
    moduleKey: string;
    /** Owner Panel routes guarded by this module */
    routes: string[];
    /** Feature flag that must be true to access */
    requiredFlag: string;
    /** Minimum tier for full access (lower tiers may see limited UI) */
    minTier: number;
}
//# sourceMappingURL=types.d.ts.map