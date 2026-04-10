/**
 * @module panel-policy
 * @description Panel Policy — 6-Section Navigation Model (SOTA Redesign 2026-04-10)
 *
 * Navigation architecture: 6 primary sections in sidebar
 *   1. 🏠 Inicio       — Dashboard KPIs, tips, activity
 *   2. 📦 Mi Tienda    — Products, Categories, Inventory, Badges, Carousel, Pages, Price Labels
 *   3. 🛒 Ventas       — Orders, Customers, Returns, Reviews, Loyalty
 *   4. ⚡ Módulos      — Module marketplace + active module pages
 *   5. ⚙️ Ajustes     — Store config, Shipping, Languages, Analytics, Email, Subscription, Project, WiFi QR
 *   6. 💳 POS          — Full-screen standalone (only visible when enable_pos is active)
 *
 * Each section has internal tabs handled by the section page itself.
 * The sidebar only shows 6 items — cognitive simplicity for non-tech owners.
 *
 * @locked 🔴 PLATFORM — Core navigation logic.
 */

// ── Feature Flags ─────────────────────────────────────────────────────────

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

// ── Sidebar Labels (only 6 sections + meta) ───────────────────────────────

export interface PanelSidebarLabels {
    home: string
    myStore: string
    sales: string
    modules: string
    settings: string
    pos: string
    ownerPanel: string
    backToStore: string
}

// ── Navigation Types ──────────────────────────────────────────────────────

export type SectionKey = 'home' | 'myStore' | 'sales' | 'modules' | 'settings' | 'pos'

export interface PanelNavSection {
    key: SectionKey
    href: string
    label: string
    icon: string
    /** If true, only shown when a specific feature flag is enabled */
    visible: boolean
    /** Badge count (e.g., pending orders) */
    badge?: number
    /** Exact match for active state (dashboard) */
    exact?: boolean
}

// ── Tab Types (for section sub-navigation) ────────────────────────────────

export interface PanelTab {
    key: string
    label: string
    /** Feature flag that must be true for this tab to appear */
    featureKey?: keyof PanelFeatureFlags
    /** Whether this tab is visible given current flags */
    visible: boolean
}

// ── Section Navigation Builder ────────────────────────────────────────────

export function getPanelSections({
    lang,
    labels,
    featureFlags,
    badges = {},
}: {
    lang: string
    labels: PanelSidebarLabels
    featureFlags: PanelFeatureFlags
    badges?: Record<string, number>
}): PanelNavSection[] {
    const sections: PanelNavSection[] = [
        {
            key: 'home',
            href: `/${lang}/panel`,
            label: labels.home,
            icon: 'home',
            visible: true,
            exact: true,
        },
        {
            key: 'myStore',
            href: `/${lang}/panel/mi-tienda`,
            label: labels.myStore,
            icon: 'store',
            visible: true,
        },
        {
            key: 'sales',
            href: `/${lang}/panel/ventas`,
            label: labels.sales,
            icon: 'sales',
            visible: true,
            badge: badges.orders,
        },
        {
            key: 'modules',
            href: `/${lang}/panel/modulos`,
            label: labels.modules,
            icon: 'modules',
            visible: true,
        },
        {
            key: 'settings',
            href: `/${lang}/panel/ajustes`,
            label: labels.settings,
            icon: 'settings',
            visible: true,
        },
        {
            key: 'pos',
            href: `/${lang}/panel/pos`,
            label: labels.pos,
            icon: 'pos',
            visible: !!featureFlags.enable_pos,
        },
    ]

    return sections.filter(s => s.visible)
}

// ── Tab Definitions per Section ───────────────────────────────────────────

export function getMyStoreTabs(featureFlags: PanelFeatureFlags): PanelTab[] {
    const tabs: PanelTab[] = [
        { key: 'productos', label: 'panel.tabs.products', visible: true },
        { key: 'categorias', label: 'panel.tabs.categories', visible: true },
        { key: 'inventario', label: 'panel.tabs.inventory', visible: true },
        { key: 'insignias', label: 'panel.tabs.badges', featureKey: 'enable_product_badges', visible: !!featureFlags.enable_product_badges },
        { key: 'carrusel', label: 'panel.tabs.carousel', featureKey: 'enable_carousel', visible: !!featureFlags.enable_carousel },
        { key: 'paginas', label: 'panel.tabs.pages', featureKey: 'enable_cms_pages', visible: !!featureFlags.enable_cms_pages },
    ]
    return tabs.filter(t => t.visible)
}

export function getSalesTabs(featureFlags: PanelFeatureFlags): PanelTab[] {
    const tabs: PanelTab[] = [
        { key: 'pedidos', label: 'panel.tabs.orders', visible: true },
        { key: 'clientes', label: 'panel.tabs.customers', visible: true },
        { key: 'devoluciones', label: 'panel.tabs.returns', featureKey: 'enable_self_service_returns', visible: !!featureFlags.enable_self_service_returns },
        { key: 'resenas', label: 'panel.tabs.reviews', featureKey: 'enable_reviews', visible: !!featureFlags.enable_reviews },
    ]
    return tabs.filter(t => t.visible)
}

