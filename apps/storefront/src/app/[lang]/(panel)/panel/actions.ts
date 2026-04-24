'use server'

/**
 * Panel-level server actions for gamification persistence.
 *
 * All actions use withPanelGuard() for consistent auth + tenant resolution.
 * Config writes target typed StoreConfig fields (backed by 20260319 migration).
 *
 * Actions:
 *   - saveAchievementsAction: persists newly unlocked achievement IDs
 *   - dismissTipAction: persists dismissed smart tip IDs
 *   - skipChecklistAction: persists checklist skipped state
 *   - completeTourAction: marks tour as completed (feeds achievement system)
 *   - saveLanguagePreferencesAction: sets panel + storefront language preferences
 */

import { withPanelGuard } from '@/lib/panel-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { clearCachedConfig } from '@/lib/config'
import { revalidatePath } from 'next/cache'
import { NOTIFICATION_EVENT_KEYS, NOTIFICATION_CHANNEL_KEYS } from '@/lib/registries/notification-events'
import { SUPPORTED_CURRENCY_CODES } from '@/lib/i18n/currencies'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read specific config fields for the guarded tenant. */
async function readConfigFields(
  tenantId: string,
  fields: string
): Promise<Record<string, unknown> | null> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('config')
    .select(fields)
    .eq('tenant_id', tenantId)
    .single()
  return data as Record<string, unknown> | null
}

/** Update config fields for the guarded tenant — invalidates cache.
 *
 * Uses SECURITY DEFINER RPC `update_owner_config` via the stateless admin
 * client.  The RPC validates tenant ownership server-side so we don't need
 * the user-session client (which was blocked by incomplete RLS policies).
 *
 * Caller MUST have already gone through `withPanelGuard()`.
 */
async function updateConfig(
  tenantId: string,
  updates: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()

  // Try RPC first (recommended — bypasses RLS safely)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcResult, error: rpcError } = await (admin as any).rpc(
    'update_owner_config',
    { p_tenant_id: tenantId, p_updates: updates },
  )

  if (!rpcError) {
    if (rpcResult === true || rpcResult === 1 || rpcResult === 'OK') {
      clearCachedConfig()
      return { success: true }
    }
    // Unexpected return — treat as failure
    logger.warn('[panel-action] RPC returned unexpected value:', rpcResult)
  }

  // Fallback: RPC may not be deployed yet — try direct update via auth client
  if (rpcError?.code === 'PGRST202' || rpcError?.message?.includes('Could not find')) {
    logger.warn('[panel-action] RPC update_owner_config not found, falling back to direct update')
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('config')
      .update(updates)
      .eq('tenant_id', tenantId)
      .select()

    if (error) {
      logger.error('[panel-action] Config update failed:', error.message)
      return { success: false, error: error.message }
    }
    if (!data || data.length === 0) {
      logger.error('[panel-action] Config update failed: 0 rows affected (RLS rejection)')
      return { success: false, error: 'No se encontraron permisos suficientes o la configuración no existe (RLS)' }
    }

    clearCachedConfig()
    return { success: true }
  }

  // RPC exists but returned an error
  logger.error('[panel-action] Config RPC failed:', rpcError.message)
  return { success: false, error: rpcError.message }
}

// ---------------------------------------------------------------------------
// Achievement persistence
// ---------------------------------------------------------------------------

export async function saveAchievementsAction(newIds: string[]) {
  const { tenantId } = await withPanelGuard()
  if (!newIds.length) return { success: true }

  const config = await readConfigFields(tenantId, 'achievements_unlocked')
  const existing: string[] = (config?.achievements_unlocked as string[]) || []
  const existingSet = new Set(existing)
  const toAdd = newIds.filter(id => !existingSet.has(id))

  if (toAdd.length === 0) return { success: true }

  const result = await updateConfig(tenantId, {
    achievements_unlocked: [...existing, ...toAdd],
  })

  if (result.success) revalidatePath('/panel')
  return result
}

// ---------------------------------------------------------------------------
// Smart tip dismissal
// ---------------------------------------------------------------------------

