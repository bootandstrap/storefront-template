import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const REPO_ROOT = resolve(process.cwd(), '..', '..')

function readWorkflow(name: string) {
    return readFileSync(join(REPO_ROOT, '.github', 'workflows', name), 'utf8')
}

function readWorkflowNames() {
    return readdirSync(join(REPO_ROOT, '.github', 'workflows'))
        .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
        .sort()
}

function readScript(name: string) {
    return readFileSync(join(REPO_ROOT, 'scripts', name), 'utf8')
}

function writeRiskMatrix(domains: unknown[]) {
    const matrixPath = join(mkdtempSync(join(tmpdir(), 'risk-domain-evidence-')), 'risk-test-matrix.json')
    writeFileSync(matrixPath, JSON.stringify({ schemaVersion: 1, domains }, null, 2))
    return matrixPath
}

function riskDomain(domain: Partial<{
    id: string
    runtimeEvidence: string[]
}>) {
    return {
        id: domain.id ?? 'ci-release-artifacts',
        runtimeEvidence: domain.runtimeEvidence ?? ['node scripts/check-risk-test-matrix.mjs'],
    }
}

function runEvidenceRunner(args: string[], env: Record<string, string | undefined> = {}) {
    const summaryPath = env.RISK_DOMAIN_EVIDENCE_SUMMARY_PATH
        ?? join(mkdtempSync(join(tmpdir(), 'risk-domain-evidence-run-')), 'summary.json')

    return spawnSync(
        process.execPath,
        [join(REPO_ROOT, 'scripts', 'run-risk-domain-evidence.mjs'), ...args],
        {
            cwd: REPO_ROOT,
            encoding: 'utf8',
            env: {
                ...process.env,
                RISK_DOMAIN_EVIDENCE_SUMMARY_PATH: summaryPath,
                ...env,
            },
        }
    )
}

function uploadArtifactBlocks(workflow: string) {
    return workflow
        .split('\n      - name:')
        .filter((block) => block.includes('uses: actions/upload-artifact@v4'))
}

function jobsWithoutTimeout(workflow: string) {
    const missing: string[] = []
    let current: { hasRunsOn: boolean; hasTimeout: boolean; name: string } | undefined

    function flush() {
        if (current?.hasRunsOn && !current.hasTimeout) {
            missing.push(current.name)
        }
    }

    for (const line of workflow.split('\n')) {
        const job = /^  ([A-Za-z0-9_-]+):\s*$/.exec(line)
        if (job) {
            flush()
            current = { hasRunsOn: false, hasTimeout: false, name: job[1] ?? '' }
            continue
        }

        if (!current) continue
        if (/^    runs-on:\s+/.test(line)) current.hasRunsOn = true
        if (/^    timeout-minutes:\s+\d+\s*$/.test(line)) current.hasTimeout = true
    }

    flush()
    return missing
}

