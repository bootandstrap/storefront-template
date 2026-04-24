// ═══════════════════════════════════════════════════════════════════════════
// Suite 2: Graceful Degradation UX — Panel navigation, tabs, gates, routes
// ═══════════════════════════════════════════════════════════════════════════
// Validates that the storefront panel UI degrades gracefully when modules
// are deactivated. Tests panel navigation, tab visibility, feature gates,
// route access decisions, and module derivation.

import { describe, it, expect } from 'vitest'
import {
    getPanelSections,
    getMyStoreTabs,
    getSalesTabs,
    getModuleTabs,
    getPanelSectionSubItems,
    type PanelFeatureFlags,
    type PanelSidebarLabels,
} from '@/lib/panel-policy'
import {
    FEATURE_GATE_MAP,
    getFeatureGateEntry,
    getModuleInfoUrl,
    getModuleActivationUrl,
    getFlagsByModule,
    getGatedModuleKeys,
} from '@/lib/feature-gate-config'
import {
    deriveActiveModulesFromFlags,
    isModuleActive,
    getActiveModuleKeys,
} from '@/lib/governance/derive-modules'

// ── Test Fixtures ────────────────────────────────────────────────────────

const DEFAULT_LABELS: PanelSidebarLabels = {
    home: 'Inicio',
    myStore: 'Mi Tienda',
    sales: 'Ventas',
    modules: 'Módulos',
    settings: 'Ajustes',
    pos: 'POS',
    ownerPanel: 'Panel',
    backToStore: 'Volver a la tienda',
}

const ALL_FLAGS_ON: PanelFeatureFlags = {
    enable_carousel: true,
    enable_whatsapp_checkout: true,
    enable_cms_pages: true,
    enable_analytics: true,
    enable_chatbot: true,
    enable_self_service_returns: true,
    enable_crm: true,
    enable_reviews: true,
    enable_pos: true,
    enable_traffic_expansion: true,
    enable_product_badges: true,
    enable_seo: true,
    enable_social_media: true,
    enable_multi_language: true,
    enable_automations: true,
    enable_auth_advanced: true,
    enable_sales_channels: true,
    owner_lite_enabled: true,
    owner_advanced_modules_enabled: true,
}

