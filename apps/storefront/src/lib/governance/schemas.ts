/**
 * @module governance/schemas
 * @description Zod schemas as Single Source of Truth (SSOT) for all governance types.
 *
 * Types are derived via `z.infer<>` — no manual interface maintenance needed.
 * Any schema change is automatically caught by contract tests in CI.
 *
 * @locked 🔴 LOCKED — DO NOT MODIFY in tenant repos.
 * Source of truth: ecommerce-template/packages/shared/src/governance/schemas.ts
 * Sync via: scripts/sync-governance.sh
 */

import { z } from 'zod'

// ─── StoreConfig ──────────────────────────────────────────────────────────

export const StoreConfigSchema = z.object({
    id: z.string(),
    tenant_id: z.string().nullable(),
    business_name: z.string(),
    whatsapp_number: z.string(),
    default_country_prefix: z.string(),
    primary_color: z.string(),
    secondary_color: z.string(),
    accent_color: z.string(),
    surface_color: z.string().nullable(),
    text_color: z.string().nullable(),
    color_preset: z.string(),
    theme_mode: z.string(),
    logo_url: z.string().nullable(),
    language: z.string(),
    timezone: z.string(),
    meta_title: z.string().nullable(),
    meta_description: z.string().nullable(),
    favicon_url: z.string().nullable(),
    hero_title: z.string().nullable(),
    hero_subtitle: z.string().nullable(),
    hero_image: z.string().nullable(),
    footer_description: z.string().nullable(),
    active_languages: z.array(z.string()),
    active_currencies: z.array(z.string()),
    default_currency: z.string(),
    store_email: z.string().nullable(),
    store_phone: z.string().nullable(),
    store_address: z.string().nullable(),
    social_facebook: z.string().nullable(),
    social_instagram: z.string().nullable(),
    social_tiktok: z.string().nullable(),
    social_twitter: z.string().nullable(),
    announcement_bar_text: z.string().nullable(),
    announcement_bar_enabled: z.boolean(),
    min_order_amount: z.number(),
    max_delivery_radius_km: z.number().nullable(),
    business_hours: z.record(z.string(), z.unknown()).nullable(),
    delivery_info_text: z.string().nullable(),
    bank_name: z.string().nullable(),
    bank_account_type: z.string().nullable(),
    bank_account_number: z.string().nullable(),
    bank_account_holder: z.string().nullable(),
    bank_id_number: z.string().nullable(),
    google_analytics_id: z.string().nullable(),
    facebook_pixel_id: z.string().nullable(),
    sentry_dsn: z.string().nullable(),
    custom_css: z.string().nullable(),
    stock_mode: z.enum(['always_in_stock', 'managed']),
    low_stock_threshold: z.number(),
    free_shipping_threshold: z.number(),
    tax_display_mode: z.enum(['tax_included', 'tax_excluded']),
    onboarding_completed: z.boolean(),
    // Module-specific config (Phase 6 — migration: 20260331_onboarding_config_fields.sql)
    chatbot_name: z.string().nullable().default(null),
    chatbot_tone: z.enum(['formal', 'friendly', 'casual']).default('friendly'),
    chatbot_welcome_message: z.string().nullable().default(null),
    pos_receipt_header: z.string().nullable().default(null),
    pos_receipt_footer: z.string().nullable().default(null),
    pos_default_payment_method: z.enum(['cash', 'card', 'transfer']).default('cash'),
    pos_tax_display: z.enum(['tax_included', 'tax_excluded']).default('tax_included'),
    pos_enable_tips: z.boolean().default(false),
    pos_tip_percentages: z.string().default('5,10,15'),
    pos_sound_enabled: z.boolean().default(true),
    webhook_notification_email: z.string().nullable().default(null),
    // Chatbot expansion
    chatbot_auto_open_delay: z.number().default(0),
    chatbot_knowledge_scope: z.enum(['products_only', 'products_and_faq', 'full_catalog']).default('products_and_faq'),
    // Capacity expansion
    traffic_alert_email: z.string().nullable().default(null),
    traffic_alert_threshold_pct: z.number().default(80),
    capacity_warning_threshold_pct: z.number().default(70),
    capacity_critical_threshold_pct: z.number().default(90),
    capacity_auto_upgrade_interest: z.boolean().default(false),
    // CRM expansion
    crm_auto_tag_customers: z.boolean().default(true),
    crm_new_customer_tag: z.string().default('nuevo'),
    crm_notify_new_contact: z.boolean().default(false),
    crm_export_format: z.enum(['csv', 'excel']).default('csv'),
    // Sales Channels expansion
    sales_whatsapp_greeting: z.string().nullable().default(null),
    sales_preferred_contact: z.enum(['whatsapp', 'phone', 'email']).default('whatsapp'),
    sales_business_hours_display: z.enum(['not_shown', 'weekdays', 'full_week', 'custom']).default('not_shown'),
    sales_highlight_free_shipping: z.boolean().default(false),
    // Email Marketing expansion
    email_sender_name: z.string().nullable().default(null),
    email_reply_to: z.string().nullable().default(null),
    email_footer_text: z.string().nullable().default(null),
    email_abandoned_cart_delay: z.enum(['1h', '3h', '24h']).default('3h'),
    // Gamification (Phase 5 — migration: 20260319_gamification_fields.sql)
    achievements_unlocked: z.array(z.string()).default([]),
    dismissed_tips: z.array(z.string()).default([]),
    checklist_skipped: z.boolean().default(false),
    tour_completed: z.boolean().default(false),
    panel_language: z.string().nullable().default(null),
    storefront_language: z.string().nullable().default(null),
})

