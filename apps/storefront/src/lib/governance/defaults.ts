/**
 * @module governance/defaults
 * @description Fail-closed fallback configuration for degraded mode.
 *
 * SECURITY: When Supabase is unreachable, we degrade to maintenance mode.
 * - ALL feature flags OFF (except enable_maintenance_mode)
 * - ALL plan limits ZERO (except min floors: max_languages=1, max_currencies=1)
 * - No commerce transactions, no user registration, no feature access
 *
 * DYNAMIC: featureFlags and planLimits are auto-derived from governance-contract.json.
 * Adding a new flag/limit to the contract automatically includes it in FALLBACK_CONFIG.
 * Only the `config` section is manually maintained (business-logic defaults).
 *
 * @locked 🔴 LOCKED — DO NOT MODIFY in tenant repos.
 * Source of truth: ecommerce-template/packages/shared/src/governance/defaults.ts
 */

import type { AppConfig, FeatureFlags, PlanLimits } from './schemas'
import contract from '@/lib/governance-contract.json'

// ── Auto-derived Feature Flags ────────────────────────────────────────────
// All flags OFF except enable_maintenance_mode (safest posture during outage)
const featureFlags = Object.fromEntries(
    contract.flags.keys.map(k => [k, k === 'enable_maintenance_mode'])
) as FeatureFlags

// ── Auto-derived Plan Limits ──────────────────────────────────────────────
// All numeric limits 0 (fail-closed) except minimum floors for functional store
const METADATA_DEFAULTS: Record<string, unknown> = {
    plan_name: 'degraded',
    plan_tier: null,
    plan_expires_at: null,
}
const MINIMUM_FLOORS: Record<string, number> = {
    max_languages: 1,  // at least 1 language for a functional store
    max_currencies: 1, // at least 1 currency
}
const planLimits = Object.fromEntries(
    contract.limits.keys.map(k => {
        if (k in METADATA_DEFAULTS) return [k, METADATA_DEFAULTS[k]]
        return [k, MINIMUM_FLOORS[k] ?? 0]
    })
) as PlanLimits

// ── FALLBACK_CONFIG ───────────────────────────────────────────────────────

export const FALLBACK_CONFIG: AppConfig = {
    config: {
        id: 'fallback',
        tenant_id: null,
        business_name: 'Store',
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
        stock_mode: 'always_in_stock',
        low_stock_threshold: 5,
        free_shipping_threshold: 0,
        tax_display_mode: 'tax_included',
        onboarding_completed: false,
        // Gamification defaults
        achievements_unlocked: [],
        dismissed_tips: [],
        checklist_skipped: false,
        tour_completed: false,
        panel_language: null,
        storefront_language: null,
    },
    featureFlags,
    planLimits,
    planExpired: false,
    tenantStatus: 'active',
    _degraded: true,
}

