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

/** Update config fields for the guarded tenant — invalidates cache. */
async function updateConfig(
  tenantId: string,
  updates: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('config')
    .update(updates)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[panel-action] Config update failed:', error.message)
    return { success: false, error: error.message }
  }

  clearCachedConfig()
  return { success: true }
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

const SUPPORTED_LANGUAGES = ['es', 'en', 'de', 'fr', 'it']

export async function saveLanguagePreferencesAction(
  panelLang: string,
  storefrontLang: string,
) {
  const { tenantId } = await withPanelGuard()

  // Validate inputs — fail-closed
  if (!SUPPORTED_LANGUAGES.includes(panelLang) || !SUPPORTED_LANGUAGES.includes(storefrontLang)) {
    return { success: false, error: 'Unsupported language' }
  }

  const result = await updateConfig(tenantId, {
    panel_language: panelLang,
    storefront_language: storefrontLang,
    language: storefrontLang, // also set main language field
    active_languages: [storefrontLang], // single language by default
  })
  if (result.success) revalidatePath('/panel')
  return result
}

// ---------------------------------------------------------------------------
// Multi-language persistence (active_languages array)
// ---------------------------------------------------------------------------

export async function saveActiveLanguagesAction(languages: string[]) {
  const { tenantId } = await withPanelGuard()

  const valid = languages.filter(l => SUPPORTED_LANGUAGES.includes(l))
  if (valid.length === 0) return { success: false, error: 'No valid languages' }

  const result = await updateConfig(tenantId, {
    active_languages: valid,
    language: valid[0], // first one is primary
    storefront_language: valid[0],
  })
  if (result.success) revalidatePath('/panel')
  return result
}

// ---------------------------------------------------------------------------
// Panel language only (independent of storefront active_languages)
// ---------------------------------------------------------------------------

export async function savePanelLanguageAction(panelLang: string) {
  const { tenantId } = await withPanelGuard()

  if (!SUPPORTED_LANGUAGES.includes(panelLang)) {
    return { success: false, error: 'Unsupported language' }
  }

  const result = await updateConfig(tenantId, { panel_language: panelLang })
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
      console.warn('[audit] Failed to log config change')
    }
  }
  return result
}
