export interface PanelFeatureFlags {
    enable_carousel?: boolean
    enable_whatsapp_checkout?: boolean
    enable_cms_pages?: boolean
    enable_analytics?: boolean
    enable_chatbot?: boolean
    enable_self_service_returns?: boolean
    enable_crm?: boolean
    owner_lite_enabled?: boolean
    owner_advanced_modules_enabled?: boolean
}

export interface PanelSidebarLabels {
    dashboard: string
    catalog: string
    orders: string
    customers: string
    storeConfig: string
    shipping: string
    modules: string
    carousel: string
    whatsapp: string
    pages: string
    analytics: string
    badges: string
    chatbot: string
    returns: string
    crm: string
    ownerPanel: string
    backToStore: string
}

export interface PanelNavItem {
    key: string
    href: string
    label: string
    exact?: boolean
}

interface AdvancedModuleDef {
    key: 'carousel' | 'whatsapp' | 'pages' | 'analytics' | 'badges' | 'chatbot' | 'returns' | 'crm'
    segment: string
    featureKey?: keyof PanelFeatureFlags
}

const ESSENTIAL_MODULES = [
    { key: 'dashboard', segment: '', exact: true },
    { key: 'catalog', segment: 'catalogo' },
    { key: 'orders', segment: 'pedidos' },
    { key: 'customers', segment: 'clientes' },
    { key: 'storeConfig', segment: 'tienda' },
    { key: 'shipping', segment: 'envios' },
] as const

const ADVANCED_MODULES: AdvancedModuleDef[] = [
    { key: 'carousel', segment: 'carrusel', featureKey: 'enable_carousel' },
    { key: 'whatsapp', segment: 'mensajes', featureKey: 'enable_whatsapp_checkout' },
    { key: 'pages', segment: 'paginas', featureKey: 'enable_cms_pages' },
    { key: 'analytics', segment: 'analiticas', featureKey: 'enable_analytics' },
    { key: 'badges', segment: 'insignias' },
    { key: 'chatbot', segment: 'chatbot', featureKey: 'enable_chatbot' },
    { key: 'returns', segment: 'devoluciones', featureKey: 'enable_self_service_returns' },
    { key: 'crm', segment: 'crm', featureKey: 'enable_crm' },
]

export const OWNER_LITE_MODE_DEFAULT = false

function moduleHref(lang: string, segment: string): string {
    return segment ? `/${lang}/panel/${segment}` : `/${lang}/panel`
}

function isAdvancedModuleEnabled(
    moduleDef: AdvancedModuleDef,
    featureFlags: PanelFeatureFlags
): boolean {
    if (!moduleDef.featureKey) return true
    return Boolean(featureFlags[moduleDef.featureKey])
}

function resolveOwnerLiteMode(
    featureFlags: PanelFeatureFlags
): boolean {
    const ownerLiteEnabled = featureFlags.owner_lite_enabled ?? OWNER_LITE_MODE_DEFAULT
    const advancedModulesEnabled = featureFlags.owner_advanced_modules_enabled ?? false
    return ownerLiteEnabled && !advancedModulesEnabled
}

export function getPanelNavigation({
    lang,
    labels,
    featureFlags,
}: {
    lang: string
    labels: PanelSidebarLabels
    featureFlags: PanelFeatureFlags
}): { essentialItems: PanelNavItem[]; moduleItems: PanelNavItem[] } {
    const essentialItems: PanelNavItem[] = ESSENTIAL_MODULES.map(item => ({
        key: item.key,
        href: moduleHref(lang, item.segment),
        label: labels[item.key],
        exact: 'exact' in item ? item.exact : undefined,
    }))

    const ownerLiteMode = resolveOwnerLiteMode(featureFlags)
    if (ownerLiteMode) {
        return { essentialItems, moduleItems: [] }
    }

    const moduleItems: PanelNavItem[] = ADVANCED_MODULES
        .filter(item => isAdvancedModuleEnabled(item, featureFlags))
        .map(item => ({
            key: item.key,
            href: moduleHref(lang, item.segment),
            label: labels[item.key],
        }))

    return { essentialItems, moduleItems }
}

export function isAdvancedPanelRouteEnabled(
    pathname: string,
    featureFlags: PanelFeatureFlags
): boolean {
    const segments = pathname.split('/').filter(Boolean)
    const panelIndex = segments.findIndex(segment => segment === 'panel')
    if (panelIndex === -1) return true

    const routeSegment = segments[panelIndex + 1]
    if (!routeSegment) return true

    const advanced = ADVANCED_MODULES.find(item => item.segment === routeSegment)
    if (!advanced) return true
    const ownerLiteMode = resolveOwnerLiteMode(featureFlags)
    if (ownerLiteMode) return false

    return isAdvancedModuleEnabled(advanced, featureFlags)
}
