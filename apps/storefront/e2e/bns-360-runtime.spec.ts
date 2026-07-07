import { test } from '@playwright/test'

import { BNS_360_RUNTIME_MATRIX } from './bns-360.matrix'
import {
    expectApiHealthy,
    expectPanelRouteHealthy,
    hasOwnerCredentials,
    loginAsOwner,
} from './support/bns-360-fixtures'

for (const scenario of BNS_360_RUNTIME_MATRIX) {
    test.describe(`BNS 360 runtime: ${scenario.key}`, () => {
        test(`${scenario.key} smoke`, async ({ page, request }) => {
            test.skip(
                scenario.requiresAuth && !hasOwnerCredentials(),
                'Owner credentials are required for authenticated 360 runtime smoke routes'
            )

            if (scenario.requiresAuth) {
                await loginAsOwner(page)
            }

            if (scenario.transport === 'api') {
                for (const route of scenario.routes) {
                    await expectApiHealthy(request, route)
                }
                return
            }

            for (const route of scenario.routes) {
                await expectPanelRouteHealthy(page, route)
            }
        })
    })
}