export function getSettingsTabs(featureFlags: PanelFeatureFlags): PanelTab[] {
    const tabs: PanelTab[] = [
        { key: 'tienda', label: 'panel.tabs.storeConfig', visible: true },
        { key: 'envios', label: 'panel.tabs.shipping', visible: true },
        { key: 'idiomas', label: 'panel.tabs.languages', featureKey: 'enable_multi_language', visible: !!featureFlags.enable_multi_language },
        { key: 'analiticas', label: 'panel.tabs.analytics', featureKey: 'enable_analytics', visible: !!featureFlags.enable_analytics },
        { key: 'email', label: 'panel.tabs.email', visible: true },
        { key: 'suscripcion', label: 'panel.tabs.subscription', visible: true },
        { key: 'proyecto', label: 'panel.tabs.project', visible: true },
        { key: 'wifi', label: 'panel.tabs.wifi', visible: true },
    ]
    return tabs.filter(t => t.visible)
}

export function getModuleTabs(featureFlags: PanelFeatureFlags): PanelTab[] {
    const tabs: PanelTab[] = [
        { key: 'marketplace', label: 'panel.tabs.marketplace', visible: true },
    ]

    // Active module pages appear as additional tabs
    const modulePages: Array<{ key: string; label: string; featureKey: keyof PanelFeatureFlags }> = [
        { key: 'chatbot', label: 'panel.tabs.chatbot', featureKey: 'enable_chatbot' },
        { key: 'crm', label: 'panel.tabs.crm', featureKey: 'enable_crm' },
        { key: 'seo', label: 'panel.tabs.seo', featureKey: 'enable_seo' },
        { key: 'redes-sociales', label: 'panel.tabs.socialMedia', featureKey: 'enable_social_media' },
        { key: 'mensajes', label: 'panel.tabs.whatsapp', featureKey: 'enable_whatsapp_checkout' },
        { key: 'automatizaciones', label: 'panel.tabs.automations', featureKey: 'enable_automations' },
        { key: 'canales', label: 'panel.tabs.salesChannels', featureKey: 'enable_sales_channels' },
        { key: 'capacidad', label: 'panel.tabs.capacity', featureKey: 'enable_traffic_expansion' },
        { key: 'auth', label: 'panel.tabs.authAdvanced', featureKey: 'enable_auth_advanced' },
    ]

    for (const mod of modulePages) {
        if (featureFlags[mod.featureKey]) {
            tabs.push({ key: mod.key, label: mod.label, featureKey: mod.featureKey, visible: true })
        }
    }

    return tabs
}

// ── Route Resolution ──────────────────────────────────────────────────────

/**
 * Maps old URL segments to new section/tab locations.
 * Used by redirect pages and the panel layout for route guards.
 */
export const ROUTE_REDIRECT_MAP: Record<string, { section: string; tab?: string }> = {
    // Old standalone routes → new section tabs
    'catalogo': { section: 'mi-tienda', tab: 'productos' },
    'productos': { section: 'mi-tienda', tab: 'productos' },
    'categorias': { section: 'mi-tienda', tab: 'categorias' },
    'inventario': { section: 'mi-tienda', tab: 'inventario' },
    'insignias': { section: 'mi-tienda', tab: 'insignias' },
    'carrusel': { section: 'mi-tienda', tab: 'carrusel' },
    'paginas': { section: 'mi-tienda', tab: 'paginas' },
    'pedidos': { section: 'ventas', tab: 'pedidos' },
    'clientes': { section: 'ventas', tab: 'clientes' },
    'devoluciones': { section: 'ventas', tab: 'devoluciones' },
    'resenas': { section: 'ventas', tab: 'resenas' },
    'tienda': { section: 'ajustes', tab: 'tienda' },
    'envios': { section: 'ajustes', tab: 'envios' },
    'idiomas': { section: 'ajustes', tab: 'idiomas' },
    'analiticas': { section: 'ajustes', tab: 'analiticas' },
    'email': { section: 'ajustes', tab: 'email' },
    'suscripcion': { section: 'ajustes', tab: 'suscripcion' },
    'mi-proyecto': { section: 'ajustes', tab: 'proyecto' },
    'utilidades': { section: 'ajustes', tab: 'wifi' },
    // Module routes stay under modulos
    'chatbot': { section: 'modulos', tab: 'chatbot' },
    'crm': { section: 'modulos', tab: 'crm' },
    'seo': { section: 'modulos', tab: 'seo' },
    'redes-sociales': { section: 'modulos', tab: 'redes-sociales' },
    'mensajes': { section: 'modulos', tab: 'mensajes' },
    'automatizaciones': { section: 'modulos', tab: 'automatizaciones' },
    'canales': { section: 'modulos', tab: 'canales' },
    'capacidad': { section: 'modulos', tab: 'capacidad' },
    'auth': { section: 'modulos', tab: 'auth' },
    // Keep as-is
    'pos': { section: 'pos' },
    'modulos': { section: 'modulos' },
}

// ── Route Classification (kept for backward compat with layout guards) ────

