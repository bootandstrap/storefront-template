/**
 * Panel Auth Helper
 *
 * Shared authentication check for all Owner Panel server actions.
 * Verifies the user is authenticated and has an authorized role.
 * Returns tenantId resolved from the user's profile (DB-based — never from ENV
 * alone for tenant-bound roles like owner).
 */

import { createClient } from '@/lib/supabase/server'
import { getRequiredTenantId } from '@/lib/config'
import { PANEL_ALLOWED_ROLES, type PanelRole } from '@/lib/panel-access-policy'

// Re-use the centralized PANEL_ALLOWED_ROLES from panel-access-policy.ts
const PANEL_ROLES = PANEL_ALLOWED_ROLES

export interface PanelAuthResult {
    supabase: Awaited<ReturnType<typeof createClient>>
    user: { id: string; email?: string }
    role: PanelRole
    tenantId: string
}

export async function requirePanelAuth(): Promise<PanelAuthResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // -----------------------------------------------------------------------
    // Resolve role AND tenant_id from profiles (DB truth, not ENV)
    // -----------------------------------------------------------------------
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile || !PANEL_ROLES.includes(profile.role as PanelRole)) {
        throw new Error('Insufficient permissions')
    }

    const role = profile.role as PanelRole

    // -----------------------------------------------------------------------
    // Tenant resolution rules:
    // - super_admin: use ENV tenant if set (for SaaS-level operations)
    // - owner: MUST have tenant_id in their profile — hard fail otherwise
    // -----------------------------------------------------------------------
    let tenantId: string

    if (role === 'super_admin') {
        // super_admin can operate on any tenant — use ENV as default scope
        tenantId = profile.tenant_id || getRequiredTenantId()
    } else {
        // Tenant-bound roles: tenant_id MUST come from profile
        if (!profile.tenant_id) {
            throw new Error(`Role "${role}" requires a tenant_id in profile. User ${user.id} has none.`)
        }
        tenantId = profile.tenant_id
    }

    return { supabase, user, role, tenantId }
}
