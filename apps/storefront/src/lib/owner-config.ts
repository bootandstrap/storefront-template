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
  ],
  sales_channels: [
    'whatsapp_number', 'default_country_prefix',
    'bank_name', 'bank_account_type', 'bank_account_number',
    'bank_account_holder', 'bank_id_number',
  ],
  seo_analytics: [
    'meta_title', 'meta_description',
    'google_analytics_id', 'facebook_pixel_id',
    'sentry_dsn',
  ],
  social_media: [
    'social_facebook', 'social_instagram',
    'social_tiktok', 'social_twitter',
  ],
  i18n_currency: [
    'language', 'active_languages',
    'active_currencies', 'default_currency',
    'timezone',
  ],
  email_marketing: [
    // Email config uses separate email_automation_config table
  ],
  chatbot: [
    // Chatbot config stored in chatbot-specific fields
  ],
  auth_advanced: [
    // Auth config via feature flags only
  ],
  crm: [
    // CRM config minimal
  ],
  automation: [
    // Automation config minimal
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
  ],
  seo_analytics: ['enable_analytics'],
  social_media: ['enable_social_links'],
  i18n_currency: ['enable_i18n'],
  email_marketing: ['enable_email_marketing', 'enable_newsletter'],
  chatbot: ['enable_chatbot'],
  auth_advanced: ['enable_user_registration', 'enable_customer_accounts', 'enable_address_management'],
  crm: ['enable_crm'],
  automation: ['enable_admin_api'],
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
