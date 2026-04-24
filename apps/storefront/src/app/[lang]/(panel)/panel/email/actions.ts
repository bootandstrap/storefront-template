'use server'

/**
 * Email Marketing — Server Actions
 *
 * Extracted from page.tsx inline 'use server' block.
 * All mutations go through withPanelGuard for auth + feature gate.
 */

import { withPanelGuard } from '@/lib/panel-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePanel } from '@/lib/revalidate'
import { logOwnerAction } from '@/lib/panel/log-owner-action'
import type { AutomationConfig } from '@/lib/email-automations-shared'
import { logger } from '@/lib/logger'

interface ActionResult {
    success: boolean
    error?: string
}

export async function saveAutomationConfig(config: AutomationConfig): Promise<ActionResult> {
    const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_email_notifications' })
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
    const { error } = await (supabase as any)
        .from('email_automation_config')
        .upsert(
            {
                tenant_id: tenantId,
                abandoned_cart_enabled: config.abandoned_cart_enabled,
                abandoned_cart_delay_hours: config.abandoned_cart_delay_hours,
                review_request_enabled: config.review_request_enabled,
                review_request_delay_days: config.review_request_delay_days,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'tenant_id' }
        )

    if (error) {
        logger.error(`[email] Failed to save automation config for tenant ${tenantId}:`, error.message)
        return { success: false, error: error.message }
    }

    revalidatePanel('panel')
    logOwnerAction(tenantId, 'email.save_automation', {
        abandonedCartEnabled: config.abandoned_cart_enabled,
        reviewRequestEnabled: config.review_request_enabled,
    })
    return { success: true }
}

// ---------------------------------------------------------------------------
// Email Preferences — Per-template toggles (available to ALL tenants)
// ---------------------------------------------------------------------------

export interface EmailPreferences {
    send_order_confirmation: boolean
    send_payment_failed: boolean
    send_order_shipped: boolean
    send_order_delivered: boolean
    send_order_cancelled: boolean
    send_refund_processed: boolean
    send_welcome: boolean
    send_low_stock_alert: boolean
    send_abandoned_cart: boolean
    send_review_request: boolean
    template_design: string
}

export async function saveEmailPreferences(preferences: EmailPreferences): Promise<ActionResult> {
    // No requiredFlag — all tenants can control their toggles
    const { tenantId } = await withPanelGuard({})
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from('email_preferences')
        .upsert(
            {
                tenant_id: tenantId,
                ...preferences,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'tenant_id' }
        )

    if (error) {
        logger.error(`[email] Failed to save preferences for tenant ${tenantId}:`, error.message)
        return { success: false, error: error.message }
    }

    revalidatePanel('panel')
    logOwnerAction(tenantId, 'email.save_preferences', {
        design: preferences.template_design,
        toggles: Object.entries(preferences)
            .filter(([k]) => k.startsWith('send_'))
            .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
    })
    return { success: true }
}