const ALL_KNOWN_ROUTES = new Set([
    // New primary routes
    'mi-tienda', 'ventas', 'ajustes', 'modulos', 'pos',
    // Legacy routes (still have redirect pages)
    ...Object.keys(ROUTE_REDIRECT_MAP),
])

export type PanelRouteKey = string

export function classifyPanelRoute(
    segment: string
): 'primary' | 'legacy' | 'unknown' {
    if (['mi-tienda', 'ventas', 'ajustes', 'modulos', 'pos'].includes(segment)) return 'primary'
    if (ROUTE_REDIRECT_MAP[segment]) return 'legacy'
    return 'unknown'
}

export function shouldAllowPanelRoute(
    route: PanelRouteKey,
    featureFlags: PanelFeatureFlags
): boolean {
    const classification = classifyPanelRoute(route)

    // Primary routes always allowed
    if (classification === 'primary') return true

    // Legacy routes: check if the destination section/tab is feature-gated
    if (classification === 'legacy') {
        const redirect = ROUTE_REDIRECT_MAP[route]
        if (!redirect) return false

        // Module routes need their feature flag
        if (redirect.section === 'modulos' && redirect.tab) {
            const moduleTab = getModuleTabs(featureFlags).find(t => t.key === redirect.tab)
            // marketplace tab is always allowed
            if (redirect.tab === 'marketplace') return true
            return !!moduleTab
        }

        return true
    }

    // Unknown routes: fail-closed
    return false
}

export function evaluatePanelAccess(
    route: PanelRouteKey | string,
    flags: PanelFeatureFlags,
    limits: Record<string, number>,
    userRole: 'owner' | 'super_admin'
): { allowed: boolean; reason?: string; redirect?: string } {
    if (userRole === 'super_admin') {
        return { allowed: true }
    }

    const allowed = shouldAllowPanelRoute(route, flags)
    if (!allowed) {
        return {
            allowed: false,
            reason: 'route_not_allowed',
        }
    }

    return { allowed: true }
}

export function getPanelFallbackRoute(lang: string): string {
    return `/${lang}/panel`
}

// ── Legacy Compatibility Exports ──────────────────────────────────────────
// These are kept so that existing code (layout, proxy, guards) continues to
// work while we migrate. They delegate to the new section-based system.

export interface PanelNavItem {
    key: string
    href: string
    label: string
    exact?: boolean
    group?: string
}

/** @deprecated — Use getPanelSections() instead */
export function getPanelNavigationGrouped(opts: {
    lang: string
    labels: Record<string, string>
    featureFlags: PanelFeatureFlags
}): { operations: PanelNavItem[]; content: PanelNavItem[]; settings: PanelNavItem[] } {
    // Map to the new sections for backward compat during migration
    const sections = getPanelSections({
        lang: opts.lang,
        labels: {
            home: opts.labels.dashboard || 'Home',
            myStore: opts.labels.catalog || 'My Store',
            sales: opts.labels.orders || 'Sales',
            modules: opts.labels.modules || 'Modules',
            settings: opts.labels.storeConfig || 'Settings',
            pos: opts.labels.pos || 'POS',
            ownerPanel: opts.labels.ownerPanel || 'Owner Panel',
            backToStore: opts.labels.backToStore || 'Back to store',
        },
        featureFlags: opts.featureFlags,
    })

    const operations = sections
        .filter(s => ['home', 'sales'].includes(s.key))
        .map(s => ({ key: s.key, href: s.href, label: s.label, exact: s.exact }))

    const content = sections
        .filter(s => ['myStore', 'modules'].includes(s.key))
        .map(s => ({ key: s.key, href: s.href, label: s.label }))

    const settings = sections
        .filter(s => ['settings', 'pos'].includes(s.key))
        .map(s => ({ key: s.key, href: s.href, label: s.label }))

    return { operations, content, settings }
}

/** @deprecated — Use getPanelSections() instead */
export function getPanelNavigation(opts: {
    lang: string
    labels: Record<string, string>
    featureFlags: PanelFeatureFlags
}): { essentialItems: PanelNavItem[]; moduleItems: PanelNavItem[] } {
    const grouped = getPanelNavigationGrouped(opts)
    return {
        essentialItems: [...grouped.operations, ...grouped.content, ...grouped.settings],
        moduleItems: [],
    }
}

// Keep ADVANCED_MODULES export for backward compat (used by layout proxy)
export const ADVANCED_MODULES = Object.keys(ROUTE_REDIRECT_MAP)
    .filter(k => ROUTE_REDIRECT_MAP[k].section === 'modulos' && k !== 'modulos')
    .map(k => ({
        key: k,
        segment: k,
        featureKey: undefined as string | undefined,
    }))

export function isAdvancedPanelRouteEnabled(
    pathname: string,
    featureFlags: PanelFeatureFlags
): boolean {
    const segments = pathname.split('/').filter(Boolean)
    const panelIndex = segments.findIndex(seg => seg === 'panel')
    if (panelIndex === -1) return true
    const routeSegment = segments[panelIndex + 1]
    if (!routeSegment) return true
    return shouldAllowPanelRoute(routeSegment, featureFlags)
}
