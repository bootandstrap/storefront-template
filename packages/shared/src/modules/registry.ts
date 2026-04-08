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

import type {
    ModuleRegistry,
    ModuleRegistryEntry,
    FeatureGateMapping,
    PanelPolicyEntry,
    ModuleCategory,
} from './types'

// ── Module metadata (static — doesn't change per contract version) ────────

interface ModuleMeta {
    icon: string
    category: ModuleCategory
    bswSlug: Record<string, string>
    description: string
}

const MODULE_METADATA: Record<string, ModuleMeta> = {
    ecommerce: {
        icon: '🛒',
        category: 'commerce',
        bswSlug: { es: '/modulos/ecommerce', en: '/modules/ecommerce' },
        description: 'Full e-commerce with products, categories, orders, and Medusa backend',
    },
    pos: {
        icon: '💳',
        category: 'commerce',
        bswSlug: { es: '/modulos/pos', en: '/modules/pos' },
        description: 'Point of Sale terminal for physical store transactions',
    },
    pos_kiosk: {
        icon: '🖥️',
        category: 'commerce',
        bswSlug: { es: '/modulos/pos-kiosk', en: '/modules/pos-kiosk' },
        description: 'Self-service kiosk mode for unattended sales',
    },
    chatbot: {
        icon: '🤖',
        category: 'communication',
        bswSlug: { es: '/modulos/chatbot', en: '/modules/chatbot' },
        description: 'AI-powered customer support chatbot',
    },
    crm: {
        icon: '👥',
        category: 'management',
        bswSlug: { es: '/modulos/crm', en: '/modules/crm' },
        description: 'Customer Relationship Management with contacts, segments, and interactions',
    },
    email_marketing: {
        icon: '📧',
        category: 'marketing',
        bswSlug: { es: '/modulos/email-marketing', en: '/modules/email-marketing' },
        description: 'Email campaigns, abandoned cart recovery, and transactional emails',
    },
    seo: {
        icon: '🔍',
        category: 'marketing',
        bswSlug: { es: '/modulos/seo', en: '/modules/seo' },
        description: 'SEO optimization tools and meta tag management',
    },
    rrss: {
        icon: '📱',
        category: 'marketing',
        bswSlug: { es: '/modulos/redes-sociales', en: '/modules/social-media' },
        description: 'Social media integration and sharing',
    },
    automation: {
        icon: '⚡',
        category: 'marketing',
        bswSlug: { es: '/modulos/automatizacion', en: '/modules/automation' },
        description: 'Workflow automation and custom webhooks',
    },
    auth_advanced: {
        icon: '🔐',
        category: 'platform',
        bswSlug: { es: '/modulos/autenticacion-avanzada', en: '/modules/advanced-auth' },
        description: 'Advanced authentication: Apple/Facebook OAuth, 2FA, magic links',
    },
    i18n: {
        icon: '🌍',
        category: 'platform',
        bswSlug: { es: '/modulos/internacionalizacion', en: '/modules/i18n' },
        description: 'Multi-language and multi-currency support',
    },
    sales_channels: {
        icon: '📞',
        category: 'communication',
        bswSlug: { es: '/modulos/canales-venta', en: '/modules/sales-channels' },
        description: 'WhatsApp, phone, and multi-channel sales integration',
    },
    capacidad: {
        icon: '📈',
        category: 'management',
        bswSlug: { es: '/modulos/capacidad', en: '/modules/capacity' },
        description: 'Traffic monitoring, auto-scaling, and capacity management',
    },
}

// ── Medusa Integration Definitions ────────────────────────────────────────
// Defines how each governance module maps to Medusa v2 entities, workflows,
// subscribers, and link modules. This is static architecture metadata.

import type { MedusaModuleIntegration } from './types'

