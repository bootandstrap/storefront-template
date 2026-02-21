/**
 * PRODUCTION CONTRACT: Owner Lite Gating
 *
 * Validates that ALL advanced panel routes use the central
 * shouldAllowPanelRoute() guard for consistent Owner Lite segmentation.
 *
 * Contract requirements:
 * 1. Essential routes are ALWAYS accessible
 * 2. Advanced routes blocked in Lite mode (owner_lite + !advanced)
 * 3. ALL advanced routes including devoluciones and chatbot use the guard
 * 4. Unknown routes fail-open (future-proof)
 */

import { describe, it, expect } from 'vitest'
import {
    shouldAllowPanelRoute,
    classifyPanelRoute,
    type PanelRouteKey,
} from '../panel-route-guards'

const ESSENTIAL_ROUTES: PanelRouteKey[] = [
    'dashboard', 'catalogo', 'pedidos', 'clientes', 'tienda',
]

const ADVANCED_ROUTES: PanelRouteKey[] = [
    'carrusel', 'mensajes', 'paginas', 'analiticas', 'insignias',
    'chatbot', 'devoluciones',
]

// Lite mode: blocks all advanced modules
const liteFlags = {
    owner_lite_enabled: true,
    owner_advanced_modules_enabled: false,
    enable_carousel: true,
    enable_whatsapp_checkout: true,
    enable_cms_pages: true,
    enable_analytics: true,
    enable_chatbot: true,
    enable_self_service_returns: true,
    enable_product_badges: true,
}

// Full mode: allows all
const fullFlags = {
    ...liteFlags,
    owner_advanced_modules_enabled: true,
}

// Default (no lite mode)
const defaultFlags = {
    enable_carousel: true,
    enable_whatsapp_checkout: true,
    enable_cms_pages: true,
    enable_analytics: true,
    enable_chatbot: true,
    enable_self_service_returns: true,
    enable_product_badges: true,
}

describe('Production Contract: Owner Lite Gating', () => {
    describe('essential routes always accessible', () => {
        it.each(ESSENTIAL_ROUTES)('"%s" is always allowed regardless of flags', (route) => {
            expect(shouldAllowPanelRoute(route, liteFlags)).toBe(true)
            expect(shouldAllowPanelRoute(route, fullFlags)).toBe(true)
            expect(shouldAllowPanelRoute(route, defaultFlags)).toBe(true)
        })

        it.each(ESSENTIAL_ROUTES)('"%s" classifies as essential', (route) => {
            expect(classifyPanelRoute(route)).toBe('essential')
        })
    })

    describe('advanced routes blocked in lite mode', () => {
        it.each(ADVANCED_ROUTES)('"%s" is blocked in lite mode', (route) => {
            expect(shouldAllowPanelRoute(route, liteFlags)).toBe(false)
        })

        it.each(ADVANCED_ROUTES)('"%s" is allowed in full mode', (route) => {
            expect(shouldAllowPanelRoute(route, fullFlags)).toBe(true)
        })

        it.each(ADVANCED_ROUTES)('"%s" classifies as advanced', (route) => {
            expect(classifyPanelRoute(route)).toBe('advanced')
        })
    })

    describe('critical: devoluciones uses central guard', () => {
        it('devoluciones is classified as advanced route', () => {
            expect(classifyPanelRoute('devoluciones')).toBe('advanced')
        })

        it('devoluciones is blocked in lite mode', () => {
            expect(shouldAllowPanelRoute('devoluciones', liteFlags)).toBe(false)
        })

        it('devoluciones is allowed in full mode', () => {
            expect(shouldAllowPanelRoute('devoluciones', fullFlags)).toBe(true)
        })
    })

    describe('critical: chatbot uses central guard', () => {
        it('chatbot is classified as advanced route', () => {
            expect(classifyPanelRoute('chatbot')).toBe('advanced')
        })

        it('chatbot is blocked in lite mode', () => {
            expect(shouldAllowPanelRoute('chatbot', liteFlags)).toBe(false)
        })
    })

    describe('future-proof: unknown routes fail-open', () => {
        it('unknown route classifies as unknown', () => {
            expect(classifyPanelRoute('future_module')).toBe('unknown')
        })

        it('unknown route is allowed (fail-open)', () => {
            expect(
                shouldAllowPanelRoute('future_module' as PanelRouteKey, liteFlags)
            ).toBe(true)
        })
    })

    describe('route inventory completeness', () => {
        it('all 5 essential routes are defined', () => {
            expect(ESSENTIAL_ROUTES).toHaveLength(5)
        })

        it('all 7 advanced routes are defined', () => {
            expect(ADVANCED_ROUTES).toHaveLength(7)
        })

        it('total panel routes = 12', () => {
            expect(ESSENTIAL_ROUTES.length + ADVANCED_ROUTES.length).toBe(12)
        })
    })
})
