/**
 * Panel Auth Helper
 *
 * Shared authentication check for all Owner Panel server actions.
 * Verifies the user is authenticated and has an authorized role.
 */

import { createClient } from '@/lib/supabase/server'

const PANEL_ROLES = ['owner', 'super_admin', 'admin']

export async function requirePanelAuth() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !PANEL_ROLES.includes(profile.role)) {
        throw new Error('Insufficient permissions')
    }

    return { supabase, user, role: profile.role }
}
