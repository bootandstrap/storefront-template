/**
 * Owner Module Config Data Layer
 *
 * Reads/writes per-module configuration from the `config` table.
 * Each module's config is stored as a JSONB column keyed by module_key.
 * Example: config.chatbot_config = { model: 'nano', temperature: 0.5, ... }
 *
 * This also handles the module <-> feature flag relationship:
 * reading what flags a module controls so the config panel can show
 * which features are enabled.
 */

import type { OwnerModuleInfo } from '@/lib/owner-modules'

// ── Types ────────────────────────────────────────────────────────────────────

/** Generic module config — each module defines its own shape */
export type ModuleConfig = Record<string, unknown>

/** Module config metadata for the panel */
export interface ModuleConfigContext {
  module: OwnerModuleInfo
  activeTierKey: string | null
  config: ModuleConfig
  featureFlags: Record<string, boolean>
}

// ── Config Schema Registry ──────────────────────────────────────────────────

/**
 * Defines which config fields each module uses from the `config` table.
 * This maps module keys to the config columns they read/write.
 */
export const MODULE_CONFIG_FIELDS: Record<string, string[]> = {
  ecommerce: [
    'stock_mode', 'low_stock_threshold',
    'free_shipping_threshold', 'tax_display_mode',
    'min_order_amount', 'default_currency',
  ],
  sales_channels: [
    'whatsapp_number', 'default_country_prefix',
    'bank_name', 'bank_account_type', 'bank_account_number',
    'bank_account_holder', 'bank_id_number',
    // Expansion fields (Phase 6 — onboarding config)
    'sales_whatsapp_greeting', 'sales_preferred_contact',
    'sales_business_hours_display', 'sales_highlight_free_shipping',
  ],
  seo: [
    'meta_title', 'meta_description',
    'google_analytics_id', 'facebook_pixel_id',
    'sentry_dsn',
  ],
  // Legacy alias for backward compatibility
  seo_analytics: [
    'meta_title', 'meta_description',
    'google_analytics_id', 'facebook_pixel_id',
    'sentry_dsn',
  ],
  rrss: [
    'social_facebook', 'social_instagram',
    'social_tiktok', 'social_twitter',
  ],
  // Legacy alias for backward compatibility
  social_media: [
    'social_facebook', 'social_instagram',
    'social_tiktok', 'social_twitter',
  ],
  i18n: [
    'language', 'active_languages', 'panel_language', 'storefront_language',
    'active_currencies', 'default_currency',
    'timezone',
  ],
  // Legacy alias for backward compatibility
  i18n_currency: [
    'language', 'active_languages', 'panel_language', 'storefront_language',
    'active_currencies', 'default_currency',
    'timezone',
  ],
  email_marketing: [
    'store_email', 'email_sender_name', 'email_reply_to',
    'email_footer_text', 'email_abandoned_cart_delay',
  ],
  chatbot: [
    'chatbot_name', 'chatbot_tone', 'chatbot_welcome_message',
    'chatbot_auto_open_delay', 'chatbot_knowledge_scope',
  ],
  pos: [
    'pos_receipt_header', 'pos_receipt_footer',
    'pos_default_payment_method', 'pos_tax_display',
    'pos_enable_tips', 'pos_tip_percentages', 'pos_sound_enabled',
  ],
  crm: [
    'crm_auto_tag_customers', 'crm_new_customer_tag',
    'crm_notify_new_contact', 'crm_export_format',
  ],
  automation: [
    'webhook_notification_email',
  ],
  capacidad: [
    'traffic_alert_email', 'capacity_warning_threshold_pct',
    'capacity_critical_threshold_pct', 'capacity_auto_upgrade_interest',
  ],
  auth_advanced: [
    // Auth config via feature flags only — no editable config fields
  ],
}

/**
 * Module feature flag mappings — which flags does each module control?
 */
