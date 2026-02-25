import { revalidatePath } from 'next/cache'
import { createGovernanceClient } from '@/lib/supabase/governance'

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
    // Inventory & Stock (Phase 1.7)
    stock_mode: 'always_in_stock' | 'managed'
    low_stock_threshold: number
    // Shipping & Tax (Phase 1.9)
    free_shipping_threshold: number
    tax_display_mode: 'tax_included' | 'tax_excluded'
}

export interface FeatureFlags {
    // Checkout
    enable_whatsapp_checkout: boolean
    enable_online_payments: boolean
    enable_cash_on_delivery: boolean
    enable_bank_transfer: boolean
    // WhatsApp Contact (separate from checkout)
    enable_whatsapp_contact: boolean
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
    enable_related_products: boolean
    enable_product_comparisons: boolean
    enable_product_badges: boolean
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
    enable_newsletter: boolean
    // System
    enable_maintenance_mode: boolean
    enable_owner_panel: boolean
    enable_customer_accounts: boolean
    enable_order_tracking: boolean
    enable_cookie_consent: boolean
    enable_chatbot: boolean
    enable_self_service_returns: boolean
    owner_lite_enabled: boolean
    owner_advanced_modules_enabled: boolean
    // CRM
    enable_crm: boolean
    enable_crm_segmentation: boolean
    enable_crm_export: boolean
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
    max_whatsapp_templates: number
    max_file_upload_mb: number
    max_email_sends_month: number
    max_custom_domains: number
    max_chatbot_messages_month: number
    max_badges: number
    max_newsletter_subscribers: number
    max_requests_day: number
    max_reviews_per_product: number
    max_wishlist_items: number
    max_promotions_active: number
    max_payment_methods: number
    max_crm_contacts: number
}

export interface AppConfig {
    config: StoreConfig
    featureFlags: FeatureFlags
    planLimits: PlanLimits
    planExpired: boolean
    tenantStatus: 'active' | 'paused' | 'suspended' | 'maintenance_free'
    /** True when config was loaded from hardcoded fallback (Supabase unreachable) */
    _degraded?: boolean
    /** Days remaining in free maintenance month (only set when tenantStatus === 'maintenance_free') */
    maintenanceDaysRemaining?: number
}

// ---------------------------------------------------------------------------
// Tenant ID resolution
// ---------------------------------------------------------------------------
// Server-only: reads TENANT_ID exclusively. NEXT_PUBLIC_TENANT_ID is for
// client-side analytics ONLY — never used for data scoping on the server.
// In production, TENANT_ID *must* be set — we fail hard to prevent data leaks.
// ---------------------------------------------------------------------------

/**
 * Detects whether we are in Next.js build/prerender phase (no runtime context).
 * During `next build`, static pages like `/_not-found` are prerendered without
 * a real request — TENANT_ID is unavailable and that's expected.
 * Returns true only during the build prerender pass, NOT during runtime SSR.
 *
 * Next.js sets NEXT_PHASE during build:
 * - 'phase-production-build' during `next build`
 * - undefined during runtime
 */
function isBuildPhase(): boolean {
    return process.env.NEXT_PHASE === 'phase-production-build'
}

/**
 * Returns the tenant ID from the server-only TENANT_ID env var.
 * - In production runtime: throws if TENANT_ID is not set (fail-closed).
 * - In build/prerender: returns a safe sentinel (queries will match nothing).
 * - In development: warns and returns a dev placeholder.
 */