const MEDUSA_INTEGRATIONS: Record<string, MedusaModuleIntegration> = {
    ecommerce: {
        modulePath: 'src/modules/ecommerce-extensions',
        entities: ['Product', 'ProductCategory', 'Cart', 'Order', 'Fulfillment'],
        workflows: [
            'create-order-flow',
            'process-payment-flow',
            'process-refund-flow',
            'cancel-order-with-inventory',
        ],
        subscribers: [
            'order.placed',
            'order.completed',
            'order.canceled',
            'order.shipment_created',
            'product.updated',
            'product.deleted',
        ],
        links: [
            { from: 'product', to: 'category', type: 'many-to-many' },
        ],
    },
    pos: {
        modulePath: 'src/modules/pos',
        entities: ['POSSession', 'POSTransaction'],
        workflows: [
            'process-pos-sale',
            'close-pos-session',
        ],
        subscribers: [
            'order.placed',      // POS orders also trigger order events
            'inventory.updated', // Stock sync after POS sale
        ],
        links: [
            { from: 'order', to: 'pos_session', type: 'one-to-one' },
        ],
    },
    pos_kiosk: {
        modulePath: 'src/modules/pos-kiosk',
        entities: ['KioskTerminal', 'KioskSession'],
        workflows: [
            'kiosk-self-checkout',
        ],
        subscribers: [
            'order.placed',
        ],
        links: [
            { from: 'pos_session', to: 'kiosk_terminal', type: 'many-to-one' },
        ],
    },
    chatbot: {
        entities: ['ChatConversation', 'ChatMessage'],
        subscribers: [
            'order.placed',       // Notify customer via chatbot
            'order.shipment_created', // Shipping notification
        ],
    },
    crm: {
        modulePath: 'src/modules/crm',
        entities: ['CRMContact', 'CRMSegment', 'CRMInteraction'],
        workflows: [
            'sync-customer-to-crm',
            'segment-customers',
        ],
        subscribers: [
            'customer.created',
            'customer.updated',
            'order.completed',   // Update customer lifetime value
        ],
        links: [
            { from: 'customer', to: 'crm_contact', type: 'one-to-one' },
        ],
    },
    email_marketing: {
        entities: ['EmailCampaign', 'EmailTemplate', 'EmailSend'],
        workflows: [
            'send-email-campaign',
            'abandoned-cart-recovery',
        ],
        subscribers: [
            'order.placed',          // Post-purchase email
            'order.completed',       // Review request email
            'customer.created',      // Welcome email
        ],
        links: [
            { from: 'customer', to: 'email_subscriber', type: 'one-to-one' },
        ],
    },
    seo: {
        // SEO is storefront-only — no direct Medusa integration
        // Metadata is managed via product.metadata and storefront Next.js
        entities: ['ProductSEO'],
        subscribers: [
            'product.created',   // Generate default meta tags
            'product.updated',   // Update sitemap
        ],
    },
    rrss: {
        // Social media sharing — storefront + webhook based
        entities: ['SocialPost'],
        subscribers: [
            'product.created',   // Auto-share new products
        ],
    },
    automation: {
        modulePath: 'src/modules/automation',
        entities: ['AutomationRule', 'AutomationExecution'],
        workflows: [
            'execute-automation-rule',
            'evaluate-automation-triggers',
        ],
        subscribers: [
            'order.placed',
            'order.completed',
            'customer.created',
            'product.updated',
            'inventory.updated',
        ],
    },
    auth_advanced: {
        // Auth is Supabase-based — Medusa uses its own auth middleware
        // No direct Medusa module needed, but subscriber for session tracking
        subscribers: [
            'customer.created',  // Sync advanced auth providers
        ],
    },
    i18n: {
        // i18n maps to Medusa's native region/currency system
        entities: ['TranslationOverride'],
        workflows: [
            'sync-product-translations',
        ],
        subscribers: [
            'product.created',   // Generate translation stubs
            'region.created',    // Sync currencies
        ],
    },
    sales_channels: {
        // Maps directly to Medusa's SalesChannel entity
        entities: ['SalesChannel'],
        workflows: [
            'configure-sales-channel',
        ],
        subscribers: [
            'order.placed',      // Route to correct channel
        ],
        links: [
            { from: 'product', to: 'sales_channel', type: 'many-to-many' },
        ],
    },
    capacidad: {
        // Capacity management — reads from Medusa analytics
        entities: ['CapacitySnapshot'],
        subscribers: [
            'order.placed',      // Track order volume
        ],
    },
}

// ── Registry Builder ──────────────────────────────────────────────────────

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
export function createModuleRegistry(contract: {
    modules?: {
        catalog?: Array<{
            key: string
            name: string
            icon?: string
            description?: string
            category?: string
            popular?: boolean
            requires?: string[]
            payment_type?: string
            tiers?: Array<{
                key: string
                name: string
                price_chf?: number
                features?: string[]
                recommended?: boolean
                flag_effects?: Record<string, boolean>
                limit_effects?: Record<string, number>
                stripe_price_ids?: Record<string, string>
            }>
        }>
    }
    flags?: { keys: string[] }
    limits?: { keys: string[] }
}): ModuleRegistry {
    const modules: Record<string, ModuleRegistryEntry> = {}

    for (const mod of contract.modules?.catalog ?? []) {
        const meta = MODULE_METADATA[mod.key] ?? {
            icon: mod.icon ?? '📦',
            category: (mod.category ?? 'platform') as ModuleCategory,
            bswSlug: { es: `/modulos/${mod.key}`, en: `/modules/${mod.key}` },
            description: mod.description ?? mod.name,
        }

        // Collect all flags across all tiers (from flag_effects)
        const allFlags = new Set<string>()
        const allLimits = new Set<string>()

        const tiers = (mod.tiers ?? []).map((tier, index) => {
            const flagEffects = tier.flag_effects ?? {}
            const limitEffects = tier.limit_effects ?? {}

            for (const f of Object.keys(flagEffects)) allFlags.add(f)
            for (const l of Object.keys(limitEffects)) allLimits.add(l)

            return {
                level: index + 1,
                name: tier.name,
                pricing: {
                    CHF: { amount: tier.price_chf ?? 0, interval: 'month' as const },
                } as Record<string, { amount: number; interval: 'month' | 'year' }>,
                enabledFlags: Object.entries(flagEffects)
                    .filter(([, v]) => v === true)
                    .map(([k]) => k),
                limitOverrides: limitEffects,
                stripePriceIds: tier.stripe_price_ids,
            }
        })

        // Compute dependencies from contract
        const dependencies: string[] = mod.requires ?? []

        modules[mod.key] = {
            key: mod.key,
            name: mod.name,
            description: mod.description ?? meta.description,
            icon: mod.icon ?? meta.icon,
            category: (mod.category ?? meta.category) as ModuleCategory,
            bswSlug: meta.bswSlug,
            flags: Array.from(allFlags),
            limits: Array.from(allLimits),
            dependencies,
            tiers,
            medusaIntegration: MEDUSA_INTEGRATIONS[mod.key],
        }
    }

    // Create registry object with helper methods
    const registry: ModuleRegistry = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        source: 'governance-contract.json',
        modules,
    }

    // Attach convenience methods
    ;(registry as ModuleRegistryWithHelpers).getAllModules = () => Object.values(modules)
    ;(registry as ModuleRegistryWithHelpers).getFeatureGateMap = () => getFeatureGateMap(registry)
    ;(registry as ModuleRegistryWithHelpers).getPanelPolicy = () => getPanelPolicy(registry)

    return registry
}

