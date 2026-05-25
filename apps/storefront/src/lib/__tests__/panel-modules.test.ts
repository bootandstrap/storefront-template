import { describe, it, expect } from 'vitest'
import {
    getPanelSections,
    isAdvancedPanelRouteEnabled,
    shouldAllowPanelRoute,
    type PanelFeatureFlags,
} from '../panel-policy'

function baseFlags(): PanelFeatureFlags {
    return {
        enable_carousel: true,
        enable_whatsapp_checkout: true,
        enable_cms_pages: true,
        enable_analytics: true,
    }
}

function liteFlags(): PanelFeatureFlags {
    return {
        ...baseFlags(),
        owner_lite_enabled: true,
        owner_advanced_modules_enabled: false,
    }
}

function fullFlags(): PanelFeatureFlags {
    return {
        ...baseFlags(),
        owner_lite_enabled: true,
        owner_advanced_modules_enabled: true,
        enable_product_badges: true,
    }
}

function baseLabels() {
    return {
        home: 'Home',
        myStore: 'My Store',
        sales: 'Sales',
        modules: 'Modules',
        settings: 'Settings',
        pos: 'POS',
        ownerPanel: 'Owner Panel',
        backToStore: 'Back to store',
        health: 'Health',
    }
}

describe('panel-modules', () => {
    it('getPanelSections returns primary sections', () => {
        const sections = getPanelSections({
            lang: 'es',
            labels: baseLabels(),
            featureFlags: baseFlags(),
        })

        const keys = sections.map(s => s.key)
        expect(keys).toContain('home')
        expect(keys).toContain('myStore')
        expect(keys).toContain('sales')
        expect(keys).toContain('settings')
    })

    it('all primary routes are allowed', () => {
        expect(shouldAllowPanelRoute('mi-tienda', baseFlags())).toBe(true)
        expect(shouldAllowPanelRoute('ventas', baseFlags())).toBe(true)
        expect(shouldAllowPanelRoute('ajustes', baseFlags())).toBe(true)
        expect(shouldAllowPanelRoute('modulos', baseFlags())).toBe(true)
        expect(shouldAllowPanelRoute('pos', baseFlags())).toBe(true)
    })

    it('legacy routes are allowed (redirects handle them)', () => {
        expect(shouldAllowPanelRoute('carrusel', baseFlags())).toBe(true)
        expect(shouldAllowPanelRoute('productos', baseFlags())).toBe(true)
        expect(shouldAllowPanelRoute('pedidos', baseFlags())).toBe(true)
    })

    it('unknown routes are blocked (fail-closed)', () => {
        expect(shouldAllowPanelRoute('nonexistent', baseFlags())).toBe(false)
        expect(shouldAllowPanelRoute('admin', baseFlags())).toBe(false)
    })

    it('owner lite guard blocks advanced legacy routes', () => {
        expect(isAdvancedPanelRouteEnabled('/es/panel/carrusel', liteFlags())).toBe(false)
        expect(isAdvancedPanelRouteEnabled('/es/panel/insignias', liteFlags())).toBe(false)
    })

    it('default guard respects feature flags before owner lite gating', () => {
        expect(isAdvancedPanelRouteEnabled('/es/panel/carrusel', baseFlags())).toBe(true)
        expect(isAdvancedPanelRouteEnabled('/es/panel/insignias', baseFlags())).toBe(false)
        expect(isAdvancedPanelRouteEnabled('/es/panel/insignias', fullFlags())).toBe(true)
    })

    it('primary routes always pass the guard', () => {
        expect(isAdvancedPanelRouteEnabled('/es/panel/mi-tienda', liteFlags())).toBe(true)
        expect(isAdvancedPanelRouteEnabled('/es/panel/ventas', liteFlags())).toBe(true)
        expect(isAdvancedPanelRouteEnabled('/es/panel/ajustes', liteFlags())).toBe(true)
    })

    it('unknown routes are blocked by the guard', () => {
        expect(isAdvancedPanelRouteEnabled('/es/panel/nonexistent', liteFlags())).toBe(false)
    })
})
