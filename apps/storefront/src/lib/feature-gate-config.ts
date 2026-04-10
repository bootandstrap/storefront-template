/**
 * Feature Gate Config — Auto-derived from governance-contract.json
 *
 * DYNAMIC: The FEATURE_GATE_MAP is auto-built from governance-contract.json module catalog
 * and the FLAG_MODULE_MAP below. When adding a new module:
 *   1. Add the module to governance-contract.json modules.catalog
 *   2. Add flag→module entries to FLAG_MODULE_MAP below
 *   3. Add bswSlug to MODULE_SLUGS below
 * That's it — the map auto-builds.
 *
 * Used by <FeatureGate> to show the correct upsell screen
 * with a CTA linking to the BSWEB module info page.
 */

import contract from '@/lib/governance-contract.json'

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

// ── Flag → Module Mapping ─────────────────────────────────────────────────
// Compact table: flag_key → [module_key, i18n_suffix]
// When a module is added: add its flags here.
const FLAG_MODULE_MAP: Record<string, [moduleKey: string, i18nSuffix: string]> = {
    // ── Ecommerce ─────────────────────────────────────────────
    enable_ecommerce:           ['ecommerce', 'ecommerce'],
    enable_carousel:            ['ecommerce', 'carousel'],
    enable_cms_pages:           ['ecommerce', 'cms'],
    enable_self_service_returns:['ecommerce', 'returns'],
    enable_product_badges:      ['ecommerce', 'badges'],
    enable_reviews:             ['ecommerce', 'reviews'],
    enable_wishlist:            ['ecommerce', 'wishlist'],
    enable_promotions:          ['ecommerce', 'promotions'],
    enable_related_products:    ['ecommerce', 'relatedProducts'],
    enable_product_comparisons: ['ecommerce', 'comparisons'],
    enable_order_notes:         ['ecommerce', 'orderNotes'],
    enable_order_tracking:      ['ecommerce', 'orderTracking'],
    // ── Sales Channels ────────────────────────────────────────
    enable_whatsapp_checkout:   ['sales_channels', 'whatsappCheckout'],
    enable_online_payments:     ['sales_channels', 'onlinePayments'],
    enable_cash_on_delivery:    ['sales_channels', 'cashOnDelivery'],
    enable_bank_transfer:       ['sales_channels', 'bankTransfer'],
    enable_whatsapp_contact:    ['sales_channels', 'whatsappContact'],
    // ── Auth ──────────────────────────────────────────────────
    enable_google_oauth:         ['auth_advanced', 'googleAuth'],
    enable_user_registration:   ['auth_advanced', 'userRegistration'],
    enable_customer_accounts:   ['auth_advanced', 'customerAccounts'],
    enable_address_management:  ['auth_advanced', 'addressManagement'],
    // ── Chatbot ───────────────────────────────────────────────
    enable_chatbot:             ['chatbot', 'chatbot'],
    // ── i18n ──────────────────────────────────────────────────
    enable_multi_language:      ['i18n', 'multiLanguage'],
    enable_multi_currency:      ['i18n', 'multiCurrency'],
    // ── CRM ───────────────────────────────────────────────────
    enable_crm:                 ['crm', 'crm'],
    enable_crm_segmentation:   ['crm', 'crmSegmentation'],
    enable_crm_export:          ['crm', 'crmExport'],
    enable_crm_contacts:        ['crm', 'crmContacts'],
    enable_crm_interactions:    ['crm', 'crmInteractions'],
    enable_crm_segments:        ['crm', 'crmSegments'],
    // ── Email Marketing ───────────────────────────────────────
    enable_email_notifications: ['email_marketing', 'emailNotifications'],
    enable_abandoned_cart_emails:['email_marketing', 'abandonedCartEmails'],
    enable_email_campaigns:     ['email_marketing', 'emailCampaigns'],
    enable_email_templates:     ['email_marketing', 'emailTemplates'],
    enable_newsletter:          ['email_marketing', 'newsletter'],
    enable_transactional_emails:['email_marketing', 'transactionalEmails'],
    enable_review_request_emails:['email_marketing', 'reviewRequestEmails'],
    enable_email_segmentation:  ['email_marketing', 'emailSegmentation'],
    // ── SEO / Analytics ───────────────────────────────────────
    enable_analytics:           ['seo', 'analytics'],
    enable_seo:                 ['seo', 'seo'],
    enable_seo_tools:           ['seo', 'seoTools'],
    // ── RRSS ──────────────────────────────────────────────────
    enable_social_links:        ['rrss', 'socialLinks'],
    enable_social_media:        ['rrss', 'socialMedia'],
    enable_social_sharing:      ['rrss', 'socialSharing'],
    // ── POS ───────────────────────────────────────────────────
    enable_pos:                 ['pos', 'pos'],
    enable_pos_kiosk:           ['pos_kiosk', 'posKiosk'],
    enable_pos_keyboard_shortcuts:['pos', 'posKeyboardShortcuts'],
    enable_pos_quick_sale:      ['pos', 'posQuickSale'],
    enable_pos_offline_cart:    ['pos', 'posOfflineCart'],
    enable_pos_thermal_printer: ['pos', 'posThermalPrinter'],
    enable_pos_line_discounts:  ['pos', 'posLineDiscounts'],
    enable_pos_customer_search: ['pos', 'posCustomerSearch'],
    enable_pos_multi_device:    ['pos', 'posMultiDevice'],
    enable_pos_shifts:          ['pos', 'posShifts'],
    // ── Kiosk (granular) ─────────────────────────────────────
    enable_kiosk_analytics:     ['pos_kiosk', 'kioskAnalytics'],
    enable_kiosk_idle_timer:    ['pos_kiosk', 'kioskIdleTimer'],
    enable_kiosk_remote_management:['pos_kiosk', 'kioskRemoteManagement'],
    // ── Automation ────────────────────────────────────────────
    enable_admin_api:           ['automation', 'adminApi'],
    enable_automations:         ['automation', 'automations'],
    enable_custom_webhooks:     ['automation', 'customWebhooks'],
    // ── Auth Advanced ────────────────────────────────────────
    enable_auth_advanced:       ['auth_advanced', 'authAdvanced'],
    enable_apple_oauth:         ['auth_advanced', 'appleOauth'],
    enable_facebook_oauth:      ['auth_advanced', 'facebookOauth'],
    enable_2fa:                 ['auth_advanced', 'twoFactorAuth'],
    enable_magic_link:          ['auth_advanced', 'magicLink'],
    // ── Sales Channels ───────────────────────────────────────
    enable_sales_channels:      ['sales_channels', 'salesChannels'],
    enable_reservation_checkout:['sales_channels', 'reservationCheckout'],
    // ── Capacidad (Traffic) ───────────────────────────────────
    enable_traffic_expansion:   ['capacidad', 'trafficExpansion'],
    enable_traffic_analytics:   ['capacidad', 'trafficAnalytics'],
    enable_traffic_autoscale:   ['capacidad', 'trafficAutoscale'],
}

