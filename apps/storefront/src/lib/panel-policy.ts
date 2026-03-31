/**
 * @internal
 * Panel Policy — Navigation and route classification logic.
 *
 * For server actions, use `panel-guard.ts` (`withPanelGuard()`) as the public entry point.
 * This module is consumed internally by proxy.ts and panel layouts.
 */
export interface PanelFeatureFlags {
    enable_carousel?: boolean
    enable_whatsapp_checkout?: boolean
    enable_cms_pages?: boolean
    enable_analytics?: boolean
    enable_chatbot?: boolean
    enable_self_service_returns?: boolean
    enable_crm?: boolean
    enable_reviews?: boolean
    enable_pos?: boolean
    enable_traffic_expansion?: boolean
    enable_product_badges?: boolean
    enable_seo?: boolean
    enable_social_media?: boolean
    enable_multi_language?: boolean
    enable_automations?: boolean
    enable_auth_advanced?: boolean
    enable_sales_channels?: boolean
    owner_lite_enabled?: boolean
    owner_advanced_modules_enabled?: boolean
}

export interface PanelSidebarLabels {
    dashboard: string
    catalog: string
    orders: string
    customers: string
    utilities: string
    storeConfig: string
    shipping: string
    myProject: string
    modules: string
    carousel: string
    whatsapp: string
    pages: string
    analytics: string
    badges: string
    chatbot: string
    returns: string
    crm: string
    reviews: string
    pos: string
    capacidad: string
    seo: string
    socialMedia: string
    i18n: string
    automations: string
    authAdvanced: string
    salesChannels: string
    ownerPanel: string
    backToStore: string
    groupOperations: string
    groupContent: string
    groupSettings: string
}

export type NavGroup = 'operations' | 'content' | 'settings'

export interface PanelNavItem {
    key: string
    href: string
    label: string
    exact?: boolean
    group?: NavGroup
}

interface AdvancedModuleDef {
    key: 'carousel' | 'whatsapp' | 'pages' | 'analytics' | 'badges' | 'chatbot' | 'returns' | 'crm' | 'reviews' | 'pos' | 'capacidad' | 'seo' | 'socialMedia' | 'i18n' | 'automations' | 'authAdvanced' | 'salesChannels'
    segment: string
    featureKey?: keyof PanelFeatureFlags
}

const ESSENTIAL_MODULES = [
    { key: 'dashboard', segment: '', exact: true },
    { key: 'catalog', segment: 'catalogo' },
    { key: 'orders', segment: 'pedidos' },
    { key: 'customers', segment: 'clientes' },
    { key: 'utilities', segment: 'utilidades' },
    { key: 'storeConfig', segment: 'tienda' },
    { key: 'shipping', segment: 'envios' },
    { key: 'myProject', segment: 'mi-proyecto' },
    { key: 'modules', segment: 'modulos' },
] as const

