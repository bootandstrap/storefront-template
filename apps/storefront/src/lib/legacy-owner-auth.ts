import { isPanelRole } from '@/lib/panel-access-policy'
import { createAdminClient } from '@/lib/supabase/admin'

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

    const { data: ownerTenant, error: ownerTenantError } = await admin
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

    const { error: profileError } = await admin
        .from('profiles')
        .update({
            role: 'owner',
            tenant_id: ownerTenant.id as string,
        })
        .eq('id', input.userId)

    if (profileError) {
        console.warn(`[legacy-owner-auth] Failed to promote ${input.userId} to owner: ${profileError.message}`)
        return input.currentRole ?? null
    }

    return 'owner'
}
