/**
 * POST /api/panel/onboarding-complete
 *
 * Marks onboarding as completed for the current owner's tenant.
 * Uses withPanelGuard() for consistent auth — same pattern as all panel actions.
 * Write via admin client (service_role bypasses RLS).
 */

import { NextRequest, NextResponse } from 'next/server'
import { withPanelGuard } from '@/lib/panel-guard'
import { withRateLimit, PANEL_GUARD } from '@/lib/security/api-rate-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { clearCachedConfig } from '@/lib/config'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
    try {
        const rl = await withRateLimit(req, PANEL_GUARD)
        if (rl.limited) return rl.response!

        const { tenantId } = await withPanelGuard()

        const admin = createAdminClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (admin as any)
            .from('config')
            .update({ onboarding_completed: true })
            .eq('tenant_id', tenantId)

        if (error) {
            logger.error('[onboarding-complete] Config update failed:', error.message)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        logger.info('[onboarding-complete] Marked completed', { tenantId })
        clearCachedConfig()
        return NextResponse.json({ success: true })
    } catch (err: unknown) {
        // withPanelGuard throws redirect on auth failure — if we get here
        // it's an unexpected error
        logger.error('[onboarding-complete] Unexpected:', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
