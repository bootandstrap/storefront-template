import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoreConfig {
    id: string
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
}

export interface FeatureFlags {
    enable_whatsapp_checkout: boolean
    enable_online_payments: boolean
    enable_cash_on_delivery: boolean
    enable_bank_transfer: boolean
    enable_user_registration: boolean
    enable_guest_checkout: boolean
    require_auth_to_order: boolean
    enable_google_auth: boolean
    enable_email_auth: boolean
    enable_reviews: boolean
    enable_wishlist: boolean
    enable_carousel: boolean
    enable_cms_pages: boolean
    enable_analytics: boolean
    enable_promotions: boolean
    enable_multi_language: boolean
    enable_multi_currency: boolean
    enable_admin_api: boolean
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
}

export interface AppConfig {
    config: StoreConfig
    featureFlags: FeatureFlags
    planLimits: PlanLimits
}

// ---------------------------------------------------------------------------
// Hardcoded fallback (when Supabase is unreachable)
// ---------------------------------------------------------------------------

const FALLBACK_CONFIG: AppConfig = {
    config: {
        id: 'fallback',
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
        enable_analytics: false,
        enable_promotions: false,
        enable_multi_language: false,
        enable_multi_currency: false,
        enable_admin_api: false,
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
    },
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
        const supabase = await createClient()
        const [configRes, flagsRes, limitsRes] = await Promise.all([
            supabase.from('config').select('*').single(),
            supabase.from('feature_flags').select('*').single(),
            supabase.from('plan_limits').select('*').single(),
        ])

        _cachedConfig = {
            config: configRes.data ?? FALLBACK_CONFIG.config,
            featureFlags: flagsRes.data ?? FALLBACK_CONFIG.featureFlags,
            planLimits: limitsRes.data ?? FALLBACK_CONFIG.planLimits,
        }
        _cacheTimestamp = now
        return _cachedConfig
    } catch (err) {
        console.error('[config] Failed to fetch — using fallback', err)
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