export const ADVANCED_MODULES: AdvancedModuleDef[] = [
    { key: 'carousel', segment: 'carrusel', featureKey: 'enable_carousel' },
    { key: 'whatsapp', segment: 'mensajes', featureKey: 'enable_whatsapp_checkout' },
    { key: 'pages', segment: 'paginas', featureKey: 'enable_cms_pages' },
    { key: 'analytics', segment: 'analiticas', featureKey: 'enable_analytics' },
    { key: 'badges', segment: 'insignias', featureKey: 'enable_product_badges' },
    { key: 'chatbot', segment: 'chatbot', featureKey: 'enable_chatbot' },
    { key: 'returns', segment: 'devoluciones', featureKey: 'enable_self_service_returns' },
    { key: 'crm', segment: 'crm', featureKey: 'enable_crm' },
    { key: 'reviews', segment: 'resenas', featureKey: 'enable_reviews' },
    { key: 'pos', segment: 'pos', featureKey: 'enable_pos' },
    { key: 'capacidad', segment: 'capacidad', featureKey: 'enable_traffic_expansion' },
    { key: 'seo', segment: 'seo', featureKey: 'enable_seo' },
    { key: 'socialMedia', segment: 'redes-sociales', featureKey: 'enable_social_media' },
    { key: 'i18n', segment: 'idiomas', featureKey: 'enable_multi_language' },
    { key: 'automations', segment: 'automatizaciones', featureKey: 'enable_automations' },
    { key: 'authAdvanced', segment: 'auth', featureKey: 'enable_auth_advanced' },
    { key: 'salesChannels', segment: 'canales', featureKey: 'enable_sales_channels' },
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

// ── 3-Bucket Grouped Navigation ──
// Maps each nav item to one of: operations, content, settings
const GROUP_MAP: Record<string, NavGroup> = {
    // Operations — day-to-day business actions
    dashboard: 'operations',
    orders: 'operations',
    customers: 'operations',
    utilities: 'operations',
    pos: 'operations',
    crm: 'operations',
    returns: 'operations',
    salesChannels: 'operations',
    // Content — product catalog & marketing
    catalog: 'content',
    carousel: 'content',
    pages: 'content',
    badges: 'content',
    chatbot: 'content',
    reviews: 'content',
    whatsapp: 'content',
    seo: 'content',
    socialMedia: 'content',
    // Settings — store configuration & infrastructure
    storeConfig: 'settings',
    shipping: 'settings',
    analytics: 'settings',
    capacidad: 'settings',
    myProject: 'settings',
    modules: 'settings',
    i18n: 'settings',
    automations: 'settings',
    authAdvanced: 'settings',
}

export interface GroupedNavigation {
    operations: PanelNavItem[]
    content: PanelNavItem[]
    settings: PanelNavItem[]
}

export function getPanelNavigationGrouped({
    lang,
    labels,
    featureFlags,
}: {
    lang: string
    labels: PanelSidebarLabels
    featureFlags: PanelFeatureFlags
}): GroupedNavigation {
    const { essentialItems, moduleItems } = getPanelNavigation({ lang, labels, featureFlags })
    const allItems = [...essentialItems, ...moduleItems]

    const operations: PanelNavItem[] = []
    const content: PanelNavItem[] = []
    const settings: PanelNavItem[] = []

    for (const item of allItems) {
        const group = GROUP_MAP[item.key] || 'settings'
        const tagged = { ...item, group }
        switch (group) {
            case 'operations': operations.push(tagged); break
            case 'content': content.push(tagged); break
            case 'settings': settings.push(tagged); break
        }
    }

    return { operations, content, settings }
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

const ESSENTIAL_ROUTES = new Set([
    'dashboard',
    'catalogo',
    'pedidos',
    'clientes',
    'utilidades',
    'tienda',
    'envios',
    'mi-proyecto',
    'categorias',
    'productos',
    'inventario',
    'email',
    'suscripcion',
    'modulos',
])

const ADVANCED_ROUTES = new Set([
    'carrusel',
    'mensajes',
    'paginas',
    'analiticas',
    'insignias',
    'chatbot',
    'devoluciones',
    'crm',
    'resenas',
    'pos',
    'capacidad',
    'seo',
    'redes-sociales',
    'idiomas',
    'automatizaciones',
    'auth',
    'canales',
])

export type PanelRouteKey =
    | 'dashboard'
    | 'catalogo'
    | 'pedidos'
    | 'clientes'
    | 'utilidades'
    | 'tienda'
    | 'envios'
    | 'mi-proyecto'
    | 'categorias'
    | 'productos'
    | 'inventario'
    | 'email'
    | 'suscripcion'
    | 'modulos'
    | 'carrusel'
    | 'mensajes'
    | 'paginas'
    | 'analiticas'
    | 'insignias'
    | 'chatbot'
    | 'devoluciones'
    | 'crm'
    | 'resenas'
    | 'pos'
    | 'capacidad'
    | 'seo'
    | 'redes-sociales'
    | 'idiomas'
    | 'automatizaciones'
    | 'auth'
    | 'canales'

export function getPanelFallbackRoute(lang: string): string {
    return `/${lang}/panel`
}

export function shouldAllowPanelRoute(
    route: PanelRouteKey,
    featureFlags: PanelFeatureFlags
): boolean {
    if (ESSENTIAL_ROUTES.has(route)) return true
    if (!ADVANCED_ROUTES.has(route)) return false // Fail-closed for unknown routes

    return isAdvancedPanelRouteEnabled(`/_/panel/${route}`, featureFlags)
}

export function classifyPanelRoute(
    segment: string
): 'essential' | 'advanced' | 'unknown' {
    if (ESSENTIAL_ROUTES.has(segment)) return 'essential'
    if (ADVANCED_ROUTES.has(segment)) return 'advanced'
    return 'unknown'
}

export function evaluatePanelAccess(
    route: PanelRouteKey | string,
    flags: PanelFeatureFlags,
    limits: Record<string, number>, // Limits parameter kept for future extensibility
    userRole: 'owner' | 'super_admin'
): { allowed: boolean; reason?: string; redirect?: string } {
    // SuperAdmins bypass capability restrictions inside the panel 
    // (though proxy usually sends them to the global BSWEB admin anyway)
    if (userRole === 'super_admin') {
        return { allowed: true }
    }

    const classification = classifyPanelRoute(route)
    if (classification === 'essential') {
        return { allowed: true }
    }

    if (classification === 'advanced') {
        const allowed = shouldAllowPanelRoute(route as PanelRouteKey, flags)
        if (!allowed) {
            return {
                allowed: false,
                reason: 'advanced_module_disabled_or_owner_lite',
            }
        }
        return { allowed: true }
    }

    // Fail-CLOSED for unknown routes (P1-2 fix)
    // Any route not in ESSENTIAL_ROUTES or ADVANCED_ROUTES is denied by default.
    // New routes must be explicitly added to one of these sets.
    return { allowed: false, reason: 'route_not_recognized' }
}