export async function dismissTipAction(tipId: string) {
  const { tenantId } = await withPanelGuard()

  const config = await readConfigFields(tenantId, 'dismissed_tips')
  const existing: string[] = (config?.dismissed_tips as string[]) || []

  if (existing.includes(tipId)) return { success: true }

  return updateConfig(tenantId, {
    dismissed_tips: [...existing, tipId],
  })
}

// ---------------------------------------------------------------------------
// Checklist skip
// ---------------------------------------------------------------------------

export async function skipChecklistAction() {
  const { tenantId } = await withPanelGuard()
  return updateConfig(tenantId, { checklist_skipped: true })
}

// ---------------------------------------------------------------------------
// Tour completion (feeds tour_complete achievement)
// ---------------------------------------------------------------------------

export async function completeTourAction() {
  const { tenantId } = await withPanelGuard()
  const result = await updateConfig(tenantId, { tour_completed: true })
  if (result.success) revalidatePath('/panel')
  return result
}

// ---------------------------------------------------------------------------
// Language preferences (panel + storefront independently)
// ---------------------------------------------------------------------------

// (Placeholder removed - moved below)

// ---------------------------------------------------------------------------
// Multi-language persistence (active_languages array)
// ---------------------------------------------------------------------------

export async function saveActiveLanguagesAction(languages: string[]) {
  const { tenantId } = await withPanelGuard()

  const valid = languages.filter(l => SUPPORTED_LANGUAGES.includes(l))
  if (valid.length === 0) return { success: false, error: 'No valid languages' }

  // Read current config to avoid clobbering independent language preferences
  const currentConfig = await readConfigFields(tenantId, 'language, storefront_language')
  const currentStorefrontLang = (currentConfig?.storefront_language as string) || (currentConfig?.language as string) || 'es'

  // Only update language/storefront_language if current value would be removed
  const updates: Record<string, unknown> = { active_languages: valid }

  // If the currently selected storefront language is no longer in the active list,
  // we must fallback to the first active language to avoid breaking the UI.
  if (!valid.includes(currentStorefrontLang)) {
    updates.storefront_language = valid[0]
    updates.language = valid[0] // sync legacy field
  }

  const result = await updateConfig(tenantId, updates)
  if (result.success) revalidatePath('/panel')
  return result
}

// ---------------------------------------------------------------------------
// Language preferences (panel + storefront independently)
// ---------------------------------------------------------------------------

const SUPPORTED_LANGUAGES = ['es', 'en', 'de', 'fr', 'it']

/** Updates the panel (UI) language independently. */
export async function savePanelLanguageAction(panelLang: string) {
  const { tenantId } = await withPanelGuard()
  if (!SUPPORTED_LANGUAGES.includes(panelLang)) {
    return { success: false, error: 'Unsupported language' }
  }

  const result = await updateConfig(tenantId, { panel_language: panelLang })
  if (result.success) revalidatePath('/panel')
  return result
}

/** Updates the storefront (customer-facing) primary language independently. */
export async function saveStorefrontLanguageAction(storefrontLang: string) {
  const { tenantId } = await withPanelGuard()
  if (!SUPPORTED_LANGUAGES.includes(storefrontLang)) {
    return { success: false, error: 'Unsupported language' }
  }

  // Sync legacy 'language' field for wider compatibility
  const result = await updateConfig(tenantId, {
    storefront_language: storefrontLang,
    language: storefrontLang,
  })
  if (result.success) revalidatePath('/panel')
  return result
}

// ---------------------------------------------------------------------------
// Complete onboarding (server action — more reliable than fetch route handler)
// ---------------------------------------------------------------------------

export async function completeOnboardingAction() {
  const { tenantId } = await withPanelGuard()
  const result = await updateConfig(tenantId, { onboarding_completed: true })
  if (result.success) revalidatePath('/panel')
  return result
}

// ---------------------------------------------------------------------------
// Save onboarding config (batch update from module config step)
// ---------------------------------------------------------------------------

