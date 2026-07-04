import {
    normalizeOwnerExperienceMode,
    type OwnerExperienceMode,
} from '@bootandstrap/platform-contract'

export function getOwnerExperienceMode(config: Record<string, unknown> | null | undefined): OwnerExperienceMode {
    return normalizeOwnerExperienceMode(config?.owner_experience_mode)
}

export function isStarterCollaborativeMode(config: Record<string, unknown> | null | undefined) {
    return getOwnerExperienceMode(config) === 'starter_collaborative'
}

export async function resolveOwnerExperienceModeForTenant({
    tenantId,
    supabase,
}: {
    tenantId?: string | null
    supabase?: { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null, error: { message?: string } | null }> } } } }
    config?: Record<string, unknown> | null
}) {
    const fallbackMode = normalizeOwnerExperienceMode(undefined)

    if (!tenantId || !supabase) {
        return fallbackMode
    }

    try {
        const { data, error } = await supabase
            .from('tenants')
            .select('owner_experience_mode')
            .eq('id', tenantId)
            .maybeSingle()

        if (error || !data) {
            return fallbackMode
        }

        return getOwnerExperienceMode(data)
    } catch {
        return fallbackMode
    }
}

export function isStarterPanelRouteAllowed(
    routeSegment: string | undefined,
    mode: OwnerExperienceMode
) {
    if (mode !== 'starter_collaborative') {
        return true
    }

    return !routeSegment
}
