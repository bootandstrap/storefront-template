/**
 * POST /api/panel/onboarding-complete
 *
 * Marks the tenant's onboarding as completed by setting
 * `config.onboarding_completed = true` in Supabase.
 * Protected by panel auth (owner or super_admin role).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clearCachedConfig } from '@/lib/config'

export async function POST() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant_id and role from profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single()

    if (!profile?.tenant_id || !['owner', 'super_admin'].includes(profile.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update config to mark onboarding as completed
    const { error } = await supabase
        .from('config')
        .update({ onboarding_completed: true })
        .eq('tenant_id', profile.tenant_id)

    if (error) {
        console.error('[onboarding-complete] Failed to update config:', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    clearCachedConfig()

    return NextResponse.json({ success: true })
}