export function getRequiredTenantId(): string {
    const id = process.env.TENANT_ID
    if (id) return id

    // Build-phase prerender (e.g. /_not-found): return sentinel — queries return empty
    if (isBuildPhase()) {
        return '__build_prerender__'
    }

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
        business_name: 'My Store',
        whatsapp_number: '',
        default_country_prefix: '1',
        primary_color: '#2D5016',
        secondary_color: '#8BC34A',
        accent_color: '#FF9800',
        surface_color: '#FAFDF6',
        text_color: '#1A2E0A',
        color_preset: 'nature',
        theme_mode: 'light',
        logo_url: null,
        language: 'en',
        timezone: 'UTC',
        meta_title: null,
        meta_description: null,
        favicon_url: null,
        hero_title: null,
        hero_subtitle: null,
        hero_image: null,
        footer_description: null,
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
        // Inventory & Stock (Phase 1.7)
        stock_mode: 'always_in_stock',
        low_stock_threshold: 5,
        // Shipping & Tax (Phase 1.9)
        free_shipping_threshold: 0,
        tax_display_mode: 'tax_included',
    },
    featureFlags: {
        enable_whatsapp_checkout: true,
        enable_online_payments: false,
        enable_cash_on_delivery: true,
        enable_bank_transfer: false,
        enable_whatsapp_contact: true,
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
        enable_related_products: true,
        enable_product_comparisons: false,
        enable_product_badges: true,
        enable_analytics: false,
        enable_promotions: false,
        enable_multi_language: false,
        enable_multi_currency: false,
        enable_admin_api: false,
        enable_social_links: true,
        enable_order_notes: true,
        enable_address_management: true,
        enable_newsletter: false,
        enable_maintenance_mode: false,
        enable_owner_panel: true,
        enable_customer_accounts: true,
        enable_order_tracking: true,
        enable_cookie_consent: true,
        enable_chatbot: false,
        enable_self_service_returns: false,
        owner_lite_enabled: true,
        owner_advanced_modules_enabled: false,
        enable_crm: false,
        enable_crm_segmentation: false,
        enable_crm_export: false,
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
        plan_name: 'base',
        plan_expires_at: null,
        max_languages: 1,
        max_currencies: 1,
        max_whatsapp_templates: 5,
        max_file_upload_mb: 5,
        max_email_sends_month: 500,
        max_custom_domains: 1,
        max_chatbot_messages_month: 200,
        max_badges: 3,
        max_newsletter_subscribers: 100,
        max_requests_day: 5000,
        max_reviews_per_product: 0,
        max_wishlist_items: 0,
        max_promotions_active: 0,
        max_payment_methods: 1,
        max_crm_contacts: 0,
    },
    planExpired: false,
    tenantStatus: 'active',
    _degraded: true,
}

// ---------------------------------------------------------------------------
// In-memory TTL cache (uses globalThis to share across Turbopack module instances)
// ---------------------------------------------------------------------------
// In Next.js dev mode with Turbopack, API routes and page renders may use
// different module instances. Module-level variables are isolated per instance.
// globalThis ensures cache state is shared across ALL routes in the same process.
// This is the same pattern used by Prisma, Supabase, etc. for dev-mode singletons.
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 300_000 // 5 minutes

// Shared cache on globalThis (survives module re-evaluation in dev/HMR)
const globalForConfig = globalThis as unknown as {
    __configCache?: AppConfig | null
    __configCacheTimestamp?: number
}

function getCachedConfig(): AppConfig | null {
    const now = Date.now()
    const cached = globalForConfig.__configCache
    const timestamp = globalForConfig.__configCacheTimestamp ?? 0
    if (cached && now - timestamp < CACHE_TTL_MS) {
        return cached
    }
    return null
}

function setCachedConfig(config: AppConfig): void {
    globalForConfig.__configCache = config
    globalForConfig.__configCacheTimestamp = Date.now()
}

export function clearCachedConfig(): void {
    globalForConfig.__configCache = null
    globalForConfig.__configCacheTimestamp = 0
}

/**
 * Fire-and-forget alert when degraded mode is activated.
 * Reports to tenant_errors table for SuperAdmin Error Inbox visibility,
 * and emits a structured JSON log for Dokploy/APM ingestion.
 */
