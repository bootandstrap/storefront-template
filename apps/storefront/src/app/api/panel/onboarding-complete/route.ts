/**
 * POST /api/panel/onboarding-complete
 *
 * Marks onboarding as completed for the current owner's tenant.
 * Uses withPanelGuard() for consistent auth — same pattern as all panel actions.
 * Write via admin client (service_role bypasses RLS).
 */

import { NextResponse } from 'next/server'
import { withPanelGuard } from '@/lib/panel-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { clearCachedConfig } from '@/lib/config'

export async function POST() {
    try {
        const { tenantId } = await withPanelGuard()

        const admin = createAdminClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (admin as any)
            .from('config')
            .update({ onboarding_completed: true })
            .eq('tenant_id', tenantId)

        if (error) {
            console.error('[onboarding-complete] Config update failed:', error.message)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        console.log('[onboarding-complete] ✅ Marked for tenant:', tenantId)
        clearCachedConfig()
        return NextResponse.json({ success: true })
    } catch (err: unknown) {
        // withPanelGuard throws redirect on auth failure — if we get here
        // it's an unexpected error
        console.error('[onboarding-complete] Unexpected:', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
