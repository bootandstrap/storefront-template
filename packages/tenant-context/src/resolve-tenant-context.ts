import {
    isPanelRole,
    normalizeOwnerExperienceMode,
    type OwnerExperienceMode,
} from '@bootandstrap/platform-contract'

export interface ResolveTenantContextInput {
    profileRole?: string | null
    metadataRole?: string | null
    profileTenantId?: string | null
    envTenantId?: string | null
    ownerExperienceMode?: unknown
}

export interface TenantContext {
    role: string | null
    isPanelRole: boolean
    tenantId: string | null
    ownerExperienceMode: OwnerExperienceMode
    defaultPostLoginPath: '/panel' | '/cuenta'
}

export function resolveTenantContext(input: ResolveTenantContextInput): TenantContext {
    const role = input.profileRole ?? input.metadataRole ?? null
    const panelRole = isPanelRole(role)
    const tenantId = input.profileTenantId ?? (role === 'super_admin' ? input.envTenantId ?? null : null)

    return {
        role,
        isPanelRole: panelRole,
        tenantId,
        ownerExperienceMode: normalizeOwnerExperienceMode(input.ownerExperienceMode),
        defaultPostLoginPath: panelRole && tenantId ? '/panel' : '/cuenta',
    }
}