function reportDegradedMode(tenantId: string, message: string): void {
    // Structured JSON log for Dokploy
    console.error(JSON.stringify({
        level: 'error',
        service: 'storefront',
        timestamp: new Date().toISOString(),
        tenant_id: tenantId,
        severity: 'critical',
        error: message,
        action: 'degraded_mode_activated',
    }))

    // Fire-and-forget to tenant_errors table via raw REST (avoids generated type issues)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceKey) {
        fetch(`${supabaseUrl}/rest/v1/tenant_errors`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`,
                'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
                tenant_id: tenantId,
                error_type: 'config_degraded_mode',
                severity: 'critical',
                message,
                metadata: { timestamp: new Date().toISOString() },
            }),
        }).catch(() => { /* truly fire-and-forget */ })
    }
}

export async function getConfig(): Promise<AppConfig> {
    const cached = getCachedConfig()
    if (cached) return cached

    // MANDATORY: tenant_id validation — fail-closed in production runtime.
    // During build/prerender, returns sentinel → early return with FALLBACK_CONFIG.
    const tenantId = getRequiredTenantId()

    // Build-phase prerender (e.g. /_not-found): no real tenant context, use fallback
    if (isBuildPhase()) {
        console.info('[config] Build-phase prerender detected — using fallback config')
        return FALLBACK_CONFIG
    }

    try {
        const supabase = createGovernanceClient()

        // All queries scoped by tenant_id — no data leaks
        const configQuery = supabase.from('config').select('*').eq('tenant_id', tenantId)
        const flagsQuery = supabase.from('feature_flags').select('*').eq('tenant_id', tenantId)
        const limitsQuery = supabase.from('plan_limits').select('*').eq('tenant_id', tenantId)

        const [configRes, flagsRes, limitsRes] = await Promise.all([
            configQuery.single(),
            flagsQuery.single(),
            limitsQuery.single(),
        ])

        // Query tenant status (tenants table may not be in generated types)
        const { data: tenantData } = await supabase
            .from('tenants')
            .select('status')
            .eq('id', tenantId)
            .single() as { data: { status: string } | null }

        // Log any query errors (helps diagnose tenant/schema issues)
        if (configRes.error) console.warn('[config] config query error:', configRes.error.message)
        if (flagsRes.error) console.warn('[config] feature_flags query error:', flagsRes.error.message)
        if (limitsRes.error) console.warn('[config] plan_limits query error:', limitsRes.error.message)

        // Check plan expiration
        const limits = limitsRes.data ?? FALLBACK_CONFIG.planLimits
        const planExpired = limits.plan_expires_at
            ? new Date(limits.plan_expires_at) < new Date()
            : false

        const tenantStatus = (tenantData?.status as AppConfig['tenantStatus']) ?? 'active'

        // Compute free maintenance days remaining
        let maintenanceDaysRemaining: number | undefined
        if (tenantStatus === 'maintenance_free' && limits.plan_expires_at) {
            const msLeft = new Date(limits.plan_expires_at).getTime() - Date.now()
            maintenanceDaysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
        }

        // Auto-enforce: if plan expired AND status is maintenance_free → treat as paused
        const effectiveStatus = (planExpired && tenantStatus === 'maintenance_free') ? 'paused' : tenantStatus

        const result: AppConfig = {
            config: configRes.data ?? FALLBACK_CONFIG.config,
            featureFlags: {
                ...FALLBACK_CONFIG.featureFlags,
                ...(flagsRes.data ?? {}),
            },
            planLimits: limits,
            planExpired,
            tenantStatus: effectiveStatus,
            _degraded: false,
            maintenanceDaysRemaining,
        }
        setCachedConfig(result)
        return result
    } catch (err) {
        // Structured alerting for degraded mode — INFORME §4.3
        const errorMessage = err instanceof Error ? err.message : String(err)
        reportDegradedMode(tenantId, `Config fetch failed — degraded mode activated: ${errorMessage}`)
        return FALLBACK_CONFIG
    }
}

// ---------------------------------------------------------------------------
// Auth-scoped config fetch (for owner panel actions)
// ---------------------------------------------------------------------------
// Uses explicit tenant ID from requirePanelAuth() instead of env TENANT_ID.
// This ensures plan limits are always enforced against the authenticated tenant.
// ---------------------------------------------------------------------------

export async function getConfigForTenant(tenantId: string): Promise<AppConfig> {
    if (!tenantId) {
        throw new Error('[config] getConfigForTenant requires a valid tenantId')
    }

    try {
        const supabase = createGovernanceClient()

        const [configRes, flagsRes, limitsRes] = await Promise.all([
            supabase.from('config').select('*').eq('tenant_id', tenantId).single(),
            supabase.from('feature_flags').select('*').eq('tenant_id', tenantId).single(),
            supabase.from('plan_limits').select('*').eq('tenant_id', tenantId).single(),
        ])

        const { data: tenantData } = await supabase
            .from('tenants')
            .select('status')
            .eq('id', tenantId)
            .single() as { data: { status: string } | null }

        if (configRes.error) console.warn('[config] config query error:', configRes.error.message)
        if (flagsRes.error) console.warn('[config] feature_flags query error:', flagsRes.error.message)
        if (limitsRes.error) console.warn('[config] plan_limits query error:', limitsRes.error.message)

        const limits = limitsRes.data ?? FALLBACK_CONFIG.planLimits
        const planExpired = limits.plan_expires_at
            ? new Date(limits.plan_expires_at) < new Date()
            : false

        return {
            config: configRes.data ?? FALLBACK_CONFIG.config,
            featureFlags: {
                ...FALLBACK_CONFIG.featureFlags,
                ...(flagsRes.data ?? {}),
            },
            planLimits: limits,
            planExpired,
            tenantStatus: (tenantData?.status as AppConfig['tenantStatus']) ?? 'active',
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        reportDegradedMode(tenantId, `getConfigForTenant failed: ${errorMessage}`)
        return FALLBACK_CONFIG
    }
}

// ---------------------------------------------------------------------------
// On-demand revalidation (Server Action)
// ---------------------------------------------------------------------------

export async function revalidateConfig() {
    'use server'
    clearCachedConfig()
    revalidatePath('/', 'layout')
}
