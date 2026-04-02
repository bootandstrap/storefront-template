/**
 * Owner Panel Input Validation — Zod schemas
 *
 * Centralized validation for all Owner Panel server actions.
 * Prevents XSS, oversized payloads, and type mismatches.
 *
 * Used by: carrusel/actions, mensajes/actions, paginas/actions,
 *          tienda/actions, insignias/actions
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Safe text field — trimmed, max 500 chars, no script tags */
const safeText = (maxLen = 500) =>
    z.string().trim().max(maxLen).refine(
        (v: string) => !/<script/i.test(v),
        { message: 'Script tags are not allowed' }
    )

/** UUID v4 format */
const uuid = z.string().uuid()

// ---------------------------------------------------------------------------
// Carousel (carrusel)
// ---------------------------------------------------------------------------

export const SlideInputSchema = z.object({
    type: z.enum(['product', 'image', 'offer']),
    title: safeText(200),
    subtitle: safeText(500).optional(),
    image: z.string().url().max(2000).optional(),
    cta_text: safeText(100).optional(),
    cta_url: z.string().url().max(2000).optional(),
    medusa_product_id: z.string().max(200).optional(),
    active: z.boolean().optional(),
})

export const SlideUpdateSchema = SlideInputSchema.partial()

// ---------------------------------------------------------------------------
// WhatsApp Templates (mensajes)
// ---------------------------------------------------------------------------

export const TemplateInputSchema = z.object({
    name: safeText(200),
    template: safeText(5000),
    is_default: z.boolean().optional(),
    variables: z.array(z.string().max(100)).max(20).optional(),
})

export const TemplateUpdateSchema = TemplateInputSchema.partial()

// ---------------------------------------------------------------------------
// CMS Pages (paginas)
// ---------------------------------------------------------------------------

export const PageInputSchema = z.object({
    slug: z.string().trim().max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    title: safeText(300),
    body: safeText(50000),
    published: z.boolean().optional(),
})

export const PageUpdateSchema = PageInputSchema.partial()

// ---------------------------------------------------------------------------
// Store Config (tienda)
// ---------------------------------------------------------------------------

