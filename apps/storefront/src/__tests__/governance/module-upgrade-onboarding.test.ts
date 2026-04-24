// ═══════════════════════════════════════════════════════════════════════════
// Suite 3: Upgrade & Mini-Onboarding Data
// ═══════════════════════════════════════════════════════════════════════════
// Validates that module activation produces correct data for the onboarding
// UX components (ModuleSetupOrchestrator, CelebrationToast, ModuleSetupCard).
// Tests the data contracts these components consume.

import { describe, it, expect } from 'vitest'
import {
    FEATURE_GATE_MAP,
    getFeatureGateEntry,
    getFlagsByModule,
    getGatedModuleKeys,
    getModuleInfoUrl,
    BSWEB_BASE_URL,
} from '@/lib/feature-gate-config'
import {
    getModuleTabs,
    getPanelSectionSubItems,
    type PanelFeatureFlags,
} from '@/lib/panel-policy'
import {
    deriveActiveModulesFromFlags,
    getActiveModuleKeys,
} from '@/lib/governance/derive-modules'
import { FLAG_MODULE_MAP } from '@/lib/governance/flag-module-map'

// ── Test Helpers ─────────────────────────────────────────────────────────

const EMPTY_FLAGS: PanelFeatureFlags = {
    enable_chatbot: false,
    enable_crm: false,
    enable_pos: false,
    enable_seo: false,
    enable_social_media: false,
    enable_automations: false,
    enable_auth_advanced: false,
    enable_sales_channels: false,
    enable_traffic_expansion: false,
    enable_whatsapp_checkout: false,
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Suite 3: Upgrade & Mini-Onboarding Data', () => {

    describe('New Module Detection', () => {
        it('chatbot activation: enable_chatbot false→true adds chatbot to active modules', () => {
            const before = deriveActiveModulesFromFlags({ enable_chatbot: false })
            const after = deriveActiveModulesFromFlags({ enable_chatbot: true })

            expect(before.has('chatbot')).toBe(false)
            expect(after.has('chatbot')).toBe(true)
        })

        it('CRM activation: derive shows crm as new', () => {
            const before = getActiveModuleKeys({ enable_crm: false })
            const after = getActiveModuleKeys({ enable_crm: true })

            const newModules = after.filter(m => !before.includes(m))
            expect(newModules).toContain('crm')
        })

        it('multi-module activation: chatbot + CRM + SEO simultaneously', () => {
            const after = deriveActiveModulesFromFlags({
                enable_chatbot: true,
                enable_crm: true,
                enable_seo: true,
                enable_analytics: true,
            })

            expect(after.has('chatbot')).toBe(true)
            expect(after.has('crm')).toBe(true)
            expect(after.has('seo')).toBe(true)
        })
    })

    describe('Tier Upgrade Detection', () => {
        it('CRM basic→pro: new flags become available (segmentation, export)', () => {
            const basicFlags = {
                enable_crm: true,
                enable_crm_contacts: true,
                enable_crm_interactions: true,
            }
            const proFlags = {
                ...basicFlags,
                enable_crm_segmentation: true,
                enable_crm_export: true,
                enable_crm_segments: true,
            }

            const basicModules = deriveActiveModulesFromFlags(basicFlags)
            const proModules = deriveActiveModulesFromFlags(proFlags)

            // Both should have CRM active
            expect(basicModules.has('crm')).toBe(true)
            expect(proModules.has('crm')).toBe(true)

            // Pro has more flags active
            const basicCrmFlags = Object.entries(basicFlags).filter(([, v]) => v)
            const proCrmFlags = Object.entries(proFlags).filter(([, v]) => v)
            expect(proCrmFlags.length).toBeGreaterThan(basicCrmFlags.length)
        })

        it('ecommerce basic→pro: reviews, wishlist, promotions become available', () => {
            const basicFlags = {
                enable_ecommerce: true, enable_carousel: true,
                enable_product_badges: true,
            }
            const proFlags = {
                ...basicFlags,
                enable_reviews: true, enable_wishlist: true,
                enable_cms_pages: true, enable_promotions: true,
            }

            // After upgrade, new feature gate entries exist
            for (const newFlag of ['enable_reviews', 'enable_wishlist', 'enable_cms_pages']) {
                const entry = getFeatureGateEntry(newFlag)
                expect(entry).toBeDefined()
                expect(entry!.moduleKey).toBe('ecommerce')
            }
        })
    })

    describe('Feature Gate Entries Resolution', () => {
        it('every flag in FEATURE_GATE_MAP resolves to valid module info', () => {
            for (const [flag, entry] of Object.entries(FEATURE_GATE_MAP)) {
                expect(entry.moduleKey.length).toBeGreaterThan(0)
                expect(entry.moduleNameKey).toContain('featureGate.modules.')
                expect(entry.icon.length).toBeGreaterThan(0)
                expect(entry.bswSlug.es).toBeDefined()
            }
        })

        it('BSWEB URL generation works for all modules', () => {
            const moduleKeys = getGatedModuleKeys()
            for (const moduleKey of moduleKeys) {
                const url = getModuleInfoUrl(moduleKey, 'es')
                expect(url).toContain(BSWEB_BASE_URL)
                expect(url.length).toBeGreaterThan(BSWEB_BASE_URL.length + 5)
            }
        })

        it('localized URLs work for all 5 languages', () => {
            const langs = ['es', 'en', 'de', 'fr', 'it']
            for (const lang of langs) {
                const url = getModuleInfoUrl('enable_chatbot', lang)
                expect(url).toContain(`/${lang}/`)
            }
        })
    })

    describe('Navigation Expansion on Upgrade', () => {
        it('CRM sub-item appears in modules sidebar when enable_crm=true', () => {
            const subItems = getPanelSectionSubItems('modules', 'es', {
                ...EMPTY_FLAGS,
                enable_crm: true,
            })

            expect(subItems).toBeDefined()
            const crm = subItems!.find(si => si.key === 'crm')
            expect(crm).toBeDefined()
            expect(crm!.label).toBe('CRM')
            expect(crm!.emoji).toBe('👥')
        })

        it('chatbot sub-item has correct emoji and href', () => {
            const subItems = getPanelSectionSubItems('modules', 'es', {
                ...EMPTY_FLAGS,
                enable_chatbot: true,
            })

            const chatbot = subItems!.find(si => si.key === 'chatbot')
            expect(chatbot!.emoji).toBe('🤖')
            expect(chatbot!.href).toBe('/es/panel/chatbot')
        })

        it('module tabs expand when module is activated', () => {
            const before = getModuleTabs(EMPTY_FLAGS)
            const after = getModuleTabs({ ...EMPTY_FLAGS, enable_chatbot: true })

            expect(after.length).toBeGreaterThan(before.length)
            expect(after.find(t => t.key === 'chatbot')).toBeDefined()
        })

        it('activating all modules produces 10 module tabs', () => {
            const allOn: PanelFeatureFlags = {
                enable_chatbot: true,
                enable_crm: true,
                enable_seo: true,
                enable_social_media: true,
                enable_whatsapp_checkout: true,
                enable_automations: true,
                enable_sales_channels: true,
                enable_traffic_expansion: true,
                enable_auth_advanced: true,
            }
            const tabs = getModuleTabs(allOn)
            // 1 marketplace + 9 module tabs
            expect(tabs.length).toBe(10)
        })
    })

    describe('CelebrationToast Data Shape', () => {
        // CelebrationItem shape validation for module activation events

        interface CelebrationItem {
            id: string
            emoji: string
            title: string
            description: string
        }

        it('module activation produces valid CelebrationItem data', () => {
            const moduleKey = 'chatbot'
            const entry = getFeatureGateEntry(`enable_${moduleKey}`)
            expect(entry).toBeDefined()

            // Simulate building a CelebrationItem from module activation
            const item: CelebrationItem = {
                id: `module-activated-${moduleKey}`,
                emoji: entry!.icon,
                title: `¡${moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1)} activado!`,
                description: `Tu módulo ${moduleKey} está listo para configurar`,
            }

            expect(item.id).toBe('module-activated-chatbot')
            expect(item.emoji).toBe('🤖')
            expect(item.title.length).toBeGreaterThan(0)
            expect(item.description.length).toBeGreaterThan(0)
        })

        it('multi-module activation produces unique CelebrationItems', () => {
            const activatedModules = ['chatbot', 'crm', 'pos']
            const items: CelebrationItem[] = activatedModules.map(moduleKey => {
                const entry = getFeatureGateEntry(`enable_${moduleKey}`)
                return {
                    id: `module-activated-${moduleKey}`,
                    emoji: entry?.icon || '📦',
                    title: `¡${moduleKey} activado!`,
                    description: `Configura tu módulo ${moduleKey}`,
                }
            })

            // All IDs must be unique
            const ids = items.map(i => i.id)
            expect(new Set(ids).size).toBe(ids.length)

            // Each has different emoji
            expect(items[0].emoji).not.toBe(items[1].emoji)
        })
    })

    describe('FLAG_MODULE_MAP Completeness', () => {
        it('every module in contract has at least one flag mapping', () => {
            const moduleKeys = getGatedModuleKeys()
            const mappedModules = new Set(Object.values(FLAG_MODULE_MAP))

            for (const key of moduleKeys) {
                expect(mappedModules.has(key)).toBe(true)
            }
        })

        it('FLAG_MODULE_MAP has no duplicate entries', () => {
            const keys = Object.keys(FLAG_MODULE_MAP)
            expect(new Set(keys).size).toBe(keys.length)
        })
    })

    describe('Upgrade Diff Calculation', () => {
        it('can compute added modules between before/after states', () => {
            const beforeFlags: Record<string, boolean> = {
                enable_ecommerce: true,
                enable_carousel: true,
            }
            const afterFlags: Record<string, boolean> = {
                enable_ecommerce: true,
                enable_carousel: true,
                enable_chatbot: true,
                enable_crm: true,
            }

            const before = deriveActiveModulesFromFlags(beforeFlags)
            const after = deriveActiveModulesFromFlags(afterFlags)

            const added = [...after].filter(m => !before.has(m))
            expect(added).toContain('chatbot')
            expect(added).toContain('crm')
            expect(added).not.toContain('ecommerce')
        })

        it('can compute removed modules between before/after states', () => {
            const beforeFlags: Record<string, boolean> = {
                enable_ecommerce: true,
                enable_chatbot: true,
                enable_crm: true,
            }
            const afterFlags: Record<string, boolean> = {
                enable_ecommerce: true,
                enable_chatbot: false,
                enable_crm: false,
            }

            const before = deriveActiveModulesFromFlags(beforeFlags)
            const after = deriveActiveModulesFromFlags(afterFlags)

            const removed = [...before].filter(m => !after.has(m))
            expect(removed).toContain('chatbot')
            expect(removed).toContain('crm')
            expect(removed).not.toContain('ecommerce')
        })
    })
})