// ── BSWEB URL Slugs per Module ────────────────────────────────────────────
// Localized page slugs for the BSWEB corporate site.
// When adding a module: add its URL slugs here.
const MODULE_SLUGS: Record<string, Record<string, string>> = {
    ecommerce:      { es: 'tienda-online', en: 'ecommerce', de: 'onlineshop', fr: 'boutique-en-ligne', it: 'negozio-online' },
    sales_channels: { es: 'canales-de-venta', en: 'sales-channels', de: 'vertriebskanaele', fr: 'canaux-de-vente', it: 'canali-di-vendita' },
    chatbot:        { es: 'chatbot-ia', en: 'ai-chatbot', de: 'ki-chatbot', fr: 'chatbot-ia', it: 'chatbot-ia' },
    crm:            { es: 'crm', en: 'crm', de: 'crm', fr: 'crm', it: 'crm' },
    email_marketing:{ es: 'email-marketing', en: 'email-marketing', de: 'email-marketing', fr: 'email-marketing', it: 'email-marketing' },
    seo:            { es: 'seo-modular', en: 'seo', de: 'seo', fr: 'seo', it: 'seo' },
    i18n:           { es: 'multi-idioma', en: 'multilingual', de: 'mehrsprachig', fr: 'multilingue', it: 'multilingua' },
    auth_advanced:  { es: 'auth-avanzada', en: 'advanced-auth', de: 'erweiterte-auth', fr: 'auth-avancee', it: 'auth-avanzata' },
    rrss:           { es: 'redes-sociales', en: 'social-media', de: 'soziale-medien', fr: 'reseaux-sociaux', it: 'social-media' },
    pos:            { es: 'punto-de-venta', en: 'point-of-sale', de: 'kassensystem', fr: 'point-de-vente', it: 'punto-vendita' },
    pos_kiosk:      { es: 'modo-kiosco', en: 'kiosk-mode', de: 'kiosk-modus', fr: 'mode-kiosque', it: 'modalita-chiosco' },
    automation:     { es: 'automatizacion', en: 'automation', de: 'automatisierung', fr: 'automatisation', it: 'automazione' },
    capacidad:      { es: 'capacidad', en: 'capacity', de: 'kapazitaet', fr: 'capacite', it: 'capacita' },
}

