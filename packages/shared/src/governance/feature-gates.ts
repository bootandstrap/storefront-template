/**
 * Feature Gate Types — Canonical type definitions for module↔flag mapping
 *
 * @locked 🔴 CANONICAL — ecommerce-template/packages/shared is the source of truth.
 * Both storefront (feature-gate-config.ts) and BSWEB (module-flag-bridge.ts) must align.
 */

/**
 * All module keys in the BootandStrap platform.
 * Each module can have tiers that unlock different feature flags and limits.
 *
 * Kept as a union type (not enum) for lightweight usage across repos.
 */
export type ModuleKey =
    | 'auth_advanced'
    | 'automation'
    | 'capacidad'
    | 'chatbot'
    | 'crm'
    | 'ecommerce'
    | 'email_marketing'
    | 'i18n'
    | 'pos'
    | 'rrss'
    | 'sales_channels'
    | 'seo'

/**
 * Entry in the FEATURE_GATE_MAP — maps a feature flag to its owning module
 * and BSWEB page URLs for upsell UX.
 */
export interface FeatureGateEntry {
    /** Module key in the `modules` table */
    moduleKey: ModuleKey | string
    /** Display name key for i18n (e.g. 'featureGate.modules.ecommerce') */
    moduleNameKey: string
    /** Emoji for the upsell card */
    icon: string
    /** Localized slugs for the BSWEB module page by locale */
    bswSlug: Record<string, string>
}