/** Allowed config keys that can be set during onboarding */
const ONBOARDING_CONFIG_KEYS = new Set([
  // General/contact
  'store_email',
  'store_phone',
  'store_address',
  'whatsapp_number',
  // Social
  'social_facebook',
  'social_instagram',
  'social_tiktok',
  'social_twitter',
  // SEO
  'meta_title',
  'meta_description',
  'google_analytics_id',
  'facebook_pixel_id',
  // Appearance
  'announcement_bar_text',
  'announcement_bar_enabled',
  // E-Commerce
  'default_currency',
  'tax_display_mode',
  'stock_mode',
  'free_shipping_threshold',
  'min_order_amount',
  'low_stock_threshold',
  // Chatbot
  'chatbot_name',
  'chatbot_tone',
  'chatbot_welcome_message',
  'chatbot_auto_open_delay',
  'chatbot_knowledge_scope',
  // POS
  'pos_receipt_header',
  'pos_receipt_footer',
  'pos_default_payment_method',
  'pos_tax_display',
  'pos_enable_tips',
  'pos_tip_percentages',
  'pos_sound_enabled',
  // Automation
  'webhook_notification_email',
  // Capacity
  'traffic_alert_email',
  'capacity_warning_threshold_pct',
  'capacity_critical_threshold_pct',
  'capacity_auto_upgrade_interest',
  // CRM expansion
  'crm_auto_tag_customers',
  'crm_new_customer_tag',
  'crm_notify_new_contact',
  'crm_export_format',
  // Sales Channels expansion
  'sales_whatsapp_greeting',
  'sales_preferred_contact',
  'sales_business_hours_display',
  'sales_highlight_free_shipping',
  // Email Marketing expansion
  'email_sender_name',
  'email_reply_to',
  'email_footer_text',
  'email_abandoned_cart_delay',
  // Language Preferences
  'panel_language',
  'storefront_language',
])

/** Keys that must be valid emails (basic format check) */
const EMAIL_KEYS = new Set(['store_email', 'webhook_notification_email', 'traffic_alert_email', 'email_reply_to'])
/** Keys that must be numeric */
const NUMBER_KEYS = new Set(['free_shipping_threshold', 'min_order_amount', 'low_stock_threshold', 'capacity_warning_threshold_pct', 'capacity_critical_threshold_pct', 'chatbot_auto_open_delay'])
/** Keys that are boolean toggles */
const BOOLEAN_KEYS = new Set(['announcement_bar_enabled', 'pos_enable_tips', 'pos_sound_enabled', 'capacity_auto_upgrade_interest', 'crm_auto_tag_customers', 'crm_notify_new_contact', 'sales_highlight_free_shipping'])

