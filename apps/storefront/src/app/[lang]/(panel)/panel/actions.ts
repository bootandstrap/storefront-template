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

  return updateConfig(tenantId, {
    panel_language: panelLang,
    storefront_language: storefrontLang,
  })
}
