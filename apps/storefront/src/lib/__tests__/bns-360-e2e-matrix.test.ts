import { describe, expect, it } from 'vitest'

import contract from '../governance-contract'
import {
    BNS_360_MODULE_CERTIFICATION_MATRIX,
    BNS_360_REQUIRED_MODULE_KEYS,
    BNS_360_RUNTIME_MATRIX,
} from '../../../e2e/bns-360.matrix'
import { BNS_360_TENANT_PROFILES } from '../../../e2e/support/bns-360-tenant-profiles'

describe('BNS 360 reusable runtime matrix', () => {
    it('covers the full module catalog exposed by the reusable contract', () => {
        expect(BNS_360_REQUIRED_MODULE_KEYS).toEqual(
            contract.modules.catalog.map(module => module.key)
        )
    })

    it('declares the critical runtime domains for 360 certification', () => {
        const keys = BNS_360_RUNTIME_MATRIX.map(scenario => scenario.key)

        expect(keys).toEqual(expect.arrayContaining([
            'storefront.home',
            'storefront.catalog_navigation',
            'storefront.checkout_handoff',
            'panel.dashboard',
            'panel.catalog_crud',
            'panel.orders_customers_inventory',
            'panel.settings_and_auth',
            'recovery.backup_download_restore',
            'ops.health_readiness_liveness',
            'commerce.modules_marketplace_and_limits',
            'pos.core_checkout',
            'pos.offline_sync',
            'pos.refunds_and_history',
        ]))
    })

    it('keeps panel route coverage explicit instead of relying on broad smoke labels', () => {
        const panelScenario = BNS_360_RUNTIME_MATRIX.find(
            scenario => scenario.key === 'panel.orders_customers_inventory'
        )

        expect(panelScenario?.routes).toEqual(expect.arrayContaining([
            '/es/panel/pedidos',
            '/es/panel/clientes',
            '/es/panel/inventario',
        ]))
    })

    it('declares module certification journeys for all 13 reusable modules', () => {
        expect(BNS_360_MODULE_CERTIFICATION_MATRIX.map(scenario => scenario.moduleKey)).toEqual(
            contract.modules.catalog.map(module => module.key)
        )

        for (const scenario of BNS_360_MODULE_CERTIFICATION_MATRIX) {
            expect(scenario.requiredEvidence).toEqual([
                'marketplace_visibility',
                'commercial_materialization',
                'core_configuration',
                'telemetry_health',
                'primary_journey',
            ])
            expect(scenario.marketplaceRoute).toBe('/es/panel/modulos')
            expect(scenario.runtimeRoutes.length).toBeGreaterThan(0)
            expect(scenario.configurationRoute).toBe(`/es/panel/modulos/${scenario.moduleKey}`)
        }
    })

    it('pins a full-catalog certification tenant to the highest available tier of every module', () => {
        const fullCatalog = BNS_360_TENANT_PROFILES.find(
            profile => profile.key === 'full_catalog_highest_tier'
        )

        expect(fullCatalog?.modules.map(module => module.key)).toEqual(
            contract.modules.catalog.map(module => module.key)
        )
        expect(fullCatalog?.modules.map(module => module.tier)).toEqual(
            contract.modules.catalog.map(module => module.tiers[module.tiers.length - 1].key)
        )
    })
})
