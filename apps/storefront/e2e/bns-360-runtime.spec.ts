import { test } from '@playwright/test'

import { BNS_360_RUNTIME_MATRIX } from './bns-360.matrix'
import {
    BNS_360_CUSTOMER_EMAIL,
    BNS_360_CUSTOMER_PASSWORD,
    BNS_360_OWNER_EMAIL,
    BNS_360_OWNER_PASSWORD,
    assertBns360ExpectedRuntimeCommit,
    assertBns360FunctionalEvidenceVerified,
    buildBns360ScenarioEvidence,
    expectApiHealthy,
    expectPanelRouteHealthy,
    getBns360ExecutionMode,
    getBns360FunctionalEvidenceForRun,
    getBns360MissingCredentialAction,
    hasCustomerCredentials,
    hasOwnerCredentials,
    loginAsCustomer,
    loginAsOwner,
    recordBns360ScenarioEvidenceArtifact,
    resolveBns360DeployedBuild,
    resolveBns360OwnerApiHeaders,
    resolveBns360ApiHeaders,
    runBns360AutomatedFunctionalEvidence,
} from './support/bns-360-fixtures'
import { BNS_360_MODULE_CERTIFICATION_MATRIX } from './support/bns-360-tenant-profiles'

const moduleScenarioByKey = new Map(
    BNS_360_MODULE_CERTIFICATION_MATRIX.map(scenario => [`module.${scenario.moduleKey}`, scenario])
)

test.describe.configure({ mode: 'serial' })

for (const scenario of BNS_360_RUNTIME_MATRIX) {
    test.describe(`BNS 360 runtime: ${scenario.key}`, () => {
        test(`${scenario.key} smoke`, async ({ page, request }, testInfo) => {
            const moduleScenario = moduleScenarioByKey.get(scenario.key)
            const executionMode = getBns360ExecutionMode()
            const authRole = scenario.authRole ?? (scenario.requiresAuth ? 'owner' : undefined)
            const credentialAction = getBns360MissingCredentialAction({
                requiresAuth: scenario.requiresAuth,
                hasCredentials: authRole === 'customer' ? hasCustomerCredentials() : hasOwnerCredentials(),
                executionMode,
                authRole,
            })
            if (credentialAction.action === 'skip') {
                test.skip(true, credentialAction.reason)
            }
            if (credentialAction.action === 'fail') {
                throw new Error(credentialAction.reason)
            }

            const functionalEvidence = getBns360FunctionalEvidenceForRun(
                scenario.functionalEvidence ?? moduleScenario?.functionalEvidence ?? []
            )
            const baseApiHeaders = resolveBns360ApiHeaders(scenario)

            if (scenario.requiresAuth) {
                if (scenario.authRole === 'customer') {
                    await loginAsCustomer(page)
                } else {
                    await loginAsOwner(page)
                }
            }

            const functionalEvidenceHeaders = scenario.requiresAuth
                ? await resolveBns360OwnerApiHeaders(page, baseApiHeaders)
                : baseApiHeaders

            if (scenario.transport === 'api') {
                const headers = scenario.requiresAuth
                    ? await resolveBns360OwnerApiHeaders(page, baseApiHeaders)
                    : baseApiHeaders
                const apiRequest = scenario.requiresAuth ? page.request : request
                for (const route of scenario.routes) {
                    await expectApiHealthy(apiRequest, route, headers)
                }
            } else {
                for (const route of scenario.routes) {
                    await expectPanelRouteHealthy(page, route)
                }
            }

            const functionalStatus = executionMode === 'functional'
                ? await runBns360AutomatedFunctionalEvidence(
                    scenario.requiresAuth ? page.request : request,
                    functionalEvidence,
                    functionalEvidenceHeaders,
                    page
                )
                : undefined
            const deployedBuild = await resolveBns360DeployedBuild(request, baseApiHeaders)
            assertBns360ExpectedRuntimeCommit(deployedBuild)

            const credentialEmail = scenario.requiresAuth
                ? authRole === 'customer' ? BNS_360_CUSTOMER_EMAIL : BNS_360_OWNER_EMAIL
                : null
            const credentialPassword = scenario.requiresAuth
                ? authRole === 'customer' ? BNS_360_CUSTOMER_PASSWORD : BNS_360_OWNER_PASSWORD
                : null
            const evidence = buildBns360ScenarioEvidence({
                scenarioKey: scenario.key,
                baseUrl: testInfo.project.use.baseURL ?? '',
                routes: scenario.routes,
                functionalEvidence,
                ownerEmail: credentialEmail,
                ownerPassword: credentialPassword,
                status: 'verified',
                executionMode,
                functionalStatus,
            })
            await testInfo.attach('bns-360-scenario-evidence', {
                body: JSON.stringify(evidence, null, 2),
                contentType: 'application/json',
            })
            recordBns360ScenarioEvidenceArtifact({
                artifactPath: process.env.BNS_360_EVIDENCE_PATH,
                evidence,
                templateCommit: process.env.BNS_360_TEMPLATE_COMMIT,
                tenantRef: process.env.BNS_360_TENANT_REF,
                cleanupStatus: process.env.BNS_360_CLEANUP_STATUS,
                deployedBuild,
                routeChecks: scenario.routes.map(path => ({
                    path,
                    status: 'verified',
                })),
            })

            assertBns360FunctionalEvidenceVerified(evidence)
        })
    })
}