export type StoreConfig = z.infer<typeof StoreConfigSchema>

// ─── FeatureFlags (54 flags) ──────────────────────────────────────────────

export const FeatureFlagsSchema = z.object({
    enable_whatsapp_checkout: z.boolean(),
    enable_online_payments: z.boolean(),
    enable_cash_on_delivery: z.boolean(),
    enable_bank_transfer: z.boolean(),
    enable_whatsapp_contact: z.boolean(),
    enable_user_registration: z.boolean(),
    enable_guest_checkout: z.boolean(),
    require_auth_to_order: z.boolean(),
    enable_google_auth: z.boolean(),
    enable_email_auth: z.boolean(),
    enable_ecommerce: z.boolean(),
    enable_reviews: z.boolean(),
    enable_wishlist: z.boolean(),
    enable_carousel: z.boolean(),
    enable_cms_pages: z.boolean(),
    enable_product_search: z.boolean(),
    enable_related_products: z.boolean(),
    enable_product_comparisons: z.boolean(),
    enable_product_badges: z.boolean(),
    enable_analytics: z.boolean(),
    enable_promotions: z.boolean(),
    enable_multi_language: z.boolean(),
    enable_multi_currency: z.boolean(),
    enable_admin_api: z.boolean(),
    enable_social_links: z.boolean(),
    enable_order_notes: z.boolean(),
    enable_address_management: z.boolean(),
    enable_newsletter: z.boolean(),
    enable_maintenance_mode: z.boolean(),
    enable_owner_panel: z.boolean(),
    enable_customer_accounts: z.boolean(),
    enable_order_tracking: z.boolean(),
    enable_cookie_consent: z.boolean(),
    enable_chatbot: z.boolean(),
    enable_self_service_returns: z.boolean(),
    owner_lite_enabled: z.boolean(),
    owner_advanced_modules_enabled: z.boolean(),
    enable_crm: z.boolean(),
    enable_crm_segmentation: z.boolean(),
    enable_crm_export: z.boolean(),
    enable_email_notifications: z.boolean(),
    enable_abandoned_cart_emails: z.boolean(),
    enable_email_campaigns: z.boolean(),
    enable_email_templates: z.boolean(),
    enable_pos: z.boolean(),
    enable_pos_kiosk: z.boolean(),
    enable_pos_keyboard_shortcuts: z.boolean(),
    enable_pos_quick_sale: z.boolean(),
    enable_pos_offline_cart: z.boolean(),
    enable_pos_thermal_printer: z.boolean(),
    enable_pos_line_discounts: z.boolean(),
    enable_pos_customer_search: z.boolean(),
    enable_pos_multi_device: z.boolean(),
    enable_pos_shifts: z.boolean(),
    enable_traffic_expansion: z.boolean(),
    enable_traffic_analytics: z.boolean(),
    enable_traffic_autoscale: z.boolean(),
    // ── New module gates (Phase 4 — 2026-03) ──
    enable_seo: z.boolean(),
    enable_social_media: z.boolean(),
    enable_automations: z.boolean(),
    enable_auth_advanced: z.boolean(),
    enable_sales_channels: z.boolean(),
})

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>

// ─── PlanLimits (28 fields) ───────────────────────────────────────────────

export const PlanLimitsSchema = z.object({
    max_products: z.number(),
    max_customers: z.number(),
    max_orders_month: z.number(),
    max_categories: z.number(),
    max_images_per_product: z.number(),
    max_cms_pages: z.number(),
    max_carousel_slides: z.number(),
    max_admin_users: z.number(),
    storage_limit_mb: z.number(),
    plan_name: z.string(),
    plan_tier: z.string().nullable(),
    plan_expires_at: z.string().nullable(),
    max_languages: z.number(),
    max_currencies: z.number(),
    max_whatsapp_templates: z.number(),
    max_file_upload_mb: z.number(),
    max_email_sends_month: z.number(),
    max_custom_domains: z.number(),
    max_chatbot_messages_month: z.number(),
    max_badges: z.number(),
    max_newsletter_subscribers: z.number(),
    max_requests_day: z.number(),
    max_reviews_per_product: z.number(),
    max_wishlist_items: z.number(),
    max_promotions_active: z.number(),
    max_payment_methods: z.number(),
    max_pos_payment_methods: z.number(),
    max_crm_contacts: z.number(),
})

export type PlanLimits = z.infer<typeof PlanLimitsSchema>

// ─── Tenant Status ────────────────────────────────────────────────────────

export const TenantStatusSchema = z.enum([
    'active',
    'paused',
    'suspended',
    'maintenance_free',
])

export type TenantStatus = z.infer<typeof TenantStatusSchema>

// ─── AppConfig (composite) ────────────────────────────────────────────────

export const AppConfigSchema = z.object({
    config: StoreConfigSchema,
    featureFlags: FeatureFlagsSchema,
    planLimits: PlanLimitsSchema,
    planExpired: z.boolean(),
    tenantStatus: TenantStatusSchema,
    _degraded: z.boolean().optional(),
    maintenanceDaysRemaining: z.number().optional(),
})

export type AppConfig = z.infer<typeof AppConfigSchema>

// ─── Governance RPC Result ────────────────────────────────────────────────

export const GovernanceRpcResultSchema = z.object({
    config: StoreConfigSchema.nullable(),
    feature_flags: z.record(z.string(), z.boolean()).nullable(),
    plan_limits: PlanLimitsSchema.nullable(),
    tenant_status: z.string().nullable(),
})

export type GovernanceRpcResult = z.infer<typeof GovernanceRpcResultSchema>
