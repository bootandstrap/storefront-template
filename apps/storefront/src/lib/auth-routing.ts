import { isPanelRole } from '@/lib/panel-access-policy'

interface ResolvePostLoginDestinationParams {
    lang: string
    role?: string | null
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
    requestedRedirect,
}: ResolvePostLoginDestinationParams): string {
    const panelDefault = `/${lang}/panel`
    const accountDefault = `/${lang}/cuenta`
    const canAccessPanel = isPanelRole(role)
    const safeRedirect = getSafeRedirect(requestedRedirect, lang)

    if (!safeRedirect) {
        return canAccessPanel ? panelDefault : accountDefault
    }

    if (safeRedirect.startsWith(`/${lang}/panel`) && !canAccessPanel) {
        return accountDefault
    }

    return safeRedirect
}