// Helper type for registries with convenience methods
interface ModuleRegistryWithHelpers extends ModuleRegistry {
    getAllModules(): ModuleRegistryEntry[]
    getFeatureGateMap(): FeatureGateMapping[]
    getPanelPolicy(): PanelPolicyEntry[]
}

// ── Derived Data: Feature Gate Map ─────────────────────────────────────────

/**
 * Generate the feature gate map from the registry.
 * This replaces the hardcoded FEATURE_GATE_MAP in feature-gate-config.ts.
 */
export function getFeatureGateMap(registry: ModuleRegistry): FeatureGateMapping[] {
    const mappings: FeatureGateMapping[] = []

    for (const mod of Object.values(registry.modules)) {
        for (const flag of mod.flags) {
            // Find the minimum tier that enables this flag
            let minTier = 1
            for (const tier of mod.tiers) {
                if (tier.enabledFlags.includes(flag)) {
                    minTier = tier.level
                    break
                }
            }

            mappings.push({
                flag,
                moduleKey: mod.key,
                moduleName: mod.name,
                icon: mod.icon,
                bswSlug: mod.bswSlug,
                minTierLevel: minTier,
            })
        }
    }

    return mappings
}

// ── Derived Data: Panel Policy ────────────────────────────────────────────

/**
 * Generate panel policy entries from the registry.
 * This replaces the hardcoded panel_routes in panel-policy.ts.
 */
export function getPanelPolicy(registry: ModuleRegistry): PanelPolicyEntry[] {
    const policies: PanelPolicyEntry[] = []

    // Standard route patterns: /panel/{module}/*
    const routePatterns: Record<string, string[]> = {
        pos: ['/panel/pos', '/panel/pos/*'],
        pos_kiosk: ['/panel/pos/kiosk', '/panel/pos/kiosk/*'],
        crm: ['/panel/crm', '/panel/crm/*'],
        email_marketing: ['/panel/email', '/panel/email/*'],
        chatbot: ['/panel/chatbot', '/panel/chatbot/*'],
        seo: ['/panel/seo', '/panel/seo/*'],
        rrss: ['/panel/social', '/panel/social/*'],
        automation: ['/panel/automation', '/panel/automation/*'],
        sales_channels: ['/panel/sales-channels', '/panel/sales-channels/*'],
        capacidad: ['/panel/capacity', '/panel/capacity/*'],
    }

    for (const mod of Object.values(registry.modules)) {
        // Find the primary flag (first one in the module's flag list, usually enable_{module})
        const primaryFlag = mod.flags.find(f => f === `enable_${mod.key}`) || mod.flags[0]
        if (!primaryFlag) continue

        policies.push({
            moduleKey: mod.key,
            routes: routePatterns[mod.key] || [`/panel/${mod.key}`, `/panel/${mod.key}/*`],
            requiredFlag: primaryFlag,
            minTier: 1,
        })
    }

    return policies
}

// ── Utility: Lookup helpers ───────────────────────────────────────────────

/** Get a module by key */
export function getModule(registry: ModuleRegistry, key: string): ModuleRegistryEntry | undefined {
    return registry.modules[key]
}

/** Get all modules in a category */
export function getModulesByCategory(registry: ModuleRegistry, category: ModuleRegistryEntry['category']): ModuleRegistryEntry[] {
    return Object.values(registry.modules).filter(m => m.category === category)
}

/** Check if a flag belongs to any module */
export function findModuleByFlag(registry: ModuleRegistry, flag: string): ModuleRegistryEntry | undefined {
    return Object.values(registry.modules).find(m => m.flags.includes(flag))
}
