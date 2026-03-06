import { describe, it, expect } from 'vitest'
import {
    getPanelNavigation,
    isAdvancedPanelRouteEnabled,
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
    }
}

function baseLabels() {
    return {
        dashboard: 'Dashboard',
        catalog: 'Catalog',
        orders: 'Orders',
        customers: 'Customers',
        storeConfig: 'Store',
        shipping: 'Shipping',
        modules: 'Modules',
        carousel: 'Carousel',
        whatsapp: 'WhatsApp',
        pages: 'Pages',
        analytics: 'Analytics',
        badges: 'Badges',
        chatbot: 'Chatbot',
        returns: 'Returns',
        crm: 'CRM',
        reviews: 'Reviews',
        ownerPanel: 'Owner Panel',
        backToStore: 'Back',
    }
}

describe('panel-modules', () => {
    it('shows advanced modules by default (no flags set)', () => {
        const nav = getPanelNavigation({
            lang: 'es',
            labels: baseLabels(),
            featureFlags: baseFlags(),
        })

        expect(nav.essentialItems).toHaveLength(6)
        expect(nav.moduleItems.length).toBeGreaterThan(0)
    })

    it('hides advanced modules in owner lite mode', () => {
        const nav = getPanelNavigation({
            lang: 'es',
            labels: baseLabels(),
            featureFlags: liteFlags(),
        })

        expect(nav.essentialItems).toHaveLength(6)
        expect(nav.moduleItems).toHaveLength(0)
    })

    it('shows feature-flagged advanced modules when fully enabled', () => {
        const flags = fullFlags()
        flags.enable_analytics = false

        const nav = getPanelNavigation({
            lang: 'es',
            labels: baseLabels(),
            featureFlags: flags,
        })

        expect(nav.moduleItems.map(item => item.key)).toEqual([
            'carousel',
            'whatsapp',
            'pages',
            'badges',
        ])
    })

    it('blocks advanced routes in owner lite mode', () => {
        expect(isAdvancedPanelRouteEnabled('/es/panel/carrusel', liteFlags())).toBe(false)
        expect(isAdvancedPanelRouteEnabled('/es/panel/insignias', liteFlags())).toBe(false)
    })

    it('allows advanced routes when fully enabled and feature flag matches', () => {
        const flags = fullFlags()
        flags.enable_carousel = false

        expect(
            isAdvancedPanelRouteEnabled('/es/panel/carrusel', flags)
        ).toBe(false)
        expect(
            isAdvancedPanelRouteEnabled('/es/panel/insignias', flags)
        ).toBe(true)
    })
})
