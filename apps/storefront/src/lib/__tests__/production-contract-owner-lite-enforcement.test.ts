import { describe, it, expect } from 'vitest'
import { shouldAllowPanelRoute, type PanelRouteKey, classifyPanelRoute } from '../panel-policy'
import type { PanelFeatureFlags } from '../panel-policy'

describe('Owner Lite Enforcement - Production Contract', () => {
    const defaultFlags: PanelFeatureFlags = {
        owner_lite_enabled: false,
        owner_advanced_modules_enabled: false,
    }

    const liteFlags: PanelFeatureFlags = {
        owner_lite_enabled: true,
        owner_advanced_modules_enabled: false,
    }

    const fullFlags: PanelFeatureFlags = {
        owner_lite_enabled: true,
        owner_advanced_modules_enabled: true,
        enable_carousel: true,
        enable_whatsapp_checkout: true,
        enable_cms_pages: true,
        enable_analytics: true,
        enable_chatbot: true,
        enable_self_service_returns: true,
        enable_crm: true,
        enable_reviews: true,
    }

    it('allows essential routes unconditionally', () => {
        const essentialRoutes: PanelRouteKey[] = [
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
        for (const route of essentialRoutes) {
            expect(shouldAllowPanelRoute(route, defaultFlags)).toBe(true)
            expect(shouldAllowPanelRoute(route, liteFlags)).toBe(true)
            expect(shouldAllowPanelRoute(route, fullFlags)).toBe(true)
            expect(classifyPanelRoute(route)).toBe('essential')
        }
    })

    it('blocks advanced routes when Owner Lite is ON', () => {
        const advancedRoutes: PanelRouteKey[] = [
            'carrusel', 'mensajes', 'paginas', 'analiticas', 'insignias', 'chatbot', 'devoluciones', 'crm', 'resenas'
        ]
        for (const route of advancedRoutes) {
            expect(shouldAllowPanelRoute(route, liteFlags)).toBe(false)
            expect(classifyPanelRoute(route)).toBe('advanced')
        }
    })

    it('allows advanced routes when Full Flags are ON', () => {
        const advancedRoutes: PanelRouteKey[] = [
            'carrusel', 'mensajes', 'paginas', 'analiticas', 'insignias', 'chatbot', 'devoluciones', 'crm', 'resenas'
        ]
        for (const route of advancedRoutes) {
            expect(shouldAllowPanelRoute(route, fullFlags)).toBe(true)
        }
    })

    it('denies unknown future routes (fail-closed, P1-2)', () => {
        const unknownRoute = 'future_module' as PanelRouteKey
        expect(shouldAllowPanelRoute(unknownRoute, defaultFlags)).toBe(false)
        expect(shouldAllowPanelRoute(unknownRoute, liteFlags)).toBe(false)
        expect(classifyPanelRoute('future_module')).toBe('unknown')
    })

    it('envios is always accessible (essential)', () => {
        expect(shouldAllowPanelRoute('envios', liteFlags)).toBe(true)
        expect(classifyPanelRoute('envios')).toBe('essential')
    })

    it('resenas is blocked with Owner Lite ON', () => {
        expect(shouldAllowPanelRoute('resenas', liteFlags)).toBe(false)
        expect(classifyPanelRoute('resenas')).toBe('advanced')
    })
})
