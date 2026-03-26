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
        enable_product_badges: true,
    }
}

function baseLabels() {
    return {
        dashboard: 'Dashboard',
        catalog: 'Catalog',
        orders: 'Orders',
        customers: 'Customers',
        utilities: 'Utilities',
        storeConfig: 'Store',
        shipping: 'Shipping',
        myProject: 'My Project',
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
        pos: 'POS',
        capacidad: 'Capacity',
        ownerPanel: 'Owner Panel',
        backToStore: 'Back',
        groupOperations: 'Operations',
        groupContent: 'Content',
        groupSettings: 'Settings',
    }
}

describe('panel-modules', () => {
    it('shows advanced modules by default (no flags set)', () => {
        const nav = getPanelNavigation({
            lang: 'es',
            labels: baseLabels(),
            featureFlags: baseFlags(),
        })

        expect(nav.essentialItems).toHaveLength(9)
        expect(nav.essentialItems.map(item => item.key)).toContain('myProject')
        expect(nav.moduleItems.length).toBeGreaterThan(0)
    })

    it('hides advanced modules in owner lite mode', () => {
        const nav = getPanelNavigation({
            lang: 'es',
            labels: baseLabels(),
            featureFlags: liteFlags(),
        })

        expect(nav.essentialItems).toHaveLength(9)
        expect(nav.essentialItems.map(item => item.key)).toContain('myProject')
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

    it('excludes badges when enable_product_badges is off', () => {
        const flags = fullFlags()
        flags.enable_analytics = false
        flags.enable_product_badges = false

        const nav = getPanelNavigation({
            lang: 'es',
            labels: baseLabels(),
            featureFlags: flags,
        })

        expect(nav.moduleItems.map(item => item.key)).not.toContain('badges')
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

    it('blocks insignias when enable_product_badges is off', () => {
        const flags = fullFlags()
        flags.enable_product_badges = false

        expect(
            isAdvancedPanelRouteEnabled('/es/panel/insignias', flags)
        ).toBe(false)
    })
})
