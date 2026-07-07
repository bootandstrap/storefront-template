import { describe, expect, it } from 'vitest'

import contract from '../governance-contract'
import {
    BNS_360_MODULE_CERTIFICATION_MATRIX,
    BNS_360_REQUIRED_MODULE_KEYS,
    BNS_360_RUNTIME_MATRIX,
} from '../../../e2e/bns-360.matrix'
import {
    assertBns360FunctionalEvidenceVerified,
    buildBns360ScenarioEvidence,
    getBns360AutomatedFunctionalEvidenceStatus,
    getBns360ExecutionMode,
    resolveBns360ApiHeaders,
} from '../../../e2e/support/bns-360-fixtures'
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

    it('includes authenticated governance health in deployed runtime health', () => {
        const healthScenario = BNS_360_RUNTIME_MATRIX.find(
            scenario => scenario.key === 'ops.health_readiness_liveness'
        )

        expect(healthScenario?.routes).toEqual(expect.arrayContaining([
            '/api/health',
            '/api/health/ready',
            '/api/health/live',
            '/api/v1/governance/health',
        ]))
        expect(healthScenario?.apiHeadersEnv).toEqual({
            'x-health-token': 'BNS_360_HEALTH_CHECK_TOKEN',
        })
        expect(resolveBns360ApiHeaders(healthScenario, {
            BNS_360_HEALTH_CHECK_TOKEN: 'do-not-store',
        })).toEqual({
            'x-health-token': 'do-not-store',
        })
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

    it('requires every module to declare non-route functional evidence targets', () => {
        for (const scenario of BNS_360_MODULE_CERTIFICATION_MATRIX) {
            expect(
                scenario.functionalEvidence,
                `${scenario.moduleKey} needs deployed functional evidence beyond route smoke`
            ).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    kind: expect.not.stringMatching(/^route_smoke$/),
                }),
            ]))
        }
    })

    it('covers the functional certification categories required for a deployed template', () => {
        const evidenceKinds = new Set(
            BNS_360_MODULE_CERTIFICATION_MATRIX.flatMap(scenario =>
                scenario.functionalEvidence.map(item => item.kind)
            )
        )

        expect([...evidenceKinds].sort()).toEqual(expect.arrayContaining([
            'api_health',
            'crud_journey',
            'grant_unlock',
            'limit_enforcement',
            'module_primary_journey',
            'runtime_config',
        ]))
    })

    it('requires api_health functional evidence to name concrete API routes', () => {
        const apiHealthTargets = BNS_360_MODULE_CERTIFICATION_MATRIX.flatMap(scenario =>
            scenario.functionalEvidence.filter(item => item.kind === 'api_health')
        )

        expect(apiHealthTargets.length).toBeGreaterThan(0)
        for (const target of apiHealthTargets) {
            expect(target.routes).toEqual(expect.arrayContaining([
                expect.stringMatching(/^\/api\//),
            ]))
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

    it('builds structured evidence envelopes without embedding credentials', () => {
        const scenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            item => item.moduleKey === 'ecommerce'
        )

        expect(scenario).toBeDefined()
        const evidence = buildBns360ScenarioEvidence({
            scenarioKey: 'module.ecommerce',
            baseUrl: 'https://template-canary.bootandstrap.com',
            routes: scenario?.runtimeRoutes ?? [],
            functionalEvidence: scenario?.functionalEvidence ?? [],
            ownerEmail: 'owner+canary@example.com',
            ownerPassword: 'do-not-store',
            status: 'verified',
        })

        expect(evidence).toMatchObject({
            schema: 'bootandstrap.template.bns-360.scenario-evidence/v1',
            scenarioKey: 'module.ecommerce',
            baseUrl: 'https://template-canary.bootandstrap.com',
            status: 'verified',
            routeStatus: 'verified',
            functionalStatus: 'not_run',
            executionMode: 'smoke',
            credentialState: 'provided_redacted',
        })
        expect(JSON.stringify(evidence)).not.toContain('do-not-store')
        expect(evidence.functionalEvidence.map(item => item.kind)).toEqual(
            expect.arrayContaining(['crud_journey', 'module_primary_journey'])
        )
    })

    it('does not mark functional evidence verified unless the functional runner says so', () => {
        const scenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            item => item.moduleKey === 'crm'
        )

        const defaultFunctionalEvidence = buildBns360ScenarioEvidence({
            scenarioKey: 'module.crm',
            baseUrl: 'https://template-canary.bootandstrap.com',
            routes: scenario?.runtimeRoutes ?? [],
            functionalEvidence: scenario?.functionalEvidence ?? [],
            status: 'verified',
            executionMode: 'functional',
        })

        const verifiedFunctionalEvidence = buildBns360ScenarioEvidence({
            scenarioKey: 'module.crm',
            baseUrl: 'https://template-canary.bootandstrap.com',
            routes: scenario?.runtimeRoutes ?? [],
            functionalEvidence: scenario?.functionalEvidence ?? [],
            status: 'verified',
            executionMode: 'functional',
            functionalStatus: 'verified',
        })

        expect(defaultFunctionalEvidence).toMatchObject({
            routeStatus: 'verified',
            functionalStatus: 'manual_required',
        })
        expect(verifiedFunctionalEvidence).toMatchObject({
            routeStatus: 'verified',
            functionalStatus: 'verified',
        })
    })

    it('refuses declared-only functional evidence in functional execution mode', () => {
        const scenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            item => item.moduleKey === 'crm'
        )
        const evidence = buildBns360ScenarioEvidence({
            scenarioKey: 'module.crm',
            baseUrl: 'https://template-canary.bootandstrap.com',
            routes: scenario?.runtimeRoutes ?? [],
            functionalEvidence: scenario?.functionalEvidence ?? [],
            status: 'verified',
            executionMode: 'functional',
        })

        expect(() => assertBns360FunctionalEvidenceVerified(evidence)).toThrow(
            'Functional evidence for module.crm is manual_required'
        )
    })

    it('only reports automated functional status when every target has a runner', () => {
        expect(getBns360AutomatedFunctionalEvidenceStatus([])).toBe('not_required')
        expect(getBns360AutomatedFunctionalEvidenceStatus([
            { kind: 'api_health', target: 'health', reversible: true, routes: ['/api/health'] },
        ])).toBe('verified')
        expect(getBns360AutomatedFunctionalEvidenceStatus([
            { kind: 'api_health', target: 'health', reversible: true, routes: ['/api/health'] },
            { kind: 'crud_journey', target: 'crm contact CRUD', reversible: true },
        ])).toBe('manual_required')
    })

    it('keeps mutating functional journeys opt-in', () => {
        expect(getBns360ExecutionMode({ BNS_360_FUNCTIONAL_JOURNEYS: undefined })).toBe('smoke')
        expect(getBns360ExecutionMode({ BNS_360_FUNCTIONAL_JOURNEYS: '0' })).toBe('smoke')
        expect(getBns360ExecutionMode({ BNS_360_FUNCTIONAL_JOURNEYS: '1' })).toBe('functional')
    })
})
