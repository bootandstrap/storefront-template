import { describe, it, expect } from 'vitest'
import {
    getPanelFallbackRoute,
    shouldAllowPanelRoute,
    type PanelRouteKey,
} from '../panel-policy'

// Default: no owner_lite flags → advanced modules visible
const defaultFlags = {
    enable_carousel: true,
    enable_whatsapp_checkout: true,
    enable_cms_pages: true,
    enable_analytics: true,
}

// Owner lite mode: owner_lite_enabled=true, advanced=false
const liteFlags = {
    ...defaultFlags,
    owner_lite_enabled: true,
    owner_advanced_modules_enabled: false,
}

// Full mode: owner_lite_enabled=true, advanced=true
const fullFlags = {
    ...defaultFlags,
    owner_lite_enabled: true,
    owner_advanced_modules_enabled: true,
}

describe('panel-route-guards', () => {
    it('allows all currently implemented non-module panel routes', () => {
        const existingRoutes: PanelRouteKey[] = [
            'dashboard',
            'catalogo',
            'pedidos',
            'clientes',
            'tienda',
            'envios',
            'mi-proyecto',
            'categorias',
            'productos',
            'inventario',
            'email',
            'suscripcion',
        ]

        for (const route of existingRoutes) {
            expect(shouldAllowPanelRoute(route, defaultFlags)).toBe(true)
        }
    })

    it('always allows essential routes', () => {
        expect(shouldAllowPanelRoute('dashboard', defaultFlags)).toBe(true)
        expect(shouldAllowPanelRoute('catalogo', defaultFlags)).toBe(true)
        expect(shouldAllowPanelRoute('pedidos', defaultFlags)).toBe(true)
        expect(shouldAllowPanelRoute('clientes', defaultFlags)).toBe(true)
        expect(shouldAllowPanelRoute('tienda', defaultFlags)).toBe(true)
    })

    it('allows advanced routes by default (no owner_lite flags)', () => {
        expect(shouldAllowPanelRoute('carrusel', defaultFlags)).toBe(true)
        expect(shouldAllowPanelRoute('mensajes', defaultFlags)).toBe(true)
        expect(shouldAllowPanelRoute('paginas', defaultFlags)).toBe(true)
        expect(shouldAllowPanelRoute('analiticas', defaultFlags)).toBe(true)
        expect(shouldAllowPanelRoute('insignias', defaultFlags)).toBe(true)
    })

    it('blocks advanced routes in owner lite mode', () => {
        expect(shouldAllowPanelRoute('carrusel', liteFlags)).toBe(false)
        expect(shouldAllowPanelRoute('mensajes', liteFlags)).toBe(false)
        expect(shouldAllowPanelRoute('paginas', liteFlags)).toBe(false)
        expect(shouldAllowPanelRoute('analiticas', liteFlags)).toBe(false)
        expect(shouldAllowPanelRoute('insignias', liteFlags)).toBe(false)
    })

    it('allows advanced routes when fully enabled and feature flag matches', () => {
        expect(shouldAllowPanelRoute('carrusel', fullFlags)).toBe(true)
        expect(shouldAllowPanelRoute('mensajes', fullFlags)).toBe(true)
        expect(shouldAllowPanelRoute('paginas', fullFlags)).toBe(true)
        expect(shouldAllowPanelRoute('insignias', fullFlags)).toBe(true)
    })

    it('returns panel fallback route with current locale', () => {
        expect(getPanelFallbackRoute('es')).toBe('/es/panel')
        expect(getPanelFallbackRoute('en')).toBe('/en/panel')
    })

    it('denies unknown routes (fail-closed, P1-2)', () => {
        expect(shouldAllowPanelRoute('desconocido' as PanelRouteKey, defaultFlags)).toBe(false)
    })
})
