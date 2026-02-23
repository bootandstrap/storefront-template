/**
 * Feature Gate Config — Maps flags to modules and BSWEB page URLs
 *
 * Used by <FeatureGate> to show the correct upsell screen
 * with a CTA linking to the BSWEB module info page.
 *
 * Every flag that gates a panel page MUST have an entry here.
 * See __tests__/feature-gate-config.test.ts for coverage enforcement.
 */

/** BSWEB base domain (no trailing slash) */
export const BSWEB_BASE_URL = 'https://bootandstrap.com'

export interface FeatureGateEntry {
    /** Module key in the `modules` table */
    moduleKey: string
    /** Display name for the module (i18n key, e.g. 'modules.cms.title') */
    moduleNameKey: string
    /** Emoji for the upsell card */
    icon: string
    /** Localized slugs for the BSWEB module page */
    bswSlug: Record<string, string>
}

/**
 * Complete mapping: flag_key → module info + BSWEB slug
 *
 * ⚠️ Add entries here whenever a new flag-gated panel page is created.
 * The automated test will catch missing entries.
 */
export const FEATURE_GATE_MAP: Record<string, FeatureGateEntry> = {
    // ── Panel pages ─────────────────────────────────────────────
    enable_analytics: {
        moduleKey: 'seo',
        moduleNameKey: 'featureGate.modules.analytics',
        icon: '📊',
        bswSlug: {
            es: 'seo-modular',
            en: 'seo',
            de: 'seo',
            fr: 'seo',
            it: 'seo',
        },
    },
    enable_chatbot: {
        moduleKey: 'whatsapp_bot',
        moduleNameKey: 'featureGate.modules.chatbot',
        icon: '🤖',
        bswSlug: {
            es: 'bot-whatsapp',
            en: 'whatsapp-bot',
            de: 'whatsapp-bot',
            fr: 'whatsapp-bot',
            it: 'whatsapp-bot',
        },
    },
    enable_carousel: {
        moduleKey: 'cms',
        moduleNameKey: 'featureGate.modules.carousel',
        icon: '🎠',
        bswSlug: {
            es: 'cms-contenido',
            en: 'cms-content',
            de: 'cms-inhalte',
            fr: 'cms-contenu',
            it: 'cms-contenuti',
        },
    },
    enable_cms_pages: {
        moduleKey: 'cms',
        moduleNameKey: 'featureGate.modules.cmsPages',
        icon: '📄',
        bswSlug: {
            es: 'cms-contenido',
            en: 'cms-content',
            de: 'cms-inhalte',
            fr: 'cms-contenu',
            it: 'cms-contenuti',
        },
    },
    enable_whatsapp_checkout: {
        moduleKey: 'whatsapp',
        moduleNameKey: 'featureGate.modules.whatsapp',
        icon: '💬',
        bswSlug: {
            es: 'ventas-whatsapp',
            en: 'whatsapp-sales',
            de: 'whatsapp-verkauf',
            fr: 'ventes-whatsapp',
            it: 'vendite-whatsapp',
        },
    },
    enable_self_service_returns: {
        moduleKey: 'returns',
        moduleNameKey: 'featureGate.modules.returns',
        icon: '🔄',
        bswSlug: {
            es: 'devoluciones',
            en: 'returns',
            de: 'retouren',
            fr: 'retours',
            it: 'resi',
        },
    },
    enable_product_badges: {
        moduleKey: 'ecommerce',
        moduleNameKey: 'featureGate.modules.badges',
        icon: '🏷️',
        bswSlug: {
            es: 'tienda-online',
            en: 'ecommerce',
            de: 'onlineshop',
            fr: 'boutique-en-ligne',
            it: 'negozio-online',
        },
    },
    // ── Additional module flags (for future feature-gate pages) ──
    enable_reviews: {
        moduleKey: 'reviews',
        moduleNameKey: 'featureGate.modules.reviews',
        icon: '⭐',
        bswSlug: {
            es: 'resenas',
            en: 'reviews',
            de: 'bewertungen',
            fr: 'avis',
            it: 'recensioni',
        },
    },
    enable_multi_language: {
        moduleKey: 'i18n',
        moduleNameKey: 'featureGate.modules.i18n',
        icon: '🌐',
        bswSlug: {
            es: 'multi-idioma',
            en: 'multilingual',
            de: 'mehrsprachig',
            fr: 'multilingue',
            it: 'multilingua',
        },
    },
    enable_multi_currency: {
        moduleKey: 'i18n',
        moduleNameKey: 'featureGate.modules.i18n',
        icon: '💱',
        bswSlug: {
            es: 'multi-idioma',
            en: 'multilingual',
            de: 'mehrsprachig',
            fr: 'multilingue',
            it: 'multilingua',
        },
    },
    enable_google_auth: {
        moduleKey: 'auth_advanced',
        moduleNameKey: 'featureGate.modules.authAdvanced',
        icon: '🛡️',
        bswSlug: {
            es: 'auth-avanzada',
            en: 'advanced-auth',
            de: 'erweiterte-auth',
            fr: 'auth-avancee',
            it: 'auth-avanzata',
        },
    },
}

/**
 * Get the BSWEB module URL for a given flag and locale.
 * Falls back to /modulos if no slug is defined.
 */
export function getModuleInfoUrl(flagKey: string, locale: string): string {
    const entry = FEATURE_GATE_MAP[flagKey]
    if (!entry) return `${BSWEB_BASE_URL}/${locale}/modulos`

    const slug = entry.bswSlug[locale] ?? entry.bswSlug['en'] ?? null
    if (!slug) return `${BSWEB_BASE_URL}/${locale}/modulos`

    return `${BSWEB_BASE_URL}/${locale}/modulos/${slug}`
}

/**
 * Get all flags that are currently gating panel pages.
 * Used by the coverage test.
 */
export const PANEL_GATED_FLAGS = [
    'enable_analytics',
    'enable_chatbot',
    'enable_carousel',
    'enable_cms_pages',
    'enable_whatsapp_checkout',
    'enable_self_service_returns',
    'enable_product_badges',
] as const
