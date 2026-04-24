'use server'

/**
 * Module Config Save Action
 *
 * Saves per-module config fields to the `config` table.
 * Validates that only allowed fields for the given module are saved.
 */

import { revalidatePanel } from '@/lib/revalidate'
import { withPanelGuard } from '@/lib/panel-guard'
import { sanitizeModuleConfig } from '@/lib/owner-config'
import { logger } from '@/lib/logger'

export async function saveModuleConfigAction(
  moduleKey: string,
  data: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, tenantId } = await withPanelGuard()

    // Sanitize — only allow fields defined for this module
    const sanitized = sanitizeModuleConfig(moduleKey, data)
    if (!sanitized) {
      return { success: true } // No configurable fields for this module, nothing to save
    }

    // Get existing config row
    const { data: existing } = await supabase
      .from('config')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single()

    if (!existing) {
      return { success: false, error: 'Config not found' }
    }

    const { error } = await supabase
      .from('config')
      .update(sanitized)
      .eq('id', existing.id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error(`[panel/module-config/${moduleKey}] Save failed:`, error)
      return { success: false, error: error.message }
    }

    revalidatePanel('all')
    return { success: true }
  } catch (err) {
    logger.error(`[panel/module-config/${moduleKey}] Error:`, err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
