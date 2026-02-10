import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoreConfig {
    id: string
    tenant_id: string | null
    business_name: string
    whatsapp_number: string
    default_country_prefix: string
    primary_color: string
    secondary_color: string
    accent_color: string
    surface_color: string | null
    text_color: string | null
    color_preset: string
    theme_mode: string
    logo_url: string | null
    language: string
    timezone: string
    meta_title: string | null
    meta_description: string | null
    favicon_url: string | null
    hero_title: string | null
    hero_subtitle: string | null
    hero_image: string | null
    footer_description: string | null
    active_languages: string[]
    active_currencies: string[]
    default_currency: string
    // New Phase 8A columns
    store_email: string | null
    store_phone: string | null
    store_address: string | null
    social_facebook: string | null
    social_instagram: string | null
    social_tiktok: string | null
    social_twitter: string | null
    announcement_bar_text: string | null
    announcement_bar_enabled: boolean
    min_order_amount: number
    max_delivery_radius_km: number | null
    business_hours: Record<string, unknown> | null
    delivery_info_text: string | null
    bank_name: string | null
    bank_account_type: string | null
    bank_account_number: string | null
    bank_account_holder: string | null
    bank_id_number: string | null
    google_analytics_id: string | null
    facebook_pixel_id: string | null
    sentry_dsn: string | null
    custom_css: string | null
}

export interface FeatureFlags {
    // Checkout
    enable_whatsapp_checkout: boolean
    enable_online_payments: boolean
    enable_cash_on_delivery: boolean
    enable_bank_transfer: boolean
    // Auth
    enable_user_registration: boolean
    enable_guest_checkout: boolean
    require_auth_to_order: boolean
    enable_google_auth: boolean
    enable_email_auth: boolean
    // Content
    enable_reviews: boolean
    enable_wishlist: boolean
    enable_carousel: boolean
    enable_cms_pages: boolean
    enable_product_search: boolean
    // Advanced
    enable_analytics: boolean
    enable_promotions: boolean
    enable_multi_language: boolean
    enable_multi_currency: boolean
    enable_admin_api: boolean
    // Business
    enable_social_links: boolean
    enable_order_notes: boolean
    enable_address_management: boolean
    // System
    enable_maintenance_mode: boolean
    enable_owner_panel: boolean
    enable_customer_accounts: boolean
    enable_order_tracking: boolean
}

export interface PlanLimits {
    max_products: number
    max_customers: number
    max_orders_month: number
    max_categories: number
    max_images_per_product: number
    max_cms_pages: number
    max_carousel_slides: number
    max_admin_users: number
    storage_limit_mb: number
    plan_name: string
    plan_expires_at: string | null
    max_languages: number
    max_currencies: number
    // New Phase 8A limits
    max_whatsapp_templates: number
    max_file_upload_mb: number
    max_email_sends_month: number
    max_custom_domains: number
}

export interface AppConfig {
    config: StoreConfig
    featureFlags: FeatureFlags
    planLimits: PlanLimits
    planExpired: boolean
}

// ---------------------------------------------------------------------------
// Tenant ID resolution
// ---------------------------------------------------------------------------
// Server-only: reads TENANT_ID exclusively. NEXT_PUBLIC_TENANT_ID is for
// client-side analytics ONLY — never used for data scoping on the server.
// In production, TENANT_ID *must* be set — we fail hard to prevent data leaks.
// ---------------------------------------------------------------------------

/**
 * Returns the tenant ID from the server-only TENANT_ID env var.
 * - In production: throws if TENANT_ID is not set (hard fail to prevent data leaks).
 * - In development: warns and returns a dev placeholder if not set.
 */
export function getRequiredTenantId(): string {
    const id = process.env.TENANT_ID
    if (id) return id

    if (process.env.NODE_ENV === 'production') {
        throw new Error('[FATAL] TENANT_ID is not set in production. All multi-tenant queries require tenant scoping.')
    }

    // Development: warn once, return placeholder that will match nothing (safe)
    console.warn('[config] ⚠️ TENANT_ID not set — queries will return no data. Set TENANT_ID in .env for local dev.')
    return '__dev_no_tenant__'
}

// ---------------------------------------------------------------------------
// Hardcoded fallback (when Supabase is unreachable)
// ---------------------------------------------------------------------------

