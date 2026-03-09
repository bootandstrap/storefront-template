/**
 * POST /api/panel/onboarding-complete
 *
 * Marks onboarding as completed for the current owner's tenant.
 * Auth via session cookies, write via admin client (service_role bypasses RLS).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { clearCachedConfig } from '@/lib/config'

export async function POST() {
    try {
        // Auth: get user from session cookies
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('[onboarding-complete] Auth failed:', authError?.message)
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Get tenant_id from profiles
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

        const tenantId = profile?.tenant_id
        if (!tenantId) {
            console.error('[onboarding-complete] No tenant_id for user:', user.id)
            return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
        }

        // Update config using admin client (bypasses RLS)
        const admin = createAdminClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: configError } = await (admin as any)
            .from('config')
            .update({ onboarding_completed: true })
            .eq('tenant_id', tenantId)

        if (configError) {
            console.error('[onboarding-complete] Config update failed:', configError.message)
            return NextResponse.json({ error: configError.message }, { status: 500 })
        }

        console.log('[onboarding-complete] ✅ Marked for tenant:', tenantId)
        clearCachedConfig()
        return NextResponse.json({ success: true })
    } catch (err: unknown) {
        console.error('[onboarding-complete] Unexpected:', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
