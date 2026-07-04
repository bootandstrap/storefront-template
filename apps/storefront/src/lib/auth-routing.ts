import { resolveTenantContext } from '@bootandstrap/tenant-context'

interface ResolvePostLoginDestinationParams {
    lang: string
    role?: string | null
    profileRole?: string | null
    metadataRole?: string | null
    profileTenantId?: string | null
    envTenantId?: string | null
    requestedRedirect?: string | null
}

function getSafeRedirect(requestedRedirect: string | null | undefined, lang: string): string | null {
    if (!requestedRedirect) return null
    if (!requestedRedirect.startsWith('/')) return null
    if (requestedRedirect.startsWith('//')) return null
    if (!requestedRedirect.startsWith(`/${lang}/`)) return null
    if (requestedRedirect.includes('\n') || requestedRedirect.includes('\r')) return null
    return requestedRedirect
}

export function resolvePostLoginDestination({
    lang,
    role,
    profileRole,
    metadataRole,
    profileTenantId,
    envTenantId,
    requestedRedirect,
}: ResolvePostLoginDestinationParams): string {
    const resolvedProfileRole = profileRole ?? role ?? null
    const hasExplicitTenantContext = metadataRole !== undefined
        || profileTenantId !== undefined
        || envTenantId !== undefined

    const context = hasExplicitTenantContext
        ? resolveTenantContext({
            profileRole: resolvedProfileRole,
            metadataRole,
            profileTenantId,
            envTenantId,
        })
        : resolveTenantContext({
            profileRole: resolvedProfileRole,
            profileTenantId: '__legacy-panel-fallback__',
        })
    const accountDefault = `/${lang}/cuenta`
    const safeRedirect = getSafeRedirect(requestedRedirect, lang)

    if (!safeRedirect) {
        return `/${lang}${context.defaultPostLoginPath}`
    }

    if (safeRedirect.startsWith(`/${lang}/panel`) && !context.isPanelRole) {
        return accountDefault
    }

    return safeRedirect
}
