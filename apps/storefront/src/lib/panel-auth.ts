/**
 * Panel Auth Helper
 *
 * Shared authentication check for all Owner Panel server actions.
 * Verifies the user is authenticated and has an authorized role.
 * Returns tenantId resolved from the user's profile (DB-based — never from ENV
 * alone for tenant-bound roles like owner).
 *
 * Also contains legacy owner reconciliation logic (migrated from legacy-owner-auth.ts).
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveTenantContext } from '@bootandstrap/tenant-context'
import { isPanelRole, type PanelRole } from '@/lib/panel-access-policy'
import { logger } from '@/lib/logger'

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

    // Determine role: profile > user_metadata fallback
    const context = resolveTenantContext({
        profileRole: profile?.role ?? null,
        metadataRole: user.user_metadata?.role ?? null,
        profileTenantId: profile?.tenant_id ?? null,
        envTenantId: process.env.TENANT_ID ?? null,
    })

    if (!context.isPanelRole) {
        throw new Error('Insufficient permissions')
    }

    const role = context.role as PanelRole
    const tenantId = context.tenantId

    if (!tenantId) {
        throw new Error(`Role "${role}" requires a tenant_id. User ${user.id} has none in profile and no env fallback.`)
    }

    return { supabase, user, role, tenantId }
}

// ---------------------------------------------------------------------------
// Legacy Owner Reconciliation
// ---------------------------------------------------------------------------
// Migrated from legacy-owner-auth.ts — if tenant owner email exists but the
// user profile is still customer/null-role, promote to owner on login.
// ---------------------------------------------------------------------------

interface PromoteLegacyOwnerInput {
    currentRole?: string | null
    userEmail?: string | null
    tenantOwnerEmail?: string | null
    profileTenantId?: string | null
    ownerTenantId?: string | null
}

interface ReconcileLegacyOwnerRoleInput {
    userId: string
    userEmail?: string | null
    currentRole?: string | null
    profileTenantId?: string | null
}

function normalizeEmail(email: string | null | undefined): string | null {
    const normalized = email?.trim().toLowerCase() || ''
    return normalized || null
}

export function shouldPromoteLegacyOwner(input: PromoteLegacyOwnerInput): boolean {
    if (isPanelRole(input.currentRole)) return false

    const userEmail = normalizeEmail(input.userEmail)
    const tenantOwnerEmail = normalizeEmail(input.tenantOwnerEmail)
    const ownerTenantId = input.ownerTenantId || null
    const profileTenantId = input.profileTenantId || null

    if (!userEmail || !tenantOwnerEmail || !ownerTenantId) return false
    if (userEmail !== tenantOwnerEmail) return false

    // If profile already has a tenant scope, never rewrite to a different tenant.
    if (profileTenantId && profileTenantId !== ownerTenantId) return false

    return true
}

/**
 * Legacy reconciliation: if tenant owner email exists but the user profile is still
 * customer/null-role, promote to owner on login.
 */
export async function reconcileLegacyOwnerRole(
    input: ReconcileLegacyOwnerRoleInput
): Promise<string | null> {
    if (isPanelRole(input.currentRole)) {
        return input.currentRole ?? null
    }

    const email = normalizeEmail(input.userEmail)
    if (!email) {
        return input.currentRole ?? null
    }

    const admin = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tenants table not in generated types
    const { data: ownerTenant, error: ownerTenantError } = await (admin as any)
        .from('tenants')
        .select('id, owner_email, created_at')
        .eq('owner_email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (ownerTenantError || !ownerTenant?.id) {
        return input.currentRole ?? null
    }

    const shouldPromote = shouldPromoteLegacyOwner({
        currentRole: input.currentRole,
        userEmail: email,
        tenantOwnerEmail: ownerTenant.owner_email as string | null,
        profileTenantId: input.profileTenantId,
        ownerTenantId: ownerTenant.id as string,
    })

    if (!shouldPromote) {
        return input.currentRole ?? null
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- profiles table not in generated types
    const { error: profileError } = await (admin as any)
        .from('profiles')
        .update({
            role: 'owner',
            tenant_id: ownerTenant.id as string,
        })
        .eq('id', input.userId)

    if (profileError) {
        logger.warn(`[panel-auth] Failed to promote ${input.userId} to owner: ${profileError.message}`)
        return input.currentRole ?? null
    }

    return 'owner'
}