export const MODULE_FLAG_KEYS: Record<string, string[]> = {
  ecommerce: [
    'enable_ecommerce', 'enable_product_badges', 'enable_carousel',
    'enable_reviews', 'enable_wishlist', 'enable_promotions',
    'enable_related_products', 'enable_product_comparison',
    'enable_cms_pages', 'enable_self_service_returns',
    'enable_order_notes', 'enable_order_tracking',
  ],
  sales_channels: [
    'enable_whatsapp_checkout', 'enable_online_payments',
    'enable_cash_on_delivery', 'enable_bank_transfer',
    'enable_sales_channels',
  ],
  seo: ['enable_analytics', 'enable_seo'],
  seo_analytics: ['enable_analytics', 'enable_seo'],
  rrss: ['enable_social_links', 'enable_social_media'],
  social_media: ['enable_social_links', 'enable_social_media'],
  i18n: ['enable_i18n', 'enable_multi_language', 'enable_multi_currency'],
  i18n_currency: ['enable_i18n', 'enable_multi_language', 'enable_multi_currency'],
  email_marketing: [
    'enable_email_marketing', 'enable_newsletter',
    'enable_email_notifications', 'enable_abandoned_cart_emails',
    'enable_email_campaigns', 'enable_email_templates',
  ],
  chatbot: ['enable_chatbot'],
  pos: [
    'enable_pos', 'enable_pos_kiosk', 'enable_pos_keyboard_shortcuts',
    'enable_pos_quick_sale', 'enable_pos_offline_cart',
    'enable_pos_thermal_printer', 'enable_pos_line_discounts',
    'enable_pos_customer_search', 'enable_pos_multi_device', 'enable_pos_shifts',
  ],
  capacidad: [
    'enable_traffic_expansion', 'enable_traffic_analytics', 'enable_traffic_autoscale',
  ],
  auth_advanced: ['enable_user_registration', 'enable_customer_accounts', 'enable_address_management', 'enable_auth_advanced'],
  crm: ['enable_crm', 'enable_crm_segmentation', 'enable_crm_export'],
  automation: ['enable_admin_api', 'enable_automations'],
}

// ── Data Fetching ────────────────────────────────────────────────────────────

/**
 * Get config context for a specific module.
 * Returns the module's configurable fields from the config table,
 * plus its feature flags and active tier.
 */
export async function getModuleConfigContext(
  moduleKey: string,
  catalog: OwnerModuleInfo[],
  activeModules: Record<string, { tierKey: string }>,
  config: Record<string, unknown>,
  featureFlags: Record<string, boolean>,
): Promise<ModuleConfigContext | null> {
  const module = catalog.find(m => m.key === moduleKey)
  if (!module) return null

  const activeTierKey = activeModules[moduleKey]?.tierKey ?? null

  // Extract only the config fields relevant to this module
  const fields = MODULE_CONFIG_FIELDS[moduleKey] || []
  const moduleConfig: ModuleConfig = {}
  for (const field of fields) {
    moduleConfig[field] = config[field] ?? null
  }

  // Extract only the feature flags relevant to this module
  const flagKeys = MODULE_FLAG_KEYS[moduleKey] || []
  const moduleFlags: Record<string, boolean> = {}
  for (const key of flagKeys) {
    moduleFlags[key] = featureFlags[key] ?? false
  }

  return {
    module,
    activeTierKey,
    config: moduleConfig,
    featureFlags: moduleFlags,
  }
}

// ── Config Save ──────────────────────────────────────────────────────────────

/**
 * Validate that only allowed fields for a module are being saved.
 * Returns sanitized config or null if invalid.
 */
export function sanitizeModuleConfig(
  moduleKey: string,
  data: Record<string, unknown>,
): Record<string, unknown> | null {
  const allowedFields = MODULE_CONFIG_FIELDS[moduleKey]
  if (!allowedFields || allowedFields.length === 0) return null

  const sanitized: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in data) {
      sanitized[key] = data[key]
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null
}
