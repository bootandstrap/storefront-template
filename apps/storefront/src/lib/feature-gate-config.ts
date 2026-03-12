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
    enable_ecommerce: {
        moduleKey: 'ecommerce',
        moduleNameKey: 'featureGate.modules.ecommerce',
        icon: '🛒',
        bswSlug: {
            es: 'tienda-online',
            en: 'ecommerce',
            de: 'onlineshop',
            fr: 'boutique-en-ligne',
            it: 'negozio-online',
        },
    },
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
        moduleKey: 'chatbot',
        moduleNameKey: 'featureGate.modules.chatbot',
        icon: '🤖',
        bswSlug: {
            es: 'chatbot-ia',
            en: 'ai-chatbot',
            de: 'ki-chatbot',
            fr: 'chatbot-ia',
            it: 'chatbot-ia',
        },
    },
    enable_carousel: {
        moduleKey: 'ecommerce',
        moduleNameKey: 'featureGate.modules.carousel',
        icon: '🎠',
        bswSlug: {
            es: 'tienda-online',
            en: 'ecommerce',
            de: 'onlineshop',
            fr: 'boutique-en-ligne',
            it: 'negozio-online',
        },
    },
    enable_cms_pages: {
        moduleKey: 'ecommerce',
        moduleNameKey: 'featureGate.modules.cmsPages',
        icon: '📄',
        bswSlug: {
            es: 'tienda-online',
            en: 'ecommerce',
            de: 'onlineshop',
            fr: 'boutique-en-ligne',
            it: 'negozio-online',
        },
    },
    enable_whatsapp_checkout: {
        moduleKey: 'sales_channels',
        moduleNameKey: 'featureGate.modules.salesChannels',
        icon: '💬',
        bswSlug: {
            es: 'canales-de-venta',
            en: 'sales-channels',
            de: 'vertriebskanaele',
            fr: 'canaux-de-vente',
            it: 'canali-di-vendita',
        },
    },
    enable_self_service_returns: {
        moduleKey: 'ecommerce',
        moduleNameKey: 'featureGate.modules.returns',
        icon: '🔄',
        bswSlug: {
            es: 'tienda-online',
            en: 'ecommerce',
            de: 'onlineshop',
            fr: 'boutique-en-ligne',
            it: 'negozio-online',
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
        moduleKey: 'ecommerce',
        moduleNameKey: 'featureGate.modules.reviews',
        icon: '⭐',
        bswSlug: {
            es: 'tienda-online',
            en: 'ecommerce',
            de: 'onlineshop',
            fr: 'boutique-en-ligne',
            it: 'negozio-online',
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
    enable_crm: {
        moduleKey: 'crm',
        moduleNameKey: 'featureGate.modules.crm',
        icon: '📁',
        bswSlug: {
            es: 'crm',
            en: 'crm',
            de: 'crm',
            fr: 'crm',
            it: 'crm',
        },
    },
    enable_crm_segmentation: {
        moduleKey: 'crm',
        moduleNameKey: 'featureGate.modules.crm',
        icon: '🏷️',
        bswSlug: {
            es: 'crm',
            en: 'crm',
            de: 'crm',
            fr: 'crm',
            it: 'crm',
        },
    },
    enable_crm_export: {
        moduleKey: 'crm',
        moduleNameKey: 'featureGate.modules.crm',
        icon: '📤',
        bswSlug: {
            es: 'crm',
            en: 'crm',
            de: 'crm',
            fr: 'crm',
            it: 'crm',
        },
    },
    // ── Email Marketing ──
    enable_email_notifications: {
        moduleKey: 'email_marketing',
        moduleNameKey: 'featureGate.modules.emailMarketing',
        icon: '📧',
        bswSlug: {
            es: 'email-marketing',
            en: 'email-marketing',
            de: 'email-marketing',
            fr: 'email-marketing',
            it: 'email-marketing',
        },
    },
    enable_abandoned_cart_emails: {
        moduleKey: 'email_marketing',
        moduleNameKey: 'featureGate.modules.emailMarketing',
        icon: '🛒',
        bswSlug: {
            es: 'email-marketing',
            en: 'email-marketing',
            de: 'email-marketing',
            fr: 'email-marketing',
            it: 'email-marketing',
        },
    },
    enable_email_campaigns: {
        moduleKey: 'email_marketing',
        moduleNameKey: 'featureGate.modules.emailMarketing',
        icon: '📮',
        bswSlug: {
            es: 'email-marketing',
            en: 'email-marketing',
            de: 'email-marketing',
            fr: 'email-marketing',
            it: 'email-marketing',
        },
    },
    enable_email_templates: {
        moduleKey: 'email_marketing',
        moduleNameKey: 'featureGate.modules.emailMarketing',
        icon: '🎨',
        bswSlug: {
            es: 'email-marketing',
            en: 'email-marketing',
            de: 'email-marketing',
            fr: 'email-marketing',
            it: 'email-marketing',
        },
    },
    // ── Ecommerce — additional features ──
    enable_wishlist: {
        moduleKey: 'ecommerce',
        moduleNameKey: 'featureGate.modules.wishlist',
        icon: '💝',
        bswSlug: {
            es: 'tienda-online',
            en: 'ecommerce',
            de: 'onlineshop',
            fr: 'boutique-en-ligne',
            it: 'negozio-online',
        },
    },
    enable_promotions: {
        moduleKey: 'ecommerce',
        moduleNameKey: 'featureGate.modules.promotions',
        icon: '🏷️',
        bswSlug: {
            es: 'tienda-online',
            en: 'ecommerce',
            de: 'onlineshop',
            fr: 'boutique-en-ligne',
            it: 'negozio-online',
        },
    },
    enable_related_products: {
        moduleKey: 'ecommerce',
        moduleNameKey: 'featureGate.modules.relatedProducts',
        icon: '🔗',
        bswSlug: {
            es: 'tienda-online',
            en: 'ecommerce',
            de: 'onlineshop',
            fr: 'boutique-en-ligne',
            it: 'negozio-online',
        },
    },
    enable_product_comparisons: {
        moduleKey: 'ecommerce',
        moduleNameKey: 'featureGate.modules.productComparisons',
        icon: '⚖️',
        bswSlug: {
            es: 'tienda-online',
            en: 'ecommerce',
            de: 'onlineshop',
            fr: 'boutique-en-ligne',
            it: 'negozio-online',
        },
    },
    enable_order_notes: {
        moduleKey: 'ecommerce',
        moduleNameKey: 'featureGate.modules.orderNotes',
        icon: '📝',
        bswSlug: {
            es: 'tienda-online',
            en: 'ecommerce',
            de: 'onlineshop',
            fr: 'boutique-en-ligne',
            it: 'negozio-online',
        },
    },
    enable_order_tracking: {
        moduleKey: 'ecommerce',
        moduleNameKey: 'featureGate.modules.orderTracking',
        icon: '📦',
        bswSlug: {
            es: 'tienda-online',
            en: 'ecommerce',
            de: 'onlineshop',
            fr: 'boutique-en-ligne',
            it: 'negozio-online',
        },
    },
    // ── Sales Channels — payment methods ──
    enable_online_payments: {
        moduleKey: 'sales_channels',
        moduleNameKey: 'featureGate.modules.onlinePayments',
        icon: '💳',
        bswSlug: {
            es: 'canales-de-venta',
            en: 'sales-channels',
            de: 'vertriebskanaele',
            fr: 'canaux-de-vente',
            it: 'canali-di-vendita',
        },
    },
    enable_cash_on_delivery: {
        moduleKey: 'sales_channels',
        moduleNameKey: 'featureGate.modules.cashOnDelivery',
        icon: '💵',
        bswSlug: {
            es: 'canales-de-venta',
            en: 'sales-channels',
            de: 'vertriebskanaele',
            fr: 'canaux-de-vente',
            it: 'canali-di-vendita',
        },
    },
    enable_bank_transfer: {
        moduleKey: 'sales_channels',
        moduleNameKey: 'featureGate.modules.bankTransfer',
        icon: '🏦',
        bswSlug: {
            es: 'canales-de-venta',
            en: 'sales-channels',
            de: 'vertriebskanaele',
            fr: 'canaux-de-vente',
            it: 'canali-di-vendita',
        },
    },
    enable_whatsapp_contact: {
        moduleKey: 'sales_channels',
        moduleNameKey: 'featureGate.modules.whatsappContact',
        icon: '📱',
        bswSlug: {
            es: 'canales-de-venta',
            en: 'sales-channels',
            de: 'vertriebskanaele',
            fr: 'canaux-de-vente',
            it: 'canali-di-vendita',
        },
    },
    // ── Newsletter ──
    enable_newsletter: {
        moduleKey: 'email_marketing',
        moduleNameKey: 'featureGate.modules.newsletter',
        icon: '📰',
        bswSlug: {
            es: 'email-marketing',
            en: 'email-marketing',
            de: 'email-marketing',
            fr: 'email-marketing',
            it: 'email-marketing',
        },
    },
    // ── Auth Advanced — remaining features ──
    enable_user_registration: {
        moduleKey: 'auth_advanced',
        moduleNameKey: 'featureGate.modules.userRegistration',
        icon: '👤',
        bswSlug: {
            es: 'auth-avanzada',
            en: 'advanced-auth',
            de: 'erweiterte-auth',
            fr: 'auth-avancee',
            it: 'auth-avanzata',
        },
    },
    enable_customer_accounts: {
        moduleKey: 'auth_advanced',
        moduleNameKey: 'featureGate.modules.customerAccounts',
        icon: '👥',
        bswSlug: {
            es: 'auth-avanzada',
            en: 'advanced-auth',
            de: 'erweiterte-auth',
            fr: 'auth-avancee',
            it: 'auth-avanzata',
        },
    },
    enable_address_management: {
        moduleKey: 'auth_advanced',
        moduleNameKey: 'featureGate.modules.addressManagement',
        icon: '📍',
        bswSlug: {
            es: 'auth-avanzada',
            en: 'advanced-auth',
            de: 'erweiterte-auth',
            fr: 'auth-avancee',
            it: 'auth-avanzata',
        },
    },
    // ── Social / RRSS ──
    enable_social_links: {
        moduleKey: 'rrss',
        moduleNameKey: 'featureGate.modules.socialLinks',
        icon: '🔗',
        bswSlug: {
            es: 'redes-sociales',
            en: 'social-media',
            de: 'soziale-medien',
            fr: 'reseaux-sociaux',
            it: 'social-media',
        },
    },
    // ── Automation ──
    enable_admin_api: {
        moduleKey: 'automation',
        moduleNameKey: 'featureGate.modules.adminApi',
        icon: '⚡',
        bswSlug: {
            es: 'automatizacion',
            en: 'automation',
            de: 'automatisierung',
            fr: 'automatisation',
            it: 'automazione',
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
 * Get in-panel activation URL for a gated module.
 * Keeps owners in Storefront for immediate checkout flow.
 */
export function getModuleActivationUrl(flagKey: string, locale: string): string {
    const entry = FEATURE_GATE_MAP[flagKey]
    if (!entry?.moduleKey) return `/${locale}/panel/suscripcion`

    return `/${locale}/panel/suscripcion?module=${encodeURIComponent(entry.moduleKey)}`
}

/**
 * Auto-derived from FEATURE_GATE_MAP keys — no manual sync needed.
 * P1-4 fix: previously hand-maintained list that drifted from the map.
 */
export const PANEL_GATED_FLAGS = Object.keys(FEATURE_GATE_MAP) as ReadonlyArray<keyof typeof FEATURE_GATE_MAP>