describe('CI artifact contract', () => {
    it.each(['ci.yml', 'lighthouse-ci.yml'])(
        '%s uploads hidden Lighthouse report directories explicitly',
        (workflowName) => {
            const workflow = readWorkflow(workflowName)
            const hiddenUploads = uploadArtifactBlocks(workflow).filter((block) =>
                /path:\s+.*\/?\.[^/\s]+/.test(block)
            )

            expect(hiddenUploads.length).toBeGreaterThan(0)
            for (const upload of hiddenUploads) {
                expect(upload).toContain('include-hidden-files: true')
            }
        }
    )

    it('runs coverage without passing a literal separator argument to Vitest', () => {
        const workflow = readWorkflow('ci.yml')
        const releaseGate = readScript('release-gate.sh')

        expect(workflow).toContain('pnpm test:run --coverage')
        expect(releaseGate).toContain('pnpm --filter=storefront test:run --coverage')
        expect(workflow).not.toContain('pnpm test:run -- --coverage')
        expect(releaseGate).not.toContain('pnpm --filter=storefront test:run -- --coverage')
    })

    it('bounds the post-deploy Lighthouse audit runtime', () => {
        const workflow = readWorkflow('lighthouse-ci.yml')

        expect(workflow).toMatch(/\n\s+lighthouse:\n(?:.*\n){1,8}\s+timeout-minutes:\s*15\n/)
    })

    it('waits for the exact deployed commit before collecting tenant runtime evidence', () => {
        const ciWorkflow = readWorkflow('ci.yml')
        const deployWorkflow = readWorkflow('deploy.yml')
        const waitScript = readScript('ci/wait-for-runtime-commit.mjs')

        expect(ciWorkflow).toContain('Wait for exact deployed storefront commit')
        expect(ciWorkflow).toContain("if: github.event_name == 'push'")
        expect(ciWorkflow).toContain('BNS_RUNTIME_EXPECTED_COMMIT: ${{ github.sha }}')
        expect(ciWorkflow).toContain("format('https://{0}', vars.STORE_DOMAIN)")
        expect(ciWorkflow).toContain("|| 'http://localhost:3000'")
        expect(deployWorkflow).toContain('BNS_RUNTIME_EXPECTED_COMMIT: ${{ github.sha }}')
        expect(waitScript).toContain('build?.commitSha')
        expect(waitScript).toContain('expectedCommit')
        expect(waitScript).toContain('FAIL-CLOSED')
    })

    it('bounds every GitHub Actions job runtime', () => {
        const missingTimeouts = readWorkflowNames().flatMap((workflowName) =>
            jobsWithoutTimeout(readWorkflow(workflowName)).map((jobName) => `${workflowName}:${jobName}`)
        )

        expect(missingTimeouts).toEqual([])
    })

    it('blocks releases when critical risk-domain tests disappear', () => {
        const releaseGate = readScript('release-gate.sh')
        const matrix = JSON.parse(readScript('risk-test-matrix.json')) as {
            domains: Array<{
                id: string
                failureModes: string[]
                minTestFiles?: number
                requiredTestFiles: string[]
                runtimeEvidence: string[]
            }>
        }

        const domainIds = new Set(matrix.domains.map((domain) => domain.id))

        expect(releaseGate).toContain('node scripts/check-risk-test-matrix.mjs')
        expect(domainIds).toEqual(
            new Set([
                'security-auth-tenant-isolation',
                'checkout-payment-simulators',
                'pos-simulator',
                'module-runtime-primary-journeys',
                'provisioning-cleanup-governance',
                'visual-runtime-primary-routes',
                'ci-release-artifacts',
            ])
        )

        for (const domain of matrix.domains) {
            expect(domain.requiredTestFiles.length, domain.id).toBeGreaterThanOrEqual(domain.minTestFiles ?? 2)
            expect(domain.failureModes.length, domain.id).toBeGreaterThanOrEqual(2)
            expect(domain.runtimeEvidence.length, domain.id).toBeGreaterThanOrEqual(1)
        }
    })

    it('runs the critical risk-domain test matrix in GitHub CI', () => {
        const workflow = readWorkflow('ci.yml')

        expect(workflow).toContain('name: Risk Test Matrix')
        expect(workflow).toContain('node scripts/check-risk-test-matrix.mjs')
    })

    it('runs risk-domain runtime evidence in release gate and GitHub CI', () => {
        const workflow = readWorkflow('ci.yml')
        const releaseGate = readScript('release-gate.sh')
        const runner = readScript('run-risk-domain-evidence.mjs')

        expect(releaseGate).toContain('node scripts/run-risk-domain-evidence.mjs')
        expect(workflow).toContain('name: Risk Domain Evidence')
        expect(workflow).toContain('node scripts/run-risk-domain-evidence.mjs')
        expect(runner).toContain('risk-test-matrix.json')
    })

    it('executes one requested risk-domain evidence command', () => {
        const matrixPath = writeRiskMatrix([riskDomain({ id: 'ci-release-artifacts' })])

        const result = runEvidenceRunner(['--matrix', matrixPath, '--domain', 'ci-release-artifacts'])

        expect(result.status).toBe(0)
        expect(result.stdout).toContain('ci-release-artifacts')
        expect(result.stdout).toContain('node scripts/check-risk-test-matrix.mjs')
    })

    it('executes all risk-domain evidence commands when no domain is selected', () => {
        const matrixPath = writeRiskMatrix([
            riskDomain({ id: 'ci-release-artifacts' }),
            riskDomain({ id: 'provisioning-cleanup-governance' }),
        ])

        const result = runEvidenceRunner(['--matrix', matrixPath])

        expect(result.status).toBe(0)
        expect(result.stdout).toContain('ci-release-artifacts')
        expect(result.stdout).toContain('provisioning-cleanup-governance')
    })

    it('fails closed when a requested risk domain does not exist', () => {
        const matrixPath = writeRiskMatrix([riskDomain({ id: 'ci-release-artifacts' })])

        const result = runEvidenceRunner(['--matrix', matrixPath, '--domain', 'missing-domain'])

        expect(result.status).toBe(1)
        expect(result.stderr).toContain('unknown risk domain: missing-domain')
    })

    it('fails closed when risk-domain runtime evidence is not defined', () => {
        const matrixPath = writeRiskMatrix([riskDomain({ id: 'ci-release-artifacts', runtimeEvidence: [] })])

        const result = runEvidenceRunner(['--matrix', matrixPath, '--domain', 'ci-release-artifacts'])

        expect(result.status).toBe(1)
        expect(result.stderr).toContain('ci-release-artifacts: runtimeEvidence must define at least one command')
    })

    it('fails closed when a risk-domain evidence command is not safe to execute', () => {
        const matrixPath = writeRiskMatrix([
            riskDomain({
                id: 'ci-release-artifacts',
                runtimeEvidence: ['node scripts/missing-risk-domain-command.mjs'],
            }),
        ])

        const result = runEvidenceRunner(['--matrix', matrixPath, '--domain', 'ci-release-artifacts'])

        expect(result.status).toBe(1)
        expect(result.stderr).toContain('unsupported or missing runtimeEvidence command')
    })

    it('tracks visual runtime evidence through a Playwright command', () => {
        const matrix = JSON.parse(readScript('risk-test-matrix.json')) as {
            domains: Array<{
                id: string
                failureModes: string[]
                requiredTestFiles: string[]
                runtimeEvidence: string[]
            }>
        }
        const visualDomain = matrix.domains.find((domain) => domain.id === 'visual-runtime-primary-routes')
        const runner = readScript('run-risk-domain-evidence.mjs')
        const visualSpec = readFileSync(join(REPO_ROOT, 'apps/storefront/e2e/runtime-visual-evidence.spec.ts'), 'utf8')

        expect(visualDomain).toBeDefined()
        expect(visualDomain?.requiredTestFiles).toContain('apps/storefront/e2e/runtime-visual-evidence.spec.ts')
        expect(visualDomain?.runtimeEvidence).toContain(
            'pnpm --filter=storefront exec playwright test e2e/runtime-visual-evidence.spec.ts'
        )
        expect(visualDomain?.failureModes).toEqual(
            expect.arrayContaining([
                expect.stringContaining('desktop/tablet/mobile'),
                expect.stringContaining('accessibility'),
                expect.stringContaining('loading, empty, error, modal or toast'),
                expect.stringContaining('order lookup'),
                expect.stringContaining('checkout method discovery'),
                expect.stringContaining('cart item update'),
                expect.stringContaining('cart hydration'),
            ])
        )
        expect(runner).toContain('isAllowedStorefrontPlaywrightCommand')
        expect(visualSpec).toContain('desktop')
        expect(visualSpec).toContain('tablet')
        expect(visualSpec).toContain('mobile')
        expect(visualSpec).toContain('axe-core')
        expect(visualSpec).toContain('screenshot')
    })

    it('tracks visible loading, modal and toast runtime states with dedicated evidence', () => {
        const visualSpec = readFileSync(join(REPO_ROOT, 'apps/storefront/e2e/runtime-visual-evidence.spec.ts'), 'utf8')
        const checkoutMethodEvidence = readFileSync(
            join(REPO_ROOT, 'apps/storefront/e2e/runtime-visual-checkout-method-evidence.ts'),
            'utf8'
        )
        const cartActionEvidence = readFileSync(
            join(REPO_ROOT, 'apps/storefront/e2e/runtime-visual-cart-action-evidence.ts'),
            'utf8'
        )
        const visualEvidenceSource = `${visualSpec}\n${checkoutMethodEvidence}\n${cartActionEvidence}`
        const orderLookupPage = readFileSync(
            join(REPO_ROOT, 'apps/storefront/src/app/[lang]/(shop)/pedido/page.tsx'),
            'utf8'
        )
        const promotionInput = readFileSync(
            join(REPO_ROOT, 'apps/storefront/src/components/checkout/PromotionInput.tsx'),
            'utf8'
        )
        const newsletterSignup = readFileSync(
            join(REPO_ROOT, 'apps/storefront/src/components/newsletter/NewsletterSignup.tsx'),
            'utf8'
        )
        const cartItem = readFileSync(
            join(REPO_ROOT, 'apps/storefront/src/components/cart/CartItem.tsx'),
            'utf8'
        )
        const toaster = readFileSync(
            join(REPO_ROOT, 'apps/storefront/src/components/ui/Toaster.tsx'),
            'utf8'
        )
        const checkoutPageClient = readFileSync(
            join(REPO_ROOT, 'apps/storefront/src/app/[lang]/(shop)/checkout/CheckoutPageClient.tsx'),
            'utf8'
        )

        expect(visualSpec).toContain("state: 'loading'")
        expect(visualSpec).toContain("state: 'modal'")
        expect(visualSpec).toContain("state: 'toast'")
        expect(visualSpec).toContain('runtimeLoadingStates')
        expect(visualSpec).toContain('assertVisibleLoadingState')
        expect(visualSpec).toContain('delayNextRuntimeVisualFetch')
        expect(visualSpec).toContain('newsletter-submit-loading')
        expect(visualSpec).toContain('/api/newsletter')
        expect(visualSpec).toContain('newsletter-submit-button')
        expect(visualSpec).toContain('newsletter-submit-spinner')
        expect(visualSpec).toContain('order-lookup-loading')
        expect(visualSpec).toContain('order-lookup-not-found')
        expect(visualSpec).toContain('/api/orders/lookup')
        expect(visualSpec).toContain('order-lookup-form')
        expect(visualSpec).toContain("toHaveAttribute('data-runtime-ready', 'true')")
        expect(visualSpec).toContain('assertMobileStickyCtaDoesNotOverlapBottomNav')
        expect(visualSpec).toContain("toBeVisible({ timeout: 10_000 })")
        expect(visualSpec).toContain('product-primary-cta')
        expect(visualSpec).toContain('.product-sticky-cta')
        expect(visualSpec).toContain('.bottom-nav')
        expect(visualSpec).toContain('order-lookup-submit')
        expect(visualSpec).toContain('order-lookup-spinner')
        expect(visualSpec).toContain('order-lookup-error')
        expect(visualSpec).toContain('visual-state-loading-order-lookup')
        expect(visualSpec).toContain('visual-state-error-order-lookup')
        expect(visualSpec).toContain('shouldRequireOrderLookupStates')
        expect(visualEvidenceSource).toContain('checkout-promotion-loading')
        expect(visualEvidenceSource).toContain('checkout-promotion-error')
        expect(visualEvidenceSource).toContain('/api/cart/promotions')
        expect(visualSpec).toContain('shouldRequireCheckoutStates')
        expect(visualSpec).toContain('BNS_RUNTIME_REQUIRE_CHECKOUT_STATES')
        expect(visualSpec).toContain('visual-state-loading-checkout-promotion')
        expect(visualSpec).toContain('visual-state-error-checkout-promotion')
        expect(visualEvidenceSource).toContain('checkout-methods-loading')
        expect(visualEvidenceSource).toContain('checkout-methods-error')
        expect(visualEvidenceSource).toContain('checkout-methods-retry')
        expect(visualSpec).toContain('checkout method discovery renders loading, error and retry evidence')
        expect(visualSpec).toContain('visual-state-loading-checkout-methods')
        expect(visualSpec).toContain('visual-state-error-checkout-methods')
        expect(visualEvidenceSource).toContain('delayNextCheckoutMethodAvailabilityAction')
        expect(visualEvidenceSource).toContain('CHECKOUT_METHOD_IDS')
        expect(visualEvidenceSource).toContain('request.headers()[\'next-action\']')
        expect(visualEvidenceSource).toContain('JSON.parse(body)')
        expect(visualEvidenceSource).toContain('args.length === 1')
        expect(visualSpec).toContain('does not submit an order or initialize a payment')
        expect(visualSpec).toContain('cleanupRuntimeEvidenceCart')
        expect(visualSpec).toContain(
            'async function cleanupRuntimeEvidenceCart(page: Page, state: CartItemUpdateRuntimeState)'
        )
        const cartCleanup = visualSpec.slice(
            visualSpec.indexOf('async function cleanupRuntimeEvidenceCart'),
            visualSpec.indexOf('async function prepareProductsRoute')
        )
        expect(cartCleanup).toContain('waitForHydratedRuntimeCartItem(page, state)')
        expect(cartCleanup).toContain('runtime evidence cart should hydrate before cleanup')
        expect(visualSpec).toContain('cart-item-update-loading')
        expect(visualSpec).toContain('cart-item-update-error')
        expect(visualSpec).toContain('cart-hydration-loading')
        expect(visualSpec).toContain('cart-hydration-error')
        expect(visualSpec).toContain('cart-hydration-retry')
        expect(visualSpec).toContain("localStorage.setItem('bns-cart-id', 'cart_runtime_evidence_unavailable')")
        expect(visualSpec).toContain('visual-state-loading-cart-hydration')
        expect(visualSpec).toContain('visual-state-error-cart-hydration')
        expect(visualSpec).toContain('cart hydration renders loading, error and retry evidence')
        expect(visualSpec).toContain('cart-drawer-hydration-loading')
        expect(visualSpec).toContain('cart-drawer-hydration-error')
        expect(visualSpec).toContain('cart-drawer-hydration-retry')
        expect(visualSpec).toContain('cart-item-remove-loading')
        expect(visualSpec).toContain('cart-item-remove-error')
        expect(visualSpec).toContain('shouldRequireCartStates')
        expect(visualSpec).toContain('BNS_RUNTIME_REQUIRE_CART_STATES')
        expect(visualEvidenceSource).toContain('delayNextCartAction')
        expect(visualSpec).toContain('RUNTIME_CART_SETUP_MAX_ATTEMPTS')
        expect(visualSpec).toContain('RUNTIME_CART_HYDRATION_MAX_ATTEMPTS')
        expect(visualSpec).toContain('addRuntimeEvidenceProductToCart')
        expect(visualSpec).toContain('waitForHydratedRuntimeCartItem')
        expect(visualSpec).toContain('checkout promotion and cart item update/remove render runtime evidence')
        expect(visualSpec).toContain('visual-state-loading-cart-item-update')
        expect(visualSpec).toContain('visual-state-error-cart-item-update')
        expect(visualSpec).toContain('visual-state-loading-cart-item-remove')
        expect(visualSpec).toContain('visual-state-error-cart-item-remove')
        expect(visualSpec).toContain('toHaveAccessibleName')
        expect(visualSpec).toContain('cart-item-remove')
        expect(visualSpec).toContain('cart-item-remove-spinner')
        expect(visualSpec).toContain('cart-item-increase')
        expect(visualSpec).toContain('cart-item-increase-spinner')
        expect(visualSpec).toContain('toast-error')
        expect(visualSpec).toContain('[data-testid="add-to-cart"]:visible')
        const cartCreationSetup = visualSpec.slice(
            visualSpec.indexOf('async function addRuntimeEvidenceProductToCart'),
            visualSpec.indexOf('async function waitForHydratedRuntimeCartItem')
        )
        expect(cartCreationSetup).toContain("localStorage.getItem('bns-cart-id')")
        expect(cartCreationSetup).not.toContain('await expect(addToCart).toContainText')
        expect(visualSpec).toContain("route.request().method() !== 'POST'")
        expect(visualSpec).toContain('waitUntilIntercepted')
        expect(visualSpec).toContain(".waitFor({ state: 'visible', timeout: 20_000 })")
        expect(visualSpec).toContain('cart-drawer')
        expect(visualSpec).toContain('product.quickView')
        expect(visualSpec).toContain('visual-state-loading')
        expect(visualSpec).toContain('visual-state-modal')
        expect(visualSpec).toContain('visual-state-toast')
        expect(visualSpec).toContain('BNS_RUNTIME_REQUIRE_INTERACTIVE_STATES')
        expect(visualSpec).toContain('interactive state evidence requires product runtime data')
        expect(visualSpec).toContain("page.locator('article').first()")
        expect(visualSpec).toContain('await expect(quickViewButton).toBeEnabled')
        expect(visualSpec).toContain('apps/storefront/src/app/[lang]/(shop)/carrito/loading.tsx')
        expect(visualSpec).toContain('apps/storefront/src/app/[lang]/(shop)/checkout/loading.tsx')
        expect(visualSpec).toContain('apps/storefront/src/app/[lang]/(shop)/productos/[handle]/loading.tsx')
        expect(orderLookupPage).toContain('htmlFor="order-lookup-email"')
        expect(orderLookupPage).toContain('id="order-lookup-email"')
        expect(orderLookupPage).toContain('htmlFor="order-lookup-id"')
        expect(orderLookupPage).toContain('id="order-lookup-id"')
        expect(orderLookupPage).toContain('data-testid="order-lookup-form"')
        expect(orderLookupPage).toContain('data-runtime-ready="false"')
        expect(orderLookupPage).toContain("setAttribute('data-runtime-ready', 'true')")
        expect(orderLookupPage).toContain('text-red-700 dark:text-red-300')
        expect(orderLookupPage).not.toContain('text-sm text-red-400')
        expect(orderLookupPage).toContain('role="alert"')
        expect(promotionInput).toContain('data-testid="checkout-promotion-form"')
        expect(promotionInput).toContain('data-testid="checkout-promotion-toggle"')
        expect(promotionInput).toContain('data-testid="checkout-promotion-input"')
        expect(promotionInput).toContain('data-testid="checkout-promotion-apply"')
        expect(promotionInput).toContain('data-testid="checkout-promotion-spinner"')
        expect(promotionInput).toContain('data-testid="checkout-promotion-error"')
        expect(promotionInput).toContain("aria-label={t('promotions.apply')")
        expect(promotionInput).toContain('aria-hidden="true"')
        expect(promotionInput).toContain('data-runtime-ready="false"')
        expect(promotionInput).toContain("setAttribute('data-runtime-ready', 'true')")
        expect(promotionInput).toContain('role="alert"')
        expect(newsletterSignup).toContain('data-testid="newsletter-signup-form"')
        expect(newsletterSignup).toContain('data-runtime-ready="false"')
        expect(newsletterSignup).toContain("setAttribute('data-runtime-ready', 'true')")
        expect(cartItem).toContain('data-testid="cart-item-remove"')
        expect(cartItem).toContain('data-testid="cart-item-remove-spinner"')
        expect(cartItem).toContain('data-testid="cart-item-increase"')
        expect(cartItem).toContain('data-testid="cart-item-increase-spinner"')
        expect(cartItem).toContain('catch')
        expect(cartItem).toContain('finally')
        expect(cartItem).toContain('aria-busy={isPending}')
        expect(cartItem).not.toContain("isPending ? 'opacity-60'")
        expect(cartItem).toContain("aria-label={t('cart.drawer.decreaseQuantity')")
        expect(cartItem).toContain("aria-label={t('cart.drawer.increaseQuantity')")
        expect(toaster).toContain('data-testid={`toast-${toast.type}`}')
        expect(checkoutPageClient).toContain("aria-label={t('common.back')}")
    })

    it('stabilizes motion before runtime visual screenshots and axe scans', () => {
        const visualSpec = readFileSync(join(REPO_ROOT, 'apps/storefront/e2e/runtime-visual-evidence.spec.ts'), 'utf8')

        expect(visualSpec).toContain('async function stabilizeRuntimeEvidencePage')
        expect(visualSpec).toContain('data-runtime-evidence-stable-motion')
        expect(visualSpec).toContain('animation: none !important')
        expect(visualSpec).toContain('transition: none !important')
        expect(visualSpec).toContain('await stabilizeRuntimeEvidencePage(page)')
    })

    it('retries transient runtime route throttling before visual assertions', () => {
        const visualSpec = readFileSync(join(REPO_ROOT, 'apps/storefront/e2e/runtime-visual-evidence.spec.ts'), 'utf8')

        expect(visualSpec).toContain('async function gotoRuntimeVisualRouteWithBackoff')
        expect(visualSpec).toContain('isRetriableRuntimeVisualStatus')
        expect(visualSpec).toContain('status === 429')
        expect(visualSpec).toContain('BNS_RUNTIME_ROUTE_RETRY_MAX_ATTEMPTS')
        expect(visualSpec).toContain('BNS_RUNTIME_ROUTE_RETRY_MAX_TOTAL_WAIT_MS')
        expect(visualSpec).toContain('maxDelayMs: parsePositiveInteger(env.BNS_RUNTIME_ROUTE_RETRY_MAX_DELAY_MS, 65_000)')
        expect(visualSpec).toContain('maxTotalWaitMs: parsePositiveInteger(env.BNS_RUNTIME_ROUTE_RETRY_MAX_TOTAL_WAIT_MS, 75_000)')
        expect(visualSpec).toContain('test.setTimeout(240_000)')
        expect(visualSpec).toContain('await gotoRuntimeVisualRouteWithBackoff(page, productPath, [200])')
    })

    it('prepares CI to execute local PR and exact-deploy push runtime evidence', () => {
        const workflow = readWorkflow('ci.yml')
        const runner = readScript('run-risk-domain-evidence.mjs')
        const riskDomainEvidenceStep = workflow
            .split(/\n(?= {6}- name: )/)
            .find((step) => step.startsWith('      - name: Risk Domain Evidence\n'))

        expect(workflow).toContain('name: Install Playwright Chromium')
        expect(workflow).toContain('pnpm --filter=storefront exec playwright install --with-deps chromium')
        expect(riskDomainEvidenceStep).toBeDefined()
        expect(riskDomainEvidenceStep).toContain("CI: ''")
        expect(riskDomainEvidenceStep).toContain(
            "BNS_RUNTIME_REQUIRE_ORDER_LOOKUP_STATES: ${{ github.event_name == 'push' && '1' || '0' }}"
        )
        expect(riskDomainEvidenceStep).toContain(
            "BNS_RUNTIME_REQUIRE_CHECKOUT_STATES: ${{ github.event_name == 'push' && '1' || '0' }}"
        )
        expect(riskDomainEvidenceStep).toContain(
            "BNS_RUNTIME_REQUIRE_CART_STATES: ${{ github.event_name == 'push' && '1' || '0' }}"
        )
        expect(riskDomainEvidenceStep).toContain(
            "BNS_360_BASE_URL: ${{ github.event_name == 'push' && format('https://{0}', vars.STORE_DOMAIN) || 'http://localhost:3000' }}"
        )
        expect(riskDomainEvidenceStep).toContain(
            'NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}'
        )
        expect(riskDomainEvidenceStep).toContain(
            'TENANT_ID: ${{ vars.TENANT_ID }}'
        )
        expect(riskDomainEvidenceStep).toContain(
            'NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}'
        )
        expect(runner).toContain("'NEXT_PUBLIC_SUPABASE_ANON_KEY'")
        expect(runner).toContain("'BNS_RUNTIME_REQUIRE_ORDER_LOOKUP_STATES'")
        expect(runner).toContain("'BNS_RUNTIME_REQUIRE_CHECKOUT_STATES'")
        expect(runner).toContain("'BNS_RUNTIME_REQUIRE_CART_STATES'")
        expect(runner).toContain("env.NEXT_PUBLIC_SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'")
    })

    it('writes an auditable risk-domain evidence summary without secrets', () => {
        const tmp = mkdtempSync(join(tmpdir(), 'risk-domain-evidence-summary-'))
        const matrixPath = writeRiskMatrix([riskDomain({ id: 'ci-release-artifacts' })])
        const summaryPath = join(tmp, 'summary.json')

        const result = runEvidenceRunner(
            ['--matrix', matrixPath, '--domain', 'ci-release-artifacts'],
            {
                RISK_DOMAIN_EVIDENCE_SUMMARY_PATH: summaryPath,
                STRIPE_SECRET_KEY: 'sk_live_must_not_persist',
                API_TOKEN: 'secret-token-must-not-persist',
            }
        )

        expect(result.status).toBe(0)
        expect(existsSync(summaryPath)).toBe(true)

        const summaryText = readFileSync(summaryPath, 'utf8')
        expect(summaryText).not.toContain('sk_live_must_not_persist')
        expect(summaryText).not.toContain('secret-token-must-not-persist')

        const summary = JSON.parse(summaryText) as {
            schema: string
            status: string
            domains: Array<{ id: string; commands: Array<{ command: string; status: string }> }>
        }

        expect(summary).toMatchObject({
            schema: 'bootandstrap.risk-domain-evidence.summary/v1',
            status: 'passed',
            domains: [
                {
                    id: 'ci-release-artifacts',
                    commands: [
                        {
                            command: 'node scripts/check-risk-test-matrix.mjs',
                            status: 'passed',
                        },
                    ],
                },
            ],
        })
    })

    it('uploads risk-domain visual evidence artifacts in GitHub CI with fail-closed missing files', () => {
        const workflow = readWorkflow('ci.yml')
        const artifactBlocks = uploadArtifactBlocks(workflow)
        const riskEvidenceUpload = artifactBlocks.find((block) => block.includes('name: risk-domain-evidence'))

        expect(riskEvidenceUpload).toBeDefined()
        expect(riskEvidenceUpload).toContain('.artifacts/risk-domain-evidence/')
        expect(riskEvidenceUpload).toContain('apps/storefront/test-results/')
        expect(riskEvidenceUpload).toContain('apps/storefront/playwright-report/')
        expect(riskEvidenceUpload).toContain('if-no-files-found: error')
        expect(riskEvidenceUpload).toContain('retention-days: 14')
    })
})
