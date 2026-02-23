/**
 * Centralized panel route guard — single source of truth.
 *
 * Consolidates route classification previously spread across this file
 * and panel-modules.ts. Now delegates ALL advanced-route gating to
 * `isAdvancedPanelRouteEnabled()` in panel-modules.ts, which already
 * has the canonical ADVANCED_MODULES list with feature key mappings.
 *
 * Guards are checked by:
 * 1. `(panel)/layout.tsx` — auth + enable_owner_panel
 * 2. Individual page components — call `shouldAllowPanelRoute()` for
 *    fine-grained feature flag checks on advanced routes
 *
 * @see panel-modules.ts for the canonical module definitions
 */
import {
    isAdvancedPanelRouteEnabled,
    type PanelFeatureFlags,
} from '@/lib/panel-modules'

// ────────────────────────────────────────────────────────────────────────────
// Essential routes — always accessible when panel is enabled
// ────────────────────────────────────────────────────────────────────────────

const ESSENTIAL_ROUTES = new Set([
    'dashboard',
    'catalogo',
    'pedidos',
    'clientes',
    'tienda',
])

// ────────────────────────────────────────────────────────────────────────────
// Advanced routes — derived from panel-modules.ts ADVANCED_MODULES
// Must stay in sync with the segments defined there.
// ────────────────────────────────────────────────────────────────────────────

const ADVANCED_ROUTES = new Set([
    'carrusel',
    'mensajes',
    'paginas',
    'analiticas',
    'insignias',
    'chatbot',
    'devoluciones',
])

/**
 * Union of all panel route segments (essential + advanced).
 * Used for type-safe route checks throughout the codebase.
 */
export type PanelRouteKey =
    | 'dashboard'
    | 'catalogo'
    | 'pedidos'
    | 'clientes'
    | 'tienda'
    | 'carrusel'
    | 'mensajes'
    | 'paginas'
    | 'analiticas'
    | 'insignias'
    | 'chatbot'
    | 'devoluciones'

export function getPanelFallbackRoute(lang: string): string {
    return `/${lang}/panel`
}

/**
 * Determines whether a specific panel route should be accessible
 * given the current feature flags.
 *
 * - Essential routes are always allowed.
 * - Advanced routes delegate to `isAdvancedPanelRouteEnabled()` which
 *   checks both owner_lite_mode and individual feature flags.
 * - Unknown routes are allowed (fail-open for future routes).
 */
export function shouldAllowPanelRoute(
    route: PanelRouteKey,
    featureFlags: PanelFeatureFlags
): boolean {
    if (ESSENTIAL_ROUTES.has(route)) return true
    if (!ADVANCED_ROUTES.has(route)) return true

    return isAdvancedPanelRouteEnabled(`/_/panel/${route}`, featureFlags)
}

/**
 * Classifies a panel route segment as essential or advanced.
 * Useful for middleware and layout-level decisions.
 */
export function classifyPanelRoute(
    segment: string
): 'essential' | 'advanced' | 'unknown' {
    if (ESSENTIAL_ROUTES.has(segment)) return 'essential'
    if (ADVANCED_ROUTES.has(segment)) return 'advanced'
    return 'unknown'
}