// ── Auto-Build FEATURE_GATE_MAP from contract + mappings ──────────────────

// Build a lookup: module_key → icon from the contract catalog
const moduleIcons = Object.fromEntries(
    contract.modules.catalog.map(m => [m.key, m.icon])
)

/**
 * Complete mapping: flag_key → module info + BSWEB slug
 * Auto-built from FLAG_MODULE_MAP + MODULE_SLUGS + contract icons
 */
export const FEATURE_GATE_MAP: Record<string, FeatureGateEntry> = Object.fromEntries(
    Object.entries(FLAG_MODULE_MAP).map(([flag, [moduleKey, i18nSuffix]]) => [
        flag,
        {
            moduleKey,
            moduleNameKey: `featureGate.modules.${i18nSuffix}`,
            icon: moduleIcons[moduleKey] || '📦',
            bswSlug: MODULE_SLUGS[moduleKey] || { es: moduleKey, en: moduleKey },
        },
    ])
)

// ── Helper Functions ──────────────────────────────────────────────────────

/** All flags that gate panel pages (derived from the map keys) */
export const PANEL_GATED_FLAGS = Object.keys(FEATURE_GATE_MAP)

/**
 * Get the full URL for a module's info page on BSWEB.
 * Accepts either a flag key (e.g. 'enable_chatbot') or module key (e.g. 'chatbot').
 */
export function getModuleInfoUrl(flagOrModuleKey: string, lang = 'es'): string {
    // Resolve flag → module if needed
    const entry = FEATURE_GATE_MAP[flagOrModuleKey]
    const moduleKey = entry?.moduleKey ?? flagOrModuleKey
    const slugs = MODULE_SLUGS[moduleKey]
    if (!slugs) return `${BSWEB_BASE_URL}/${lang}/modulos`
    const slug = slugs[lang] ?? slugs.es ?? moduleKey
    return `${BSWEB_BASE_URL}/${lang}/modulos/${slug}`
}

/**
 * Get the activation URL for a module within the panel subscription page.
 * Accepts either a flag key or module key. Returns internal panel URL.
 */
export function getModuleActivationUrl(flagOrModuleKey: string, lang = 'es'): string {
    const entry = FEATURE_GATE_MAP[flagOrModuleKey]
    const moduleKey = entry?.moduleKey ?? flagOrModuleKey
    if (!moduleKey || !MODULE_SLUGS[moduleKey]) return `/${lang}/panel/ajustes?tab=suscripcion`
    return `/${lang}/panel/ajustes?tab=suscripcion&module=${encodeURIComponent(moduleKey)}`
}

/**
 * Get a FeatureGateEntry for a specific flag
 */
export function getFeatureGateEntry(flagKey: string): FeatureGateEntry | undefined {
    return FEATURE_GATE_MAP[flagKey]
}

/**
 * Get all flags that belong to a specific module
 */
export function getFlagsByModule(moduleKey: string): string[] {
    return Object.entries(FLAG_MODULE_MAP)
        .filter(([, [mk]]) => mk === moduleKey)
        .map(([flag]) => flag)
}

/**
 * Get all unique module keys from the gate map
 */
export function getGatedModuleKeys(): string[] {
    return [...new Set(Object.values(FLAG_MODULE_MAP).map(([mk]) => mk))].sort()
}