export async function saveOnboardingConfigAction(
  updates: Record<string, unknown>,
) {
  const { tenantId } = await withPanelGuard()

  // Filter to allowed keys only (defense in depth)
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(updates)) {
    if (!ONBOARDING_CONFIG_KEYS.has(key)) continue

    // Validate emails — skip invalid formats silently
    if (EMAIL_KEYS.has(key) && typeof value === 'string' && value.length > 0) {
      if (!value.includes('@') || !value.includes('.')) continue
    }

    // Coerce numbers
    if (NUMBER_KEYS.has(key)) {
      const num = Number(value)
      if (isNaN(num)) continue
      safe[key] = num
      continue
    }

    // Coerce booleans
    if (BOOLEAN_KEYS.has(key)) {
      safe[key] = value === true || value === 'true'
      continue
    }

    safe[key] = value
  }

  if (Object.keys(safe).length === 0) return { success: true }

  const result = await updateConfig(tenantId, safe)
  if (result.success) {
    revalidatePath('/panel')

    // ── 6B: Config change audit trail ──
    // Non-blocking — audit logging should never break the save
    try {
      const adminClient = createAdminClient()
      // audit_log is an operational table not in the generated schema
      await (adminClient as any).from('audit_log').insert({
        tenant_id: tenantId,
        action: 'settings.config_update',
        metadata: {
          changed_keys: Object.keys(safe),
          changes: safe,
          severity: 'info',
          timestamp: new Date().toISOString(),
          source: 'owner_panel',
        },
      })
    } catch {
      // Non-blocking
      logger.warn('[audit] Failed to log config change')
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Notification channels persistence
// ---------------------------------------------------------------------------

/** Notification channel configuration shape */
interface NotificationChannelConfig {
  webhook?: { enabled: boolean; url: string; secret: string }
  whatsapp?: { enabled: boolean; phone_number_id: string; token: string; recipient: string }
  telegram?: { enabled: boolean; bot_token: string; chat_id: string }
  email?: { enabled: boolean }
}

/** Save notification channel configuration (webhook, whatsapp, telegram, email). */
export async function saveNotificationChannelsAction(channels: NotificationChannelConfig) {
  const { tenantId } = await withPanelGuard()

  // Sanitize: only keep known channel keys
  const safe: Record<string, unknown> = {}
  for (const key of NOTIFICATION_CHANNEL_KEYS) {
    if (channels[key]) safe[key] = channels[key]
  }

  const result = await updateConfig(tenantId, { notification_channels: safe })
  if (result.success) revalidatePath('/panel')
  return result
}

/** Save notification events → channels mapping. */
export async function saveNotificationEventsAction(events: Record<string, string[]>) {
  const { tenantId } = await withPanelGuard()

  // Validate event names
  const safe: Record<string, string[]> = {}
  for (const [event, channels] of Object.entries(events)) {
    if (NOTIFICATION_EVENT_KEYS.includes(event)) {
      safe[event] = channels.filter(c => NOTIFICATION_CHANNEL_KEYS.includes(c as typeof NOTIFICATION_CHANNEL_KEYS[number]))
    }
  }

  const result = await updateConfig(tenantId, { notification_events: safe })
  if (result.success) revalidatePath('/panel')
  return result
}

/** Test a notification channel by sending a test message. */
export async function testNotificationChannelAction(
  channel: 'webhook' | 'whatsapp' | 'telegram',
  config: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  await withPanelGuard() // Auth gate only

  try {
    if (channel === 'webhook') {
      const res = await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          timestamp: new Date().toISOString(),
          data: { message: '🧪 Test notification from BootandStrap' },
        }),
        signal: AbortSignal.timeout(10000),
      })
      return res.ok
        ? { success: true }
        : { success: false, error: `HTTP ${res.status}` }
    }

    if (channel === 'whatsapp') {
      const to = config.recipient?.replace(/[^+\d]/g, '')
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: '🧪 Test notification from BootandStrap — your channel is working!' },
          }),
          signal: AbortSignal.timeout(10000),
        }
      )
      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        return { success: false, error: `HTTP ${res.status}: ${errBody}` }
      }
      return { success: true }
    }

    if (channel === 'telegram') {
      const res = await fetch(
        `https://api.telegram.org/bot${config.bot_token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.chat_id,
            text: '🧪 <b>Test notification from BootandStrap</b>\n\nYour Telegram channel is correctly configured!',
            parse_mode: 'HTML',
          }),
          signal: AbortSignal.timeout(10000),
        }
      )
      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        return { success: false, error: `HTTP ${res.status}: ${errBody}` }
      }
      return { success: true }
    }

    return { success: false, error: 'Unknown channel' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ---------------------------------------------------------------------------
// Multi-currency persistence (active_currencies array)
// ---------------------------------------------------------------------------

export async function saveActiveCurrenciesAction(currencies: string[]) {
  const { tenantId } = await withPanelGuard()

  const valid = currencies.filter(c => SUPPORTED_CURRENCY_CODES.includes(c.toLowerCase())).map(c => c.toLowerCase())
  if (valid.length === 0) return { success: false, error: 'No valid currencies' }

  // Read current config to check if default_currency would be removed
  const currentConfig = await readConfigFields(tenantId, 'default_currency')
  const currentDefault = (currentConfig?.default_currency as string) || 'eur'

  const updates: Record<string, unknown> = { active_currencies: valid }

  // If the current default currency is no longer active, fallback to first
  if (!valid.includes(currentDefault.toLowerCase())) {
    updates.default_currency = valid[0]
  }

  const result = await updateConfig(tenantId, updates)
  if (result.success) revalidatePath('/panel')
  return result
}
