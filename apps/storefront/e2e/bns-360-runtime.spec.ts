import { test } from '@playwright/test'

import { BNS_360_RUNTIME_MATRIX } from './bns-360.matrix'
import {
    BNS_360_OWNER_EMAIL,
    BNS_360_OWNER_PASSWORD,
    assertBns360FunctionalEvidenceVerified,
    buildBns360ScenarioEvidence,
    expectApiHealthy,
    expectPanelRouteHealthy,
    getBns360ExecutionMode,
    hasOwnerCredentials,
    loginAsOwner,
    runBns360AutomatedFunctionalEvidence,
} from './support/bns-360-fixtures'
import { BNS_360_MODULE_CERTIFICATION_MATRIX } from './support/bns-360-tenant-profiles'

const moduleScenarioByKey = new Map(
    BNS_360_MODULE_CERTIFICATION_MATRIX.map(scenario => [`module.${scenario.moduleKey}`, scenario])
)

for (const scenario of BNS_360_RUNTIME_MATRIX) {
    test.describe(`BNS 360 runtime: ${scenario.key}`, () => {
        test(`${scenario.key} smoke`, async ({ page, request }, testInfo) => {
            test.skip(
                scenario.requiresAuth && !hasOwnerCredentials(),
                'Owner credentials are required for authenticated 360 runtime smoke routes'
            )

            const moduleScenario = moduleScenarioByKey.get(scenario.key)
            const executionMode = getBns360ExecutionMode()
            const functionalEvidence = moduleScenario?.functionalEvidence ?? []

            if (scenario.requiresAuth) {
                await loginAsOwner(page)
            }

            if (scenario.transport === 'api') {
                for (const route of scenario.routes) {
                    await expectApiHealthy(request, route)
                }
            } else {
                for (const route of scenario.routes) {
                    await expectPanelRouteHealthy(page, route)
                }
            }

            const functionalStatus = executionMode === 'functional'
                ? await runBns360AutomatedFunctionalEvidence(request, functionalEvidence)
                : undefined

            const evidence = buildBns360ScenarioEvidence({
                scenarioKey: scenario.key,
                baseUrl: testInfo.project.use.baseURL ?? '',
                routes: scenario.routes,
                functionalEvidence,
                ownerEmail: scenario.requiresAuth ? BNS_360_OWNER_EMAIL : null,
                ownerPassword: scenario.requiresAuth ? BNS_360_OWNER_PASSWORD : null,
                status: 'verified',
                executionMode,
                functionalStatus,
            })
            await testInfo.attach('bns-360-scenario-evidence', {
                body: JSON.stringify(evidence, null, 2),
                contentType: 'application/json',
            })

            assertBns360FunctionalEvidenceVerified(evidence)
        })
    })
}
