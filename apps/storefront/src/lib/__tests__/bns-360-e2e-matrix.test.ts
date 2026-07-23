import { describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import contract from '../governance-contract'
import {
    BNS_360_MODULE_CERTIFICATION_MATRIX,
    BNS_360_REQUIRED_MODULE_KEYS,
    BNS_360_RUNTIME_MATRIX,
} from '../../../e2e/bns-360.matrix'
import {
    assertBns360FunctionalEvidenceVerified,
    BNS_360_ROUTE_GOTO_OPTIONS,
    buildBns360ScenarioEvidence,
    bns360JsonHasPath,
    summarizeBns360JsonShape,
    bns360JsonValueMatches,
    formatBns360ApiHealthFailure,
    getBns360AutomatedFunctionalEvidenceStatus,
    getBns360ExecutionMode,
    getBns360FunctionalEvidenceForRun,
    getBns360MissingCredentialAction,
    getBns360PanelLandingUrlPattern,
    getBns360RouteRetryConfig,
    isBns360CustomerOwnerPanelBoundaryStatus,
    isBns360RetriablePanelStatus,
    recordBns360ScenarioEvidenceArtifact,
    serializeBns360CookieHeader,
    resolveBns360ApiHeaders,
    resolveBns360RetryAfterMs,
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
            'panel.owner_operations',
            'customer.account_operations',
            'panel.dashboard',
            'panel.catalog_crud',
            'panel.orders_customers_inventory',
            'panel.settings_and_auth',
            'recovery.backup_download_restore',
            'ops.health_readiness_liveness',
            'governance.central_policy_read',
            'commerce.modules_marketplace_and_limits',
            'pos.core_checkout',
            'pos.offline_sync',
            'pos.refunds_and_history',
        ]))
    })

    it('declares automated owner and customer panel operation probes with distinct auth roles', () => {
        const ownerScenario = BNS_360_RUNTIME_MATRIX.find(
            scenario => scenario.key === 'panel.owner_operations'
        )
        const customerScenario = BNS_360_RUNTIME_MATRIX.find(
            scenario => scenario.key === 'customer.account_operations'
        )
        const fixtures = readFileSync(
            join(process.cwd(), 'e2e/support/bns-360-fixtures.ts'),
            'utf8'
        )
        const runtimeSpec = readFileSync(
            join(process.cwd(), 'e2e/bns-360-runtime.spec.ts'),
            'utf8'
        )

        expect(ownerScenario).toMatchObject({
            domain: 'panel',
            authRole: 'owner',
            requiresAuth: true,
            functionalEvidence: [
                expect.objectContaining({
                    kind: 'owner_panel_operations_journey',
                    routes: [
                        '/es/panel',
                        '/es/panel/ajustes',
                        '/es/panel/modulos',
                        '/es/panel/mi-tienda?tab=productos',
                        '/es/panel/mi-tienda?tab=inventario',
                    ],
                }),
            ],
        })
        expect(customerScenario).toMatchObject({
            domain: 'customer',
            authRole: 'customer',
            requiresAuth: true,
            routes: ['/es/cuenta', '/es/cuenta/direcciones', '/es/cuenta/pedidos'],
            functionalEvidence: [
                expect.objectContaining({
                    kind: 'customer_panel_operations_journey',
                    gate: 'customer_auth',
                }),
            ],
        })
        expect(fixtures).toContain('BNS_360_CUSTOMER_EMAIL')
        expect(fixtures).toContain('loginAsCustomer')
        expect(fixtures).toContain('expectBns360OwnerProductCatalogUsable')
        expect(fixtures).toContain('expectBns360OwnerInventoryUsable')
        expect(fixtures).toContain('panel-product-card')
        expect(fixtures).toContain('panel-inventory-row')
        expect(runtimeSpec).toContain("scenario.authRole === 'customer'")
    })

    it('includes authenticated governance health in deployed runtime health', () => {
        const healthScenario = BNS_360_RUNTIME_MATRIX.find(
            scenario => scenario.key === 'ops.health_readiness_liveness'
        )
        const runtimeSpec = readFileSync(
            join(process.cwd(), 'e2e/bns-360-runtime.spec.ts'),
            'utf8'
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
        expect(healthScenario?.functionalEvidence).toEqual([
            expect.objectContaining({
                kind: 'api_health',
                gate: 'none',
                routes: [
                    '/api/health',
                    '/api/health/ready',
                    '/api/health/live',
                    '/api/v1/governance/health',
                ],
                expectedJsonPaths: [
                    'status',
                ],
            }),
        ])
        expect(getBns360AutomatedFunctionalEvidenceStatus(healthScenario?.functionalEvidence ?? []))
            .toBe('verified')
        expect(runtimeSpec).toContain('const baseApiHeaders = resolveBns360ApiHeaders(scenario)')
        expect(runtimeSpec).toContain('resolveBns360OwnerApiHeaders(page, baseApiHeaders)')
    })

    it('uses browser request context for authenticated API runtime checks', () => {
        const runtimeSpec = readFileSync(
            join(process.cwd(), 'e2e/bns-360-runtime.spec.ts'),
            'utf8'
        )

        expect(runtimeSpec).toContain('scenario.requiresAuth ? page.request : request')
        expect(runtimeSpec).toContain('expectApiHealthy(apiRequest, route, headers)')
    })

    it('passes owner session cookies into authenticated functional API evidence', () => {
        const runtimeSpec = readFileSync(
            join(process.cwd(), 'e2e/bns-360-runtime.spec.ts'),
            'utf8'
        )

        expect(serializeBns360CookieHeader([
            { name: 'sb-project-auth-token', value: 'base64-session' },
            { name: 'plain', value: 'needs space' },
        ])).toBe('sb-project-auth-token=base64-session; plain=needs%20space')
        expect(runtimeSpec).toContain('resolveBns360OwnerApiHeaders(page, baseApiHeaders)')
        expect(runtimeSpec).toContain('functionalEvidenceHeaders')
        expect(runtimeSpec).toContain('runBns360AutomatedFunctionalEvidence(')
    })

    it('records scenario evidence into an optional aggregate artifact during Playwright runs', () => {
        const runtimeSpec = readFileSync(
            join(process.cwd(), 'e2e/bns-360-runtime.spec.ts'),
            'utf8'
        )

        expect(runtimeSpec).toContain('recordBns360ScenarioEvidenceArtifact({')
        expect(runtimeSpec).toContain('artifactPath: process.env.BNS_360_EVIDENCE_PATH')
        expect(runtimeSpec).toContain('templateCommit: process.env.BNS_360_TEMPLATE_COMMIT')
        expect(runtimeSpec).toContain('tenantRef: process.env.BNS_360_TENANT_REF')
    })

    it('exposes an automated-only functional certification command for gated full-system runs', () => {
        const packageJson = JSON.parse(readFileSync(
            join(process.cwd(), 'package.json'),
            'utf8'
        )) as { scripts: Record<string, string> }
        const rootPackageJson = JSON.parse(readFileSync(
            join(process.cwd(), '..', '..', 'package.json'),
            'utf8'
        )) as { scripts: Record<string, string> }

        expect(packageJson.scripts['cert:360:functional:auto']).toBe(
            'BNS_360_FUNCTIONAL_JOURNEYS=1 BNS_360_FUNCTIONAL_AUTOMATED_ONLY=1 playwright test e2e/bns-360-runtime.spec.ts'
        )
        expect(rootPackageJson.scripts['bns:360:functional:canary']).toBe(
            'pnpm --dir apps/storefront cert:360:functional:auto'
        )
    })

    it('applies the functional evidence focus filter before executing automated Playwright targets', () => {
        const runtimeSpec = readFileSync(
            join(process.cwd(), 'e2e/bns-360-runtime.spec.ts'),
            'utf8'
        )

        expect(runtimeSpec).toContain('getBns360FunctionalEvidenceForRun')
        expect(runtimeSpec).toContain('const functionalEvidence = getBns360FunctionalEvidenceForRun(')
    })

    it('serializes live runtime smoke to avoid self-inflicted owner auth throttling', () => {
        const runtimeSpec = readFileSync(
            join(process.cwd(), 'e2e/bns-360-runtime.spec.ts'),
            'utf8'
        )

        expect(runtimeSpec).toContain("test.describe.configure({ mode: 'serial' })")
    })

    it('reuses the owner auth state during serial live smoke instead of logging in for every scenario', () => {
        const fixtures = readFileSync(
            join(process.cwd(), 'e2e/support/bns-360-fixtures.ts'),
            'utf8'
        )

        expect(fixtures).toContain('let bns360OwnerStorageState')
        expect(fixtures).toContain('applyBns360OwnerStorageState')
        expect(fixtures).toContain('bns360OwnerStorageState = await page.context().storageState()')
    })

    it('exposes a real panel main-content landmark for smoke and skip-link checks', () => {
        const panelShell = readFileSync(
            join(process.cwd(), 'src/components/panel/PanelShell.tsx'),
            'utf8'
        )

        expect(panelShell).toContain('<main')
        expect(panelShell).toContain('id="main-content"')
        expect(panelShell).toContain('tabIndex={-1}')
    })

    it('keeps the desktop sidebar hidden on mobile instead of overriding Tailwind with inline display', () => {
        const panelSidebar = readFileSync(
            join(process.cwd(), 'src/components/panel/PanelSidebar.tsx'),
            'utf8'
        )

        expect(panelSidebar).toContain('className="hidden md:flex flex-col"')
        expect(panelSidebar).not.toMatch(/className="hidden md:flex"[\s\S]{0,800}display:\s*'flex'/)
    })

    it('accepts nested customer account main landmarks during runtime smoke', () => {
        const fixtures = readFileSync(
            join(process.cwd(), 'e2e/support/bns-360-fixtures.ts'),
            'utf8'
        )

        expect(fixtures).toContain("page.locator('main').first()")
    })

    it('Medusa entrypoint repairs admin bootstrap after the HTTP server starts', () => {
        const medusaEntrypoint = readFileSync(
            join(process.cwd(), '..', 'medusa/docker-entrypoint.sh'),
            'utf8'
        )

        expect(medusaEntrypoint).toContain('ensure_admin_user')
        expect(medusaEntrypoint).toContain('npx medusa user -e "$MEDUSA_ADMIN_EMAIL" -p "$MEDUSA_ADMIN_PASSWORD"')
        expect(medusaEntrypoint).toContain('npx medusa start &')
        expect(medusaEntrypoint).toContain('wait "$MEDUSA_PID"')
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

    it('accepts the panel index as a successful owner login landing page', () => {
        const panelLanding = getBns360PanelLandingUrlPattern('es')

        expect(panelLanding.test('https://ops-fullcat.example.com/es/panel')).toBe(true)
        expect(panelLanding.test('https://ops-fullcat.example.com/es/panel/catalogo')).toBe(true)
        expect(panelLanding.test('https://ops-fullcat.example.com/es/login')).toBe(false)
    })

    it('includes route and status in API health failure diagnostics', () => {
        expect(formatBns360ApiHealthFailure('/api/health/ready', 503, 'redis unavailable'))
            .toContain('/api/health/ready returned HTTP 503: redis unavailable')
    })

    it('respects Retry-After when live panel smoke hits proxy rate limiting', () => {
        const fixtures = readFileSync(
            join(process.cwd(), 'e2e/support/bns-360-fixtures.ts'),
            'utf8'
        )
        const retryConfig = getBns360RouteRetryConfig({
            BNS_360_ROUTE_RETRY_MAX_ATTEMPTS: '4',
            BNS_360_ROUTE_RETRY_FALLBACK_MS: '750',
            BNS_360_ROUTE_RETRY_MAX_DELAY_MS: '2000',
            BNS_360_ROUTE_RETRY_MAX_TOTAL_WAIT_MS: '5000',
        })

        expect(retryConfig).toEqual({
            maxAttempts: 4,
            fallbackDelayMs: 750,
            maxDelayMs: 2000,
            maxTotalWaitMs: 5000,
        })
        expect(resolveBns360RetryAfterMs('1', retryConfig)).toBe(1000)
        expect(resolveBns360RetryAfterMs('60', retryConfig)).toBe(2000)
        expect(resolveBns360RetryAfterMs(null, retryConfig)).toBe(750)
        expect(isBns360RetriablePanelStatus(429)).toBe(true)
        expect(isBns360RetriablePanelStatus(502)).toBe(true)
        expect(isBns360RetriablePanelStatus(503)).toBe(true)
        expect(isBns360RetriablePanelStatus(504)).toBe(true)
        expect(isBns360RetriablePanelStatus(404)).toBe(false)
        expect(fixtures).toContain('resolveBns360RetryAfterMs(response?.headers()[\'retry-after\'], config)')
        expect(fixtures).toContain('config.maxTotalWaitMs - totalWaitMs')
        expect(fixtures).toContain('page.waitForTimeout(boundedWaitMs)')
        expect(fixtures).toContain('gotoBns360AuthRoute(page, `/${BNS_360_LANG}/login`)')
        expect(fixtures).toContain('await expect(page.locator(\'input[type="email"]\')).toBeVisible')
        expect(fixtures).toContain('isBns360RetriablePanelStatus(response?.status())')
        expect(fixtures).toContain('formatBns360ApiHealthFailure(route, response.status(), body)')
    })

    it('allows live BNS 360 certifications to raise Playwright timeouts without changing code', () => {
        const config = readFileSync(
            join(process.cwd(), 'playwright.config.ts'),
            'utf8'
        )

        expect(config).toContain('BNS_360_TEST_TIMEOUT_MS')
        expect(config).toContain('BNS_360_NAVIGATION_TIMEOUT_MS')
        expect(config).toContain('timeout: resolvedTestTimeout')
        expect(config).toContain('navigationTimeout: resolvedNavigationTimeout')
    })

    it('treats customer owner-panel rate limiting as a denied boundary, not panel access', () => {
        const fixtures = readFileSync(
            join(process.cwd(), 'e2e/support/bns-360-fixtures.ts'),
            'utf8'
        )

        expect(isBns360CustomerOwnerPanelBoundaryStatus(200)).toBe(true)
        expect(isBns360CustomerOwnerPanelBoundaryStatus(302)).toBe(true)
        expect(isBns360CustomerOwnerPanelBoundaryStatus(307)).toBe(true)
        expect(isBns360CustomerOwnerPanelBoundaryStatus(308)).toBe(true)
        expect(isBns360CustomerOwnerPanelBoundaryStatus(401)).toBe(true)
        expect(isBns360CustomerOwnerPanelBoundaryStatus(403)).toBe(true)
        expect(isBns360CustomerOwnerPanelBoundaryStatus(429)).toBe(true)
        expect(isBns360CustomerOwnerPanelBoundaryStatus(500)).toBe(false)
        expect(fixtures).toContain('isBns360CustomerOwnerPanelBoundaryStatus(status)')
        expect(fixtures).toContain('await expectBns360CustomerAccountUsable(page)')
    })

    it('does not wait for every subresource before accepting a BNS 360 route as loaded', () => {
        const fixtures = readFileSync(
            join(process.cwd(), 'e2e/support/bns-360-fixtures.ts'),
            'utf8'
        )

        expect(BNS_360_ROUTE_GOTO_OPTIONS).toEqual({ waitUntil: 'domcontentloaded' })
        expect(fixtures).toContain('page.goto(route, BNS_360_ROUTE_GOTO_OPTIONS)')
    })

    it('only declares public storefront smoke page routes that exist in the app router', () => {
        const shopRoot = join(process.cwd(), 'src/app/[lang]/(shop)')
        const publicPageRoutes = BNS_360_RUNTIME_MATRIX
            .filter(scenario => scenario.domain === 'storefront' && scenario.transport !== 'api')
            .flatMap(scenario => scenario.routes)

        for (const route of publicPageRoutes) {
            const segments = route.replace(/^\/es\/?/, '').split('/').filter(Boolean)
            const pagePath = join(shopRoot, ...segments, 'page.tsx')

            expect(
                existsSync(pagePath),
                `${route} is declared in BNS_360_RUNTIME_MATRIX but ${pagePath} does not exist`
            ).toBe(true)
        }
    })

    it('tracks bidirectional grants as runtime functional evidence', () => {
        const commerceScenario = BNS_360_RUNTIME_MATRIX.find(
            scenario => scenario.key === 'commerce.modules_marketplace_and_limits'
        )

        expect(commerceScenario?.routes).toEqual([
            '/es/panel/modulos',
            '/es/panel/ajustes?tab=suscripcion',
        ])
        expect(commerceScenario?.functionalEvidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'grant_unlock',
                target: expect.stringContaining('/api/module-purchase'),
            }),
            expect.objectContaining({
                kind: 'runtime_config',
                target: expect.stringContaining('central grants materialized'),
                routes: ['/api/panel/modules/grants/self-test?required=contract'],
                expectedJsonPaths: [
                    'status',
                    'summary.requiredCount',
                    'summary.activeCount',
                    'summary.missingCount',
                    'modules.0.key',
                ],
                expectedJsonValues: {
                    status: 'verified',
                    'summary.missingCount': 0,
                },
            }),
            expect.objectContaining({
                kind: 'limit_enforcement',
                target: expect.stringContaining('/api/panel/limits'),
                routes: ['/api/panel/limits?resources=products,categories,badges'],
                expectedJsonPaths: [
                    'products.limitKey',
                    'products.limit',
                    'categories.limitKey',
                    'categories.limit',
                    'badges.limitKey',
                    'badges.limit',
                ],
            }),
        ]))
    })

    it('declares full-system functional probes for checkout, customer, order and backup journeys', () => {
        const ecommerceScenario = BNS_360_RUNTIME_MATRIX.find(
            scenario => scenario.key === 'module.ecommerce'
        )
        const recoveryScenario = BNS_360_RUNTIME_MATRIX.find(
            scenario => scenario.key === 'recovery.backup_download_restore'
        )

        expect(ecommerceScenario?.functionalEvidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'checkout_payment_collection_journey',
                routes: ['/api/panel/bns-360/checkout-primary'],
                method: 'POST',
                expectedJsonValues: expect.objectContaining({
                    status: 'verified',
                    'runtime.paymentCollection.status': 'verified',
                    'cleanup.status': 'verified',
                    'residue.zero': true,
                }),
            }),
            expect.objectContaining({
                kind: 'customer_account_journey',
                routes: ['/api/panel/bns-360/customer-account-primary'],
                method: 'POST',
                expectedJsonValues: expect.objectContaining({
                    status: 'verified',
                    'runtime.crossTenantLeakage': false,
                    'cleanup.status': 'verified',
                    'residue.zero': true,
                }),
            }),
            expect.objectContaining({
                kind: 'order_lifecycle_journey',
                routes: ['/api/panel/bns-360/order-lifecycle-primary'],
                method: 'POST',
                expectedJsonValues: expect.objectContaining({
                    status: 'verified',
                    'runtime.paymentCollectionLinked': true,
                    'cleanup.status': 'verified',
                    'residue.zero': true,
                }),
            }),
        ]))
        expect(recoveryScenario?.functionalEvidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'backup_restore_journey',
                routes: ['/api/panel/bns-360/backup-restore-primary'],
                method: 'POST',
                expectedJsonValues: expect.objectContaining({
                    status: 'verified',
                    'runtime.restoreDryRun.safe': true,
                    'cleanup.status': 'verified',
                    'residue.zero': true,
                }),
            }),
        ]))
    })

    it('keeps all full-system functional targets automatable', () => {
        const fullSystemKinds = [
            'checkout_payment_collection_journey',
            'customer_account_journey',
            'order_lifecycle_journey',
            'backup_restore_journey',
            'terminal_simulator_journey',
        ]
        const fullSystemTargets = BNS_360_RUNTIME_MATRIX
            .flatMap(scenario => scenario.functionalEvidence ?? [])
            .filter(target => fullSystemKinds.includes(target.kind))

        expect(fullSystemTargets.length).toBeGreaterThanOrEqual(5)
        expect(getBns360AutomatedFunctionalEvidenceStatus(fullSystemTargets)).toBe('verified')
    })

    it('automates a read-only governance policy proof through the deployed storefront', () => {
        const governanceScenario = BNS_360_RUNTIME_MATRIX.find(
            scenario => scenario.key === 'governance.central_policy_read'
        )

        expect(governanceScenario).toMatchObject({
            domain: 'governance',
            transport: 'api',
            requiresAuth: true,
            routes: ['/api/panel/limits?resources=products,categories,badges'],
        })
        expect(governanceScenario?.functionalEvidence).toEqual([
            expect.objectContaining({
                kind: 'runtime_config',
                target: expect.stringContaining('get_tenant_governance'),
                routes: ['/api/panel/limits?resources=products,categories,badges'],
                expectedJsonPaths: [
                    'products.limitKey',
                    'products.limit',
                    'categories.limitKey',
                    'categories.limit',
                    'badges.limitKey',
                    'badges.limit',
                ],
            }),
        ])
        expect(getBns360AutomatedFunctionalEvidenceStatus(governanceScenario?.functionalEvidence ?? []))
            .toBe('verified')
    })

    it('serves panel limit probes from the already-authorized governance snapshot', () => {
        const route = readFileSync(
            join(process.cwd(), 'src/app/api/panel/limits/route.ts'),
            'utf8'
        )

        expect(route).toContain('const { tenantId, appConfig } = await withPanelGuard()')
        expect(route).toContain('checkResourceLimit(tenantId, singleResource, appConfig.planLimits)')
        expect(route).toContain('checkMultipleResourceLimits(tenantId, keys, appConfig.planLimits)')
    })

    it('keeps parameterized recovery APIs out of raw smoke routes', () => {
        const recoveryScenario = BNS_360_RUNTIME_MATRIX.find(
            scenario => scenario.key === 'recovery.backup_download_restore'
        )

        expect(recoveryScenario?.routes).toEqual(['/api/panel/vault'])
        expect(recoveryScenario?.functionalEvidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'backup_restore_journey',
                target: expect.stringContaining('/api/panel/vault/download'),
            }),
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

    it('automates capacidad functional evidence through vault health and storage limit probes', () => {
        const capacidadScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'capacidad'
        )

        expect(capacidadScenario?.functionalEvidence).toEqual([
            expect.objectContaining({
                kind: 'api_health',
                routes: ['/api/panel/vault'],
            }),
            expect.objectContaining({
                kind: 'limit_enforcement',
                routes: ['/api/panel/vault'],
                expectedJsonPaths: [
                    'usage.total.mb',
                    'limit_mb',
                    'usage_percent',
                ],
            }),
        ])
        expect(getBns360AutomatedFunctionalEvidenceStatus(capacidadScenario?.functionalEvidence ?? []))
            .toBe('verified')
    })

    it('probes chatbot message limits through the authenticated usage API', () => {
        const chatbotScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'chatbot'
        )

        expect(chatbotScenario?.functionalEvidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'limit_enforcement',
                target: expect.stringContaining('max_chatbot_messages_month'),
                routes: ['/api/chat/usage'],
                expectedJsonPaths: [
                    'messageCount',
                    'limit',
                    'authenticated',
                ],
                expectedJsonValues: {
                    authenticated: true,
                },
            }),
        ]))
    })

    it('automates i18n primary language and currency runtime evidence', () => {
        const i18nScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'i18n'
        )

        expect(i18nScenario?.functionalEvidence).toEqual([
            expect.objectContaining({
                kind: 'module_primary_journey',
                routes: ['/api/panel/bns-360/i18n-primary'],
                method: 'POST',
                expectedJsonPaths: [
                    'status',
                    'runId',
                    'runtime.language',
                    'runtime.storefrontLanguage',
                    'runtime.defaultCurrency',
                    'runtime.publicHtmlLang',
                    'limits.maxLanguages',
                    'limits.maxCurrencies',
                    'cleanup.status',
                ],
                expectedJsonValues: {
                    status: 'verified',
                    'runtime.language': 'de',
                    'runtime.storefrontLanguage': 'de',
                    'runtime.defaultCurrency': 'chf',
                    'runtime.publicHtmlLang': 'de',
                    'cleanup.status': 'verified',
                },
            }),
        ])
        expect(getBns360AutomatedFunctionalEvidenceStatus(i18nScenario?.functionalEvidence ?? []))
            .toBe('verified')
    })

    it('automates SEO primary metadata runtime evidence', () => {
        const seoScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'seo'
        )

        expect(seoScenario?.functionalEvidence).toEqual([
            expect.objectContaining({
                kind: 'module_primary_journey',
                target: 'SEO metadata config changes render in public page metadata',
                reversible: true,
                routes: ['/api/panel/bns-360/seo-primary'],
                method: 'POST',
                expectedJsonPaths: [
                    'status',
                    'runId',
                    'runtime.metaTitle',
                    'runtime.metaDescription',
                    'runtime.publicTitle',
                    'runtime.publicDescription',
                    'runtime.publicOgTitle',
                    'runtime.publicOgDescription',
                    'cleanup.status',
                ],
                expectedJsonValues: {
                    status: 'verified',
                    'cleanup.status': 'verified',
                },
            }),
        ])
        expect(getBns360AutomatedFunctionalEvidenceStatus(seoScenario?.functionalEvidence ?? []))
            .toBe('verified')
    })

    it('automates RRSS primary social link runtime evidence', () => {
        const rrssScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'rrss'
        )

        expect(rrssScenario?.functionalEvidence).toEqual([
            expect.objectContaining({
                kind: 'module_primary_journey',
                target: 'social links persist and render in public JSON-LD sameAs',
                reversible: true,
                routes: ['/api/panel/bns-360/rrss-primary'],
                method: 'POST',
                expectedJsonPaths: [
                    'status',
                    'runId',
                    'runtime.socialFacebook',
                    'runtime.socialInstagram',
                    'runtime.sameAs',
                    'cleanup.status',
                ],
                expectedJsonValues: {
                    status: 'verified',
                    'cleanup.status': 'verified',
                },
            }),
        ])
        expect(getBns360AutomatedFunctionalEvidenceStatus(rrssScenario?.functionalEvidence ?? []))
            .toBe('verified')
    })

    it('automates automation primary notification mapping runtime evidence', () => {
        const automationScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'automation'
        )

        expect(automationScenario?.functionalEvidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'module_primary_journey',
                target: 'event-to-channel mapping can be edited and rendered',
                reversible: true,
                routes: ['/api/panel/bns-360/automation-primary'],
                method: 'POST',
                expectedJsonPaths: [
                    'status',
                    'runId',
                    'runtime.webhook.enabled',
                    'runtime.webhook.urlHost',
                    'runtime.webhook.secretRedacted',
                    'runtime.eventMapping.orderPlaced',
                    'cleanup.status',
                ],
                expectedJsonValues: {
                    status: 'verified',
                    'runtime.webhook.secretRedacted': true,
                    'cleanup.status': 'verified',
                },
            }),
        ]))
        expect(getBns360AutomatedFunctionalEvidenceStatus(automationScenario?.functionalEvidence ?? []))
            .toBe('verified')
    })

    it('automates email marketing primary preference and automation runtime evidence', () => {
        const emailMarketingScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'email_marketing'
        )

        expect(emailMarketingScenario?.functionalEvidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'module_primary_journey',
                target: 'email preferences and automations persist without leaking provider secrets',
                reversible: true,
                routes: ['/api/panel/bns-360/email-marketing-primary'],
                method: 'POST',
                expectedJsonPaths: [
                    'status',
                    'runId',
                    'runtime.preferences.templateDesign',
                    'runtime.automation.reviewRequestEnabled',
                    'runtime.limits.maxEmailSendsMonth',
                    'runtime.secretRedacted',
                    'cleanup.status',
                ],
                expectedJsonValues: {
                    status: 'verified',
                    'runtime.secretRedacted': true,
                    'cleanup.status': 'verified',
                },
            }),
        ]))
        expect(getBns360AutomatedFunctionalEvidenceStatus(emailMarketingScenario?.functionalEvidence ?? []))
            .toBe('verified')
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

    it('runs full-catalog certification as a combined tenant profile, not only isolated module pages', () => {
        const fullCatalog = BNS_360_TENANT_PROFILES.find(
            profile => profile.key === 'full_catalog_highest_tier'
        )

        expect(fullCatalog?.scenarioKeys).toEqual(expect.arrayContaining([
            'governance.central_policy_read',
            'commerce.modules_marketplace_and_limits',
            'pos.core_checkout',
            'pos.offline_sync',
            'pos.refunds_and_history',
            'module.pos',
            'module.pos_kiosk',
        ]))
        expect(fullCatalog?.scenarioKeys.filter(key => key.startsWith('module.')).sort()).toEqual(
            contract.modules.catalog.map(module => `module.${module.key}`).sort()
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

    it('writes a reusable aggregated runtime evidence artifact without secrets', () => {
        const tmp = mkdtempSync(join(tmpdir(), 'bns-360-evidence-'))
        const artifactPath = join(tmp, 'runtime-evidence.json')

        try {
            const evidence = buildBns360ScenarioEvidence({
                scenarioKey: 'governance.central_policy_read',
                baseUrl: 'https://template-canary.bootandstrap.com',
                routes: ['/api/panel/limits?resources=products,categories,badges'],
                functionalEvidence: [
                    {
                        kind: 'runtime_config',
                        target: 'get_tenant_governance materializes plan limits',
                        reversible: false,
                        routes: ['/api/panel/limits?resources=products,categories,badges'],
                        expectedJsonPaths: ['products.limitKey', 'products.limit'],
                    },
                ],
                ownerEmail: 'owner+canary@example.com',
                ownerPassword: 'do-not-store',
                status: 'verified',
                executionMode: 'functional',
                functionalStatus: 'verified',
            })

            recordBns360ScenarioEvidenceArtifact({
                artifactPath,
                evidence,
                templateCommit: 'd78a0a23',
                tenantRef: 'ops-fullcat-202607091146',
                cleanupStatus: 'not_applicable',
                deployedBuild: {
                    commitSha: 'f00dbabe1234567890',
                    commitShortSha: 'f00dbabe',
                    branch: 'main',
                    deployedAt: '2026-07-23T17:50:00.000Z',
                    source: 'health',
                },
                routeChecks: [
                    {
                        path: '/api/panel/limits?resources=products,categories,badges',
                        status: 200,
                    },
                ],
            })

            const artifactText = readFileSync(artifactPath, 'utf8')
            const artifact = JSON.parse(artifactText)

            expect(artifact).toMatchObject({
                schema: 'bootandstrap.template.bns-360.runtime-evidence/v1',
                version: 1,
                templateCommit: 'd78a0a23',
                tenantRef: 'ops-fullcat-202607091146',
                baseUrl: 'https://template-canary.bootandstrap.com',
                deployedBuild: {
                    commitSha: 'f00dbabe1234567890',
                    commitShortSha: 'f00dbabe',
                    branch: 'main',
                    deployedAt: '2026-07-23T17:50:00.000Z',
                    source: 'health',
                },
                scenarios: [
                    expect.objectContaining({
                        scenario: 'governance.central_policy_read',
                        executionMode: 'functional',
                        routeStatus: 'verified',
                        functionalStatus: 'verified',
                        credentialState: 'provided_redacted',
                        pass: true,
                        cleanupStatus: 'not_applicable',
                        paths: [
                            expect.objectContaining({
                                path: '/api/panel/limits?resources=products,categories,badges',
                                status: 200,
                            }),
                        ],
                    }),
                ],
            })
            expect(artifactText).not.toContain('owner+canary@example.com')
            expect(artifactText).not.toContain('do-not-store')
        } finally {
            rmSync(tmp, { force: true, recursive: true })
        }
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
            {
                kind: 'virtual_printer_lab',
                target: 'POS virtual printer self-test',
                reversible: true,
                routes: ['/api/panel/pos/virtual-printer/self-test'],
                expectedJsonPaths: ['status', 'jobs.0.type', 'printer.id'],
            },
        ])).toBe('verified')
        expect(getBns360AutomatedFunctionalEvidenceStatus([
            {
                kind: 'runtime_config',
                target: 'governance limits JSON',
                reversible: false,
                routes: ['/api/panel/limits?resources=products'],
                expectedJsonPaths: ['products.limitKey', 'products.limit'],
            },
        ])).toBe('verified')
        expect(getBns360AutomatedFunctionalEvidenceStatus([
            {
                kind: 'limit_enforcement',
                target: 'panel limits JSON',
                reversible: false,
                routes: ['/api/panel/limits?resources=products'],
                expectedJsonPaths: ['products.limitKey', 'products.limit'],
            },
        ])).toBe('verified')
        expect(getBns360AutomatedFunctionalEvidenceStatus([
            { kind: 'api_health', target: 'health', reversible: true, routes: ['/api/health'] },
            { kind: 'crud_journey', target: 'crm contact CRUD', reversible: true },
        ])).toBe('manual_required')
    })

    it('can focus functional runtime runs on currently automated evidence without changing the default matrix', () => {
        const commerceScenario = BNS_360_RUNTIME_MATRIX.find(
            scenario => scenario.key === 'commerce.modules_marketplace_and_limits'
        )
        const chatbotScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'chatbot'
        )

        expect(getBns360FunctionalEvidenceForRun(commerceScenario?.functionalEvidence ?? [], {}))
            .toEqual(commerceScenario?.functionalEvidence)
        expect(getBns360AutomatedFunctionalEvidenceStatus(commerceScenario?.functionalEvidence ?? []))
            .toBe('manual_required')

        const focusedCommerceEvidence = getBns360FunctionalEvidenceForRun(
            commerceScenario?.functionalEvidence ?? [],
            {
                BNS_360_FUNCTIONAL_EVIDENCE_KINDS: 'limit_enforcement,runtime_config',
                BNS_360_FUNCTIONAL_AUTOMATED_ONLY: '1',
                BNS_360_FUNCTIONAL_EXCLUDE_TARGET_PATTERN: 'central grants materialized',
            }
        )
        const focusedChatbotEvidence = getBns360FunctionalEvidenceForRun(
            chatbotScenario?.functionalEvidence ?? [],
            {
                BNS_360_FUNCTIONAL_EVIDENCE_KINDS: 'limit_enforcement,runtime_config',
                BNS_360_FUNCTIONAL_AUTOMATED_ONLY: '1',
            }
        )

        expect(focusedCommerceEvidence.map(target => target.kind)).toEqual([
            'limit_enforcement',
        ])
        expect(getBns360AutomatedFunctionalEvidenceStatus(focusedCommerceEvidence)).toBe('verified')
        expect(focusedChatbotEvidence.map(target => target.kind)).toEqual(['limit_enforcement'])
        expect(getBns360AutomatedFunctionalEvidenceStatus(focusedChatbotEvidence)).toBe('verified')
    })

    it('declares module.crm as an automated reversible CRUD journey', () => {
        const crmScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'crm'
        )

        expect(crmScenario?.functionalEvidence).toEqual([
            expect.objectContaining({
                kind: 'crud_journey',
                target: 'tenant-scoped CRM contact create/update/delete',
                reversible: true,
                routes: ['/api/panel/bns-360/crm-crud'],
                method: 'POST',
                expectedJsonPaths: [
                    'status',
                    'runId',
                    'cleanup.status',
                    'residue.zero',
                ],
                expectedJsonValues: {
                    status: 'verified',
                    'cleanup.status': 'verified',
                    'residue.zero': true,
                },
            }),
        ])
        expect(getBns360AutomatedFunctionalEvidenceStatus(crmScenario?.functionalEvidence ?? []))
            .toBe('verified')
    })

    it('declares module.ecommerce as an automated reversible product CRUD primary journey', () => {
        const ecommerceScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'ecommerce'
        )

        expect(ecommerceScenario?.functionalEvidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'crud_journey',
                target: 'tenant-scoped Medusa product create/update/delete through panel API',
                reversible: true,
                scope: 'sandbox',
                gate: 'owner_auth',
                routes: ['/api/panel/bns-360/ecommerce-primary'],
                method: 'POST',
                expectedJsonPaths: [
                    'status',
                    'runId',
                    'runtime.product.id',
                    'runtime.product.handle',
                    'runtime.product.status',
                    'runtime.certificationCoverage.productCrud',
                    'runtime.certificationCoverage.checkoutPaymentCollection',
                    'runtime.certificationCoverage.customerAccount',
                    'runtime.certificationCoverage.orderLifecycle',
                    'cleanup.status',
                    'residue.zero',
                ],
                expectedJsonValues: {
                    status: 'verified',
                    'runtime.product.status': 'draft',
                    'runtime.certificationCoverage.productCrud': 'verified',
                    'runtime.certificationCoverage.checkoutPaymentCollection': 'manual_required',
                    'runtime.certificationCoverage.customerAccount': 'manual_required',
                    'runtime.certificationCoverage.orderLifecycle': 'manual_required',
                    'cleanup.status': 'verified',
                    'residue.zero': true,
                },
            }),
            expect.objectContaining({
                kind: 'module_primary_journey',
                target: 'storefront catalog reflects a Medusa product mutation before rollback',
                reversible: true,
                scope: 'sandbox',
                gate: 'owner_auth',
                routes: ['/api/panel/bns-360/ecommerce-primary'],
                method: 'POST',
                expectedJsonPaths: [
                    'status',
                    'runId',
                    'runtime.catalog.readableAfterCreate',
                    'runtime.catalog.updatedTitle',
                    'runtime.certificationCoverage.storefrontCatalog',
                    'cleanup.status',
                    'residue.zero',
                ],
                expectedJsonValues: {
                    status: 'verified',
                    'runtime.catalog.readableAfterCreate': true,
                    'runtime.certificationCoverage.storefrontCatalog': 'verified',
                    'cleanup.status': 'verified',
                    'residue.zero': true,
                },
            }),
        ]))
        expect(getBns360AutomatedFunctionalEvidenceStatus(ecommerceScenario?.functionalEvidence ?? []))
            .toBe('verified')
    })

    it('keeps sales channel smoke on canonical channel routes and certifies messages through the primary API journey', () => {
        const salesChannelsScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'sales_channels'
        )

        expect(salesChannelsScenario?.runtimeRoutes).toContain('/es/panel/canales')
        expect(salesChannelsScenario?.runtimeRoutes).toContain('/es/panel/ajustes?tab=tienda')
        expect(salesChannelsScenario?.runtimeRoutes).not.toContain('/es/panel/mensajes')
        expect(salesChannelsScenario?.functionalEvidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'module_primary_journey',
                routes: ['/api/panel/bns-360/sales-channels-primary'],
                method: 'POST',
                expectedJsonValues: {
                    status: 'verified',
                    'cleanup.status': 'verified',
                },
            }),
        ]))
        const automatedEvidence = getBns360FunctionalEvidenceForRun(
            salesChannelsScenario?.functionalEvidence ?? [],
            {
                BNS_360_FUNCTIONAL_EVIDENCE_KINDS: 'module_primary_journey',
                BNS_360_FUNCTIONAL_AUTOMATED_ONLY: '1',
            }
        )

        expect(automatedEvidence).toHaveLength(1)
        expect(getBns360AutomatedFunctionalEvidenceStatus(automatedEvidence))
            .toBe('verified')
    })

    it('declares Medusa/storefront payment, customer and order coverage as automated reversible probes', () => {
        const ecommerceScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'ecommerce'
        )

        expect(ecommerceScenario?.functionalEvidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'checkout_payment_collection_journey',
                target: 'Medusa cart completion links payment collection/session to an order through storefront checkout',
                reversible: true,
                scope: 'simulator',
                gate: 'test_mode_keys',
                routes: ['/api/panel/bns-360/checkout-primary'],
                method: 'POST',
            }),
            expect.objectContaining({
                kind: 'customer_account_journey',
                target: 'Store customer can authenticate, manage address data and read orders without cross-tenant leakage',
                reversible: true,
                scope: 'sandbox',
                gate: 'owner_auth',
                routes: ['/api/panel/bns-360/customer-account-primary'],
                method: 'POST',
            }),
            expect.objectContaining({
                kind: 'order_lifecycle_journey',
                target: 'Medusa order lifecycle covers placement, fulfillment/cancel boundary, refund/return boundary and analytics subscribers',
                reversible: true,
                scope: 'simulator',
                gate: 'test_mode_keys',
                routes: ['/api/panel/bns-360/order-lifecycle-primary'],
                method: 'POST',
            }),
        ]))
        expect(getBns360AutomatedFunctionalEvidenceStatus(
            ecommerceScenario?.functionalEvidence.filter(target =>
                target.kind === 'checkout_payment_collection_journey' ||
                target.kind === 'customer_account_journey' ||
                target.kind === 'order_lifecycle_journey'
            ) ?? []
        )).toBe('verified')
    })

    it('declares POS and kiosk as automated reversible primary journeys without hardware', () => {
        const posScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'pos'
        )
        const kioskScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'pos_kiosk'
        )

        const posPrimary = posScenario?.functionalEvidence.find(
            target => target.kind === 'module_primary_journey'
        )
        const kioskPrimary = kioskScenario?.functionalEvidence.find(
            target => target.kind === 'module_primary_journey'
        )

        expect(posPrimary).toEqual(expect.objectContaining({
            kind: 'module_primary_journey',
            target: 'POS cart, payment selection and receipt tooling complete without physical hardware',
            reversible: true,
            scope: 'simulator',
            gate: 'owner_auth',
            routes: ['/api/panel/bns-360/pos-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runId',
                'runtime.cart.itemCount',
                'runtime.cart.total',
                'runtime.paymentMethods.enabledIds',
                'runtime.terminalSimulator.mode',
                'runtime.terminalSimulator.paymentIntentUsage',
                'runtime.virtualPrinter.jobs.0.type',
                'runtime.virtualPrinter.jobs.1.type',
                'cleanup.status',
                'residue.zero',
            ],
            expectedJsonValues: {
                status: 'verified',
                'runtime.terminalSimulator.mode': 'simulator',
                'runtime.terminalSimulator.paymentIntentUsage': 'card_present',
                'runtime.virtualPrinter.jobs.0.type': 'sale_receipt',
                'runtime.virtualPrinter.jobs.1.type': 'cash_drawer',
                'cleanup.status': 'verified',
                'residue.zero': true,
            },
        }))
        expect(kioskPrimary).toEqual(expect.objectContaining({
            kind: 'module_primary_journey',
            target: 'kiosk mode is materialized through the POS runtime surface',
            reversible: true,
            routes: ['/api/panel/bns-360/pos-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runtime.kiosk.available',
                'runtime.kiosk.idleTimer',
                'cleanup.status',
                'residue.zero',
            ],
            expectedJsonValues: {
                status: 'verified',
                'runtime.kiosk.available': true,
                'cleanup.status': 'verified',
                'residue.zero': true,
            },
        }))
        expect(getBns360AutomatedFunctionalEvidenceStatus([posPrimary!, kioskPrimary!]))
            .toBe('verified')
    })

    it('separates POS Terminal simulator certification from physical reader certification', () => {
        const posScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'pos'
        )

        expect(posScenario?.functionalEvidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'terminal_simulator_journey',
                target: 'Stripe Terminal simulator validates reader discovery, card_present payment lifecycle and refund boundary',
                reversible: true,
                scope: 'simulator',
                gate: 'test_mode_keys',
                routes: ['/api/panel/bns-360/pos-primary'],
                method: 'POST',
                expectedJsonPaths: [
                    'status',
                    'runtime.terminalSimulator.provider',
                    'runtime.terminalSimulator.mode',
                    'runtime.terminalSimulator.paymentIntentUsage',
                    'runtime.terminalSimulator.steps',
                    'runtime.terminalSimulator.liveMutation',
                    'runtime.terminalSimulator.hardwareRequired',
                ],
                expectedJsonValues: {
                    status: 'verified',
                    'runtime.terminalSimulator.provider': 'stripe_terminal',
                    'runtime.terminalSimulator.mode': 'simulator',
                    'runtime.terminalSimulator.paymentIntentUsage': 'card_present',
                    'runtime.terminalSimulator.liveMutation': false,
                    'runtime.terminalSimulator.hardwareRequired': false,
                },
            }),
            expect.objectContaining({
                kind: 'hardware_terminal_certification',
                target: 'Physical POS reader certification requires provider, location, reader id and explicit payment/refund authorization',
                reversible: true,
                scope: 'hardware',
                gate: 'human_authorization',
            }),
        ]))
        expect(getBns360AutomatedFunctionalEvidenceStatus(
            posScenario?.functionalEvidence.filter(target =>
                target.kind === 'hardware_terminal_certification'
            ) ?? []
        )).toBe('manual_required')
    })

    it('keeps POS offline sync, refunds and history as automated functional journeys, not route-only smoke', () => {
        const offlineScenario = BNS_360_RUNTIME_MATRIX.find(
            scenario => scenario.key === 'pos.offline_sync'
        )
        const refundsScenario = BNS_360_RUNTIME_MATRIX.find(
            scenario => scenario.key === 'pos.refunds_and_history'
        )

        for (const scenario of [offlineScenario, refundsScenario]) {
            expect(scenario).toBeDefined()
            expect(scenario!.functionalEvidence?.length ?? 0).toBeGreaterThan(0)
            expect(getBns360AutomatedFunctionalEvidenceStatus(scenario?.functionalEvidence ?? []))
                .toBe('verified')
        }

        expect(offlineScenario?.functionalEvidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'terminal_simulator_journey',
                routes: ['/api/panel/bns-360/pos-primary'],
                expectedJsonValues: expect.objectContaining({
                    status: 'verified',
                    'runtime.terminalSimulator.mode': 'simulator',
                    'runtime.terminalSimulator.liveMutation': false,
                }),
            }),
        ]))
        expect(refundsScenario?.functionalEvidence).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'terminal_simulator_journey',
                routes: ['/api/panel/bns-360/pos-primary'],
                expectedJsonValues: expect.objectContaining({
                    status: 'verified',
                    'runtime.terminalSimulator.hardwareRequired': false,
                }),
            }),
        ]))
    })

    it('declares module.chatbot as an automated reversible primary journey', () => {
        const chatbotScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'chatbot'
        )
        const primaryJourney = chatbotScenario?.functionalEvidence.find(
            target => target.kind === 'module_primary_journey'
        )

        expect(primaryJourney).toEqual(expect.objectContaining({
            kind: 'module_primary_journey',
            target: 'chatbot owner config changes render in runtime and roll back',
            reversible: true,
            routes: ['/api/panel/bns-360/chatbot-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runId',
                'runtime.chatbotName',
                'runtime.welcomeMessage',
                'usage.limit',
                'cleanup.status',
            ],
            expectedJsonValues: {
                status: 'verified',
                'cleanup.status': 'verified',
            },
        }))
        expect(getBns360AutomatedFunctionalEvidenceStatus([primaryJourney!]))
            .toBe('verified')
    })

    it('declares module.auth_advanced as an automated reversible grant unlock journey', () => {
        const authScenario = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
            scenario => scenario.moduleKey === 'auth_advanced'
        )
        const grantUnlock = authScenario?.functionalEvidence.find(
            target => target.kind === 'grant_unlock'
        )

        expect(grantUnlock).toEqual(expect.objectContaining({
            kind: 'grant_unlock',
            target: 'enable_auth_advanced gates /panel/auth through materialized product grants',
            reversible: true,
            routes: ['/api/panel/modules/grants/self-test?required=auth_advanced'],
            method: 'GET',
            expectedJsonPaths: [
                'status',
                'summary.requiredCount',
                'summary.activeCount',
                'summary.missingCount',
                'modules.0.key',
            ],
            expectedJsonValues: {
                status: 'verified',
                'summary.requiredCount': 1,
                'summary.missingCount': 0,
            },
        }))
        expect(getBns360AutomatedFunctionalEvidenceStatus([grantUnlock!]))
            .toBe('verified')
    })

    it('checks nested JSON paths for automated read-only governance evidence', () => {
        const limitsPayload = {
            products: { limitKey: 'max_products', limit: 100 },
            categories: { limitKey: 'max_categories', limit: 20 },
            badges: { limitKey: 'max_badges', limit: 10 },
        }

        expect(bns360JsonHasPath(limitsPayload, 'products.limitKey')).toBe(true)
        expect(bns360JsonHasPath(limitsPayload, 'categories.limit')).toBe(true)
        expect(bns360JsonHasPath(limitsPayload, 'badges.warning')).toBe(false)
    })

    it('summarizes JSON shape for functional path diagnostics without dumping values', () => {
        expect(summarizeBns360JsonShape({
            products: { limitKey: 'max_products', limit: 100 },
            error: 'do-not-dump',
        })).toEqual({
            error: 'string',
            products: ['limit', 'limitKey'],
        })
    })

    it('checks expected JSON values for automated functional evidence', () => {
        const grantsPayload = {
            status: 'verified',
            summary: { missingCount: 0 },
        }

        expect(bns360JsonValueMatches(grantsPayload, 'status', 'verified')).toBe(true)
        expect(bns360JsonValueMatches(grantsPayload, 'summary.missingCount', 0)).toBe(true)
        expect(bns360JsonValueMatches(grantsPayload, 'summary.missingCount', 1)).toBe(false)
        expect(bns360JsonValueMatches(grantsPayload, 'summary.extra', null)).toBe(false)
    })

    it('keeps mutating functional journeys opt-in', () => {
        expect(getBns360ExecutionMode({ BNS_360_FUNCTIONAL_JOURNEYS: undefined })).toBe('smoke')
        expect(getBns360ExecutionMode({ BNS_360_FUNCTIONAL_JOURNEYS: '0' })).toBe('smoke')
        expect(getBns360ExecutionMode({ BNS_360_FUNCTIONAL_JOURNEYS: '1' })).toBe('functional')
    })

    it('requires owner credentials in functional mode instead of skipping authenticated scenarios', () => {
        expect(getBns360MissingCredentialAction({
            requiresAuth: true,
            hasCredentials: false,
            executionMode: 'smoke',
        })).toEqual({
            action: 'skip',
            reason: 'Owner credentials are required for authenticated 360 runtime smoke routes',
        })

        expect(getBns360MissingCredentialAction({
            requiresAuth: true,
            hasCredentials: false,
            executionMode: 'functional',
        })).toEqual({
            action: 'fail',
            reason: 'Owner credentials are required for authenticated 360 functional certification',
        })

        expect(getBns360MissingCredentialAction({
            requiresAuth: true,
            hasCredentials: true,
            executionMode: 'functional',
        })).toEqual({ action: 'run' })
    })
})
