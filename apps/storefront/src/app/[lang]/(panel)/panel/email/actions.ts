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
import type { AutomationConfig } from '@/lib/email-automations-shared'

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
        console.error(`[email] Failed to save automation config for tenant ${tenantId}:`, error.message)
        return { success: false, error: error.message }
    }

    revalidatePanel('panel')
    return { success: true }
}
