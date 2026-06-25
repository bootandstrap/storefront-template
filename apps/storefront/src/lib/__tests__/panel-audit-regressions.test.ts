import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..', '..')
const DICT_DIR = join(ROOT, 'lib', 'i18n', 'dictionaries')

function read(relPath: string): string {
    return readFileSync(join(ROOT, relPath), 'utf-8')
}

function loadDict(locale: string): Record<string, unknown> {
    return JSON.parse(readFileSync(join(DICT_DIR, `${locale}.json`), 'utf-8'))
}

const REQUIRED_PANEL_KEYS = [
    'panel.dashboard.viewStorefront',
    'panel.chart.last30',
    'panel.chart.noData',
    'panel.governance.modules',
    'panel.governance.limitAlerts',
    'panel.governance.allClear',
    'panel.governance.trial',
    'panel.governance.active',
    'panel.tabs.promotions',
]

describe('panel/storefront audit regressions', () => {
    it('keeps the required owner-panel i18n keys in every shipped locale', () => {
        for (const locale of ['en', 'es', 'de', 'fr', 'it']) {
            const dict = loadDict(locale)
            for (const key of REQUIRED_PANEL_KEYS) {
                expect(dict[key], `${locale}.json is missing ${key}`).toBeTruthy()
            }
        }
    })

    it('does not hardcode the channel filter label in orders', () => {
        const ordersClient = read('app/[lang]/(panel)/panel/pedidos/OrdersClient.tsx')
        expect(ordersClient).not.toContain("label: 'All'")
        expect(ordersClient).toContain('labels.all')
    })

    it('falls back to a stable order id suffix when display_id is missing', () => {
        const ordersClient = read('app/[lang]/(panel)/panel/pedidos/OrdersClient.tsx')
        expect(ordersClient).toContain('function getOrderDisplayLabel')
        expect(ordersClient).toContain('return displayId || order.id.slice(-6)')
    })

    it('gates public WhatsApp contact links on a real configured number', () => {
        const header = read('components/layout/Header.tsx')
        expect(header).toContain('featureFlags.enable_whatsapp_contact && config.whatsapp_number')
    })

    it('computes sidebar readiness independently of onboarding completion', () => {
        const layout = read('app/[lang]/(panel)/layout.tsx')
        const readinessIdx = layout.indexOf('readiness = await calculateStoreReadiness(tenantId, lang)')
        const onboardingGateIdx = layout.indexOf('if (config.onboarding_completed && readiness)')

        expect(readinessIdx).toBeGreaterThan(-1)
        expect(onboardingGateIdx).toBeGreaterThan(-1)
        expect(readinessIdx).toBeLessThan(onboardingGateIdx)
    })

    it('localizes the sidebar health label instead of hardcoding English text', () => {
        const sidebar = read('components/panel/PanelSidebar.tsx')
        expect(sidebar).toContain('{labels.health}')
        expect(sidebar).not.toContain('>Health<')
    })
})