export const StoreConfigUpdateSchema = z.object({
    business_name: safeText(200).optional(),
    whatsapp_number: z.string().max(20).optional(),
    default_country_prefix: z.string().max(5).optional(),
    store_email: z.string().email().optional(),
    store_phone: z.string().max(30).optional(),
    store_address: safeText(500).optional(),
    logo_url: z.string().url().max(2000).optional(),
    favicon_url: z.string().url().max(2000).optional(),
    color_preset: z.string().max(50).optional(),
    theme_mode: z.enum(['light', 'dark', 'auto']).optional(),
    accent_color: z.string().max(20).optional(),
    primary_color: z.string().max(20).optional(),
    secondary_color: z.string().max(20).optional(),
    hero_title: safeText(300).optional(),
    hero_subtitle: safeText(500).optional(),
    hero_image: z.string().url().max(2000).optional(),
    footer_description: safeText(1000).optional(),
    announcement_bar_text: safeText(300).optional(),
    announcement_bar_enabled: z.boolean().optional(),
    meta_title: safeText(200).optional(),
    meta_description: safeText(500).optional(),
    social_facebook: z.string().url().max(500).optional(),
    social_instagram: z.string().url().max(500).optional(),
    social_tiktok: z.string().url().max(500).optional(),
    social_twitter: z.string().url().max(500).optional(),
    bank_name: safeText(200).optional(),
    bank_account_type: safeText(50).optional(),
    bank_account_number: safeText(50).optional(),
    bank_account_holder: safeText(200).optional(),
    bank_id_number: safeText(50).optional(),
    min_order_amount: z.number().min(0).max(999999).optional(),
    max_delivery_radius_km: z.number().min(0).max(10000).optional(),
    delivery_info_text: safeText(1000).optional(),
    business_hours: safeText(500).optional(),
    google_analytics_id: z.string().max(50).optional(),
    facebook_pixel_id: z.string().max(50).optional(),
    sentry_dsn: z.string().url().max(200).optional().or(z.literal('')),
    custom_css: z.string().max(10000).optional(),
    language: z.string().max(5).optional(),
    timezone: z.string().max(50).optional(),
    active_languages: z.array(z.string().max(5)).max(10).optional(),
    active_currencies: z.array(z.string().max(5)).max(10).optional(),
    default_currency: z.string().max(5).optional(),
    // Inventory & Stock (Phase 1.7)
    stock_mode: z.enum(['always_in_stock', 'managed']).optional(),
    low_stock_threshold: z.number().int().min(1).max(1000).optional(),
    // Shipping & Tax (Phase 1.9)
    free_shipping_threshold: z.number().min(0).max(999999).optional(),
    tax_display_mode: z.enum(['tax_included', 'tax_excluded']).optional(),
    // ── Module-specific config (Phase 6 — config pipeline) ──────────────────
    // Chatbot
    chatbot_name: safeText(100).optional(),
    chatbot_tone: z.enum(['formal', 'friendly', 'casual']).optional(),
    chatbot_welcome_message: safeText(1000).optional(),
    chatbot_auto_open_delay: z.number().int().min(0).max(120).optional(),
    chatbot_knowledge_scope: z.enum(['products_only', 'products_and_faq', 'full_catalog']).optional(),
    // POS
    pos_receipt_header: safeText(500).optional(),
    pos_receipt_footer: safeText(500).optional(),
    pos_default_payment_method: z.enum(['cash', 'card', 'transfer']).optional(),
    pos_tax_display: z.enum(['tax_included', 'tax_excluded']).optional(),
    pos_enable_tips: z.boolean().optional(),
    pos_tip_percentages: z.string().max(50).regex(/^[\d,]+$/, 'Must be comma-separated numbers').optional(),
    pos_sound_enabled: z.boolean().optional(),
    // Automation
    webhook_notification_email: z.string().email().optional().or(z.literal('')),
    // Capacity
    traffic_alert_email: z.string().email().optional().or(z.literal('')),
    capacity_warning_threshold_pct: z.number().int().min(10).max(99).optional(),
    capacity_critical_threshold_pct: z.number().int().min(50).max(100).optional(),
    capacity_auto_upgrade_interest: z.boolean().optional(),
    // CRM
    crm_auto_tag_customers: z.boolean().optional(),
    crm_new_customer_tag: safeText(100).optional(),
    crm_notify_new_contact: z.boolean().optional(),
    crm_export_format: z.enum(['csv', 'excel']).optional(),
    // Sales Channels
    sales_whatsapp_greeting: safeText(500).optional(),
    sales_preferred_contact: z.enum(['whatsapp', 'phone', 'email']).optional(),
    sales_business_hours_display: z.enum(['not_shown', 'weekdays', 'full_week', 'custom']).optional(),
    sales_highlight_free_shipping: z.boolean().optional(),
    // Email Marketing
    email_sender_name: safeText(200).optional(),
    email_reply_to: z.string().email().optional().or(z.literal('')),
    email_footer_text: safeText(1000).optional(),
    email_abandoned_cart_delay: z.enum(['1h', '3h', '24h']).optional(),
}).passthrough()  // Allow extra keys — actions.ts filters to ALLOWED_CONFIG_FIELDS before DB write

// ---------------------------------------------------------------------------
// Badges (insignias)
// ---------------------------------------------------------------------------

export const ToggleBadgeSchema = z.object({
    productId: uuid,
    badgeId: z.string().trim().min(1).max(100),
    enabled: z.boolean(),
})

export const SetBadgesSchema = z.object({
    productId: uuid,
    badges: z.array(z.string().trim().min(1).max(100)).max(20),
})