const FALLBACK_CONFIG: AppConfig = {
    config: {
        id: 'fallback',
        tenant_id: null,
        business_name: 'Mi Tienda',
        whatsapp_number: '573001234567',
        default_country_prefix: '57',
        primary_color: '#2D5016',
        secondary_color: '#8BC34A',
        accent_color: '#FF9800',
        surface_color: '#FAFDF6',
        text_color: '#1A2E0A',
        color_preset: 'nature',
        theme_mode: 'light',
        logo_url: null,
        language: 'es',
        timezone: 'America/Bogota',
        meta_title: 'Mi Tienda — Productos de calidad',
        meta_description: 'Tienda online con entrega a domicilio',
        favicon_url: null,
        hero_title: 'Bienvenido a nuestra tienda',
        hero_subtitle: 'Los mejores productos con entrega a domicilio',
        hero_image: null,
        footer_description: 'Tu tienda de confianza.',
        active_languages: ['en'],
        active_currencies: ['usd'],
        default_currency: 'usd',
        // New columns
        store_email: null,
        store_phone: null,
        store_address: null,
        social_facebook: null,
        social_instagram: null,
        social_tiktok: null,
        social_twitter: null,
        announcement_bar_text: null,
        announcement_bar_enabled: false,
        min_order_amount: 0,
        max_delivery_radius_km: null,
        business_hours: null,
        delivery_info_text: null,
        bank_name: null,
        bank_account_type: null,
        bank_account_number: null,
        bank_account_holder: null,
        bank_id_number: null,
        google_analytics_id: null,
        facebook_pixel_id: null,
        sentry_dsn: null,
        custom_css: null,
    },
    featureFlags: {
        enable_whatsapp_checkout: true,
        enable_online_payments: false,
        enable_cash_on_delivery: true,
        enable_bank_transfer: false,
        enable_user_registration: true,
        enable_guest_checkout: true,
        require_auth_to_order: false,
        enable_google_auth: true,
        enable_email_auth: true,
        enable_reviews: false,
        enable_wishlist: false,
        enable_carousel: true,
        enable_cms_pages: false,
        enable_product_search: true,
        enable_analytics: false,
        enable_promotions: false,
        enable_multi_language: false,
        enable_multi_currency: false,
        enable_admin_api: false,
        enable_social_links: true,
        enable_order_notes: true,
        enable_address_management: true,
        enable_maintenance_mode: false,
        enable_owner_panel: true,
        enable_customer_accounts: true,
        enable_order_tracking: true,
    },
    planLimits: {
        max_products: 100,
        max_customers: 100,
        max_orders_month: 500,
        max_categories: 20,
        max_images_per_product: 10,
        max_cms_pages: 10,
        max_carousel_slides: 10,
        max_admin_users: 3,
        storage_limit_mb: 500,
        plan_name: 'starter',
        plan_expires_at: null,
        max_languages: 1,
        max_currencies: 1,
        max_whatsapp_templates: 5,
        max_file_upload_mb: 5,
        max_email_sends_month: 500,
        max_custom_domains: 1,
    },
    planExpired: false,
}

// ---------------------------------------------------------------------------
// In-memory TTL cache (avoids unstable_cache + cookies() conflict in Next.js 16)
// ---------------------------------------------------------------------------

let _cachedConfig: AppConfig | null = null
let _cacheTimestamp = 0
const CACHE_TTL_MS = 300_000 // 5 minutes

export async function getConfig(): Promise<AppConfig> {
    const now = Date.now()
    if (_cachedConfig && now - _cacheTimestamp < CACHE_TTL_MS) {
        return _cachedConfig
    }

    try {
        const supabase = createAdminClient()

        // MANDATORY: All queries scoped by tenant_id — no data leaks
        const tenantId = getRequiredTenantId()
        const configQuery = supabase.from('config').select('*').eq('tenant_id', tenantId)
        const flagsQuery = supabase.from('feature_flags').select('*').eq('tenant_id', tenantId)
        const limitsQuery = supabase.from('plan_limits').select('*').eq('tenant_id', tenantId)

        const [configRes, flagsRes, limitsRes] = await Promise.all([
            configQuery.single(),
            flagsQuery.single(),
            limitsQuery.single(),
        ])

        // Log any query errors (helps diagnose tenant/schema issues)
        if (configRes.error) console.warn('[config] config query error:', configRes.error.message)
        if (flagsRes.error) console.warn('[config] feature_flags query error:', flagsRes.error.message)
        if (limitsRes.error) console.warn('[config] plan_limits query error:', limitsRes.error.message)

        // Check plan expiration
        const limits = limitsRes.data ?? FALLBACK_CONFIG.planLimits
        const planExpired = limits.plan_expires_at
            ? new Date(limits.plan_expires_at) < new Date()
            : false

        _cachedConfig = {
            config: configRes.data ?? FALLBACK_CONFIG.config,
            featureFlags: flagsRes.data ?? FALLBACK_CONFIG.featureFlags,
            planLimits: limits,
            planExpired,
        }
        _cacheTimestamp = now
        return _cachedConfig
    } catch (err) {
        console.error('[config] Failed to fetch — using fallback (infra failure)', err)
        return FALLBACK_CONFIG
    }
}

// ---------------------------------------------------------------------------
// On-demand revalidation (Server Action)
// ---------------------------------------------------------------------------

export async function revalidateConfig() {
    'use server'
    _cachedConfig = null
    _cacheTimestamp = 0
    revalidatePath('/', 'layout')
}