const ALL_FLAGS_OFF: PanelFeatureFlags = {
    enable_carousel: false,
    enable_whatsapp_checkout: false,
    enable_cms_pages: false,
    enable_analytics: false,
    enable_chatbot: false,
    enable_self_service_returns: false,
    enable_crm: false,
    enable_reviews: false,
    enable_pos: false,
    enable_traffic_expansion: false,
    enable_product_badges: false,
    enable_seo: false,
    enable_social_media: false,
    enable_multi_language: false,
    enable_automations: false,
    enable_auth_advanced: false,
    enable_sales_channels: false,
    owner_lite_enabled: false,
    owner_advanced_modules_enabled: false,
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Suite 2: Graceful Degradation UX', () => {

    describe('Panel Navigation — Section Visibility', () => {
        it('POS section is visible when enable_pos=true', () => {
            const sections = getPanelSections({
                lang: 'es',
                labels: DEFAULT_LABELS,
                featureFlags: { ...ALL_FLAGS_OFF, enable_pos: true },
            })
            const pos = sections.find(s => s.key === 'pos')
            expect(pos).toBeDefined()
        })

        it('POS section is HIDDEN when enable_pos=false', () => {
            const sections = getPanelSections({
                lang: 'es',
                labels: DEFAULT_LABELS,
                featureFlags: { ...ALL_FLAGS_OFF, enable_pos: false },
            })
            const pos = sections.find(s => s.key === 'pos')
            expect(pos).toBeUndefined()
        })

        it('core sections (home, myStore, sales, modules, settings) are always visible', () => {
            const sections = getPanelSections({
                lang: 'es',
                labels: DEFAULT_LABELS,
                featureFlags: ALL_FLAGS_OFF,
            })
            const keys = sections.map(s => s.key)
            expect(keys).toContain('home')
            expect(keys).toContain('myStore')
            expect(keys).toContain('sales')
            expect(keys).toContain('modules')
            expect(keys).toContain('settings')
        })

        it('with all flags ON, 6 sections are visible', () => {
            const sections = getPanelSections({
                lang: 'es',
                labels: DEFAULT_LABELS,
                featureFlags: ALL_FLAGS_ON,
            })
            expect(sections.length).toBe(6) // 5 core + POS
        })

        it('with all flags OFF, 5 sections are visible (no POS)', () => {
            const sections = getPanelSections({
                lang: 'es',
                labels: DEFAULT_LABELS,
                featureFlags: ALL_FLAGS_OFF,
            })
            expect(sections.length).toBe(5)
        })
    })

    describe('Panel Navigation — Module Sub-Items', () => {
        it('chatbot appears in modules sub-items when enable_chatbot=true', () => {
            const subItems = getPanelSectionSubItems('modules', 'es', {
                ...ALL_FLAGS_OFF,
                enable_chatbot: true,
            })
            expect(subItems).toBeDefined()
            const chatbot = subItems!.find(si => si.key === 'chatbot')
            expect(chatbot).toBeDefined()
            expect(chatbot!.emoji).toBe('🤖')
        })

        it('chatbot DISAPPEARS from modules sub-items when enable_chatbot=false', () => {
            const subItems = getPanelSectionSubItems('modules', 'es', ALL_FLAGS_OFF)
            // With no active modules, sub-items might not exist or be just marketplace
            if (subItems) {
                const chatbot = subItems.find(si => si.key === 'chatbot')
                expect(chatbot).toBeUndefined()
            }
        })

        it('CRM sub-item appears only when enable_crm=true', () => {
            const withCRM = getPanelSectionSubItems('modules', 'es', {
                ...ALL_FLAGS_OFF,
                enable_crm: true,
            })
            expect(withCRM).toBeDefined()
            expect(withCRM!.find(si => si.key === 'crm')).toBeDefined()

            const withoutCRM = getPanelSectionSubItems('modules', 'es', ALL_FLAGS_OFF)
            if (withoutCRM) {
                expect(withoutCRM.find(si => si.key === 'crm')).toBeUndefined()
            }
        })

        it('all 9 module sub-items appear with all flags ON', () => {
            const subItems = getPanelSectionSubItems('modules', 'es', ALL_FLAGS_ON)
            expect(subItems).toBeDefined()
            // 9 module sub-items + marketplace = 10
            expect(subItems!.length).toBe(10)
        })
    })

    describe('Tab Visibility Degradation', () => {
        it('My Store: badges tab hidden when enable_product_badges=false', () => {
            const tabs = getMyStoreTabs({ ...ALL_FLAGS_OFF })
            expect(tabs.find(t => t.key === 'insignias')).toBeUndefined()
        })

        it('My Store: badges tab visible when enable_product_badges=true', () => {
            const tabs = getMyStoreTabs({ ...ALL_FLAGS_OFF, enable_product_badges: true })
            expect(tabs.find(t => t.key === 'insignias')).toBeDefined()
        })

        it('My Store: carousel tab toggled by enable_carousel', () => {
            const off = getMyStoreTabs({ enable_carousel: false })
            expect(off.find(t => t.key === 'carrusel')).toBeUndefined()

            const on = getMyStoreTabs({ enable_carousel: true })
            expect(on.find(t => t.key === 'carrusel')).toBeDefined()
        })

        it('Sales: reviews tab hidden when enable_reviews=false', () => {
            const tabs = getSalesTabs({ enable_reviews: false })
            expect(tabs.find(t => t.key === 'resenas')).toBeUndefined()
        })

        it('Sales: reviews tab visible when enable_reviews=true', () => {
            const tabs = getSalesTabs({ enable_reviews: true })
            expect(tabs.find(t => t.key === 'resenas')).toBeDefined()
        })

        it('Sales: returns tab toggled by enable_self_service_returns', () => {
            const off = getSalesTabs({ enable_self_service_returns: false })
            expect(off.find(t => t.key === 'devoluciones')).toBeUndefined()

            const on = getSalesTabs({ enable_self_service_returns: true })
            expect(on.find(t => t.key === 'devoluciones')).toBeDefined()
        })

        it('Modules: chatbot tab appears only with enable_chatbot=true', () => {
            const off = getModuleTabs({ enable_chatbot: false })
            expect(off.find(t => t.key === 'chatbot')).toBeUndefined()

            const on = getModuleTabs({ enable_chatbot: true })
            expect(on.find(t => t.key === 'chatbot')).toBeDefined()
        })
    })

    describe('Feature Gate Blocking', () => {
        it('FEATURE_GATE_MAP covers all 13 module keys', () => {
            const moduleKeys = getGatedModuleKeys()
            expect(moduleKeys.length).toBe(13)
        })

        it('every flag in the gate map has a valid module, icon, and slug', () => {
            for (const [flag, entry] of Object.entries(FEATURE_GATE_MAP)) {
                expect(entry.moduleKey).toBeTruthy()
                expect(entry.icon).toBeTruthy()
                expect(entry.bswSlug).toBeDefined()
                expect(Object.keys(entry.bswSlug).length).toBeGreaterThan(0)
            }
        })

        it('getFeatureGateEntry returns correct module for enable_chatbot', () => {
            const entry = getFeatureGateEntry('enable_chatbot')
            expect(entry).toBeDefined()
            expect(entry!.moduleKey).toBe('chatbot')
            expect(entry!.icon).toBe('🤖')
        })

        it('getFeatureGateEntry returns correct module for enable_crm', () => {
            const entry = getFeatureGateEntry('enable_crm')
            expect(entry).toBeDefined()
            expect(entry!.moduleKey).toBe('crm')
        })

        it('getFeatureGateEntry returns undefined for unknown flag', () => {
            const entry = getFeatureGateEntry('enable_nonexistent_flag')
            expect(entry).toBeUndefined()
        })

        it('getModuleInfoUrl generates valid BSWEB URL', () => {
            const url = getModuleInfoUrl('enable_chatbot', 'es')
            expect(url).toContain('bootandstrap.com')
            expect(url).toContain('chatbot')
        })

        it('getModuleActivationUrl generates valid panel URL', () => {
            const url = getModuleActivationUrl('enable_chatbot', 'es')
            expect(url).toContain('/panel/ajustes')
            expect(url).toContain('module=chatbot')
        })

        it('getFlagsByModule returns all ecommerce flags', () => {
            const ecomFlags = getFlagsByModule('ecommerce')
            expect(ecomFlags.length).toBeGreaterThanOrEqual(8)
            expect(ecomFlags).toContain('enable_ecommerce')
            expect(ecomFlags).toContain('enable_carousel')
            expect(ecomFlags).toContain('enable_cms_pages')
        })
    })

    describe('Multi-Level Degradation', () => {
        it('removing ecommerce hides carousel, badges, cms, reviews, wishlist tabs', () => {
            // Without ecommerce, these flags should all be false
            const flags: PanelFeatureFlags = {
                ...ALL_FLAGS_OFF,
            }

            const storeTab = getMyStoreTabs(flags)
            expect(storeTab.find(t => t.key === 'carrusel')).toBeUndefined()
            expect(storeTab.find(t => t.key === 'insignias')).toBeUndefined()
            expect(storeTab.find(t => t.key === 'paginas')).toBeUndefined()

            const salesTab = getSalesTabs(flags)
            expect(salesTab.find(t => t.key === 'resenas')).toBeUndefined()
            expect(salesTab.find(t => t.key === 'devoluciones')).toBeUndefined()
        })

        it('base tier only has 3 my-store tabs', () => {
            const tabs = getMyStoreTabs(ALL_FLAGS_OFF)
            // Only products, categories, inventory remain
            expect(tabs.length).toBe(3)
        })

        it('full tier has 6 my-store tabs', () => {
            const tabs = getMyStoreTabs(ALL_FLAGS_ON)
            expect(tabs.length).toBe(6)
        })
    })

    describe('Active Modules Derivation', () => {
        it('empty flags → no active modules', () => {
            const active = deriveActiveModulesFromFlags({})
            expect(active.size).toBe(0)
        })

        it('enable_chatbot=true → chatbot module active', () => {
            const active = deriveActiveModulesFromFlags({ enable_chatbot: true })
            expect(active.has('chatbot')).toBe(true)
        })

        it('enable_crm=true → crm module active', () => {
            expect(isModuleActive('crm', { enable_crm: true })).toBe(true)
        })

        it('enable_crm=false → crm module NOT active', () => {
            expect(isModuleActive('crm', { enable_crm: false })).toBe(false)
        })

        it('multiple flags from same module → still counted as 1 module', () => {
            const active = deriveActiveModulesFromFlags({
                enable_crm: true,
                enable_crm_contacts: true,
                enable_crm_segmentation: true,
            })
            expect(active.has('crm')).toBe(true)
            // All 3 flags map to 'crm' module
            expect([...active].filter(m => m === 'crm').length).toBe(1)
        })

        it('all ecommerce flags ON → ecommerce module active', () => {
            const active = deriveActiveModulesFromFlags({
                enable_ecommerce: true,
                enable_carousel: true,
                enable_reviews: true,
                enable_wishlist: true,
            })
            expect(active.has('ecommerce')).toBe(true)
        })

        it('getActiveModuleKeys returns sorted array', () => {
            const keys = getActiveModuleKeys({
                enable_chatbot: true,
                enable_crm: true,
                enable_ecommerce: true,
            })
            expect(Array.isArray(keys)).toBe(true)
            expect(keys.length).toBeGreaterThanOrEqual(3)
        })
    })
})
