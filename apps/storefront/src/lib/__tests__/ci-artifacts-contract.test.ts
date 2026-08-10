import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const REPO_ROOT = resolve(process.cwd(), '..', '..')
const TEMPLATE_SYNC_IGNORE_VALIDATOR = 'scripts/ci/validate-template-sync-ignore.mjs'

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

function resolveTemplateSyncRepos(tenants: unknown) {
    return spawnSync(
        process.execPath,
        [join(REPO_ROOT, 'scripts', 'ci', 'resolve-template-sync-repos.mjs')],
        {
            cwd: REPO_ROOT,
            encoding: 'utf8',
            input: JSON.stringify(tenants),
        }
    )
}

function validateTemplateSyncIgnore(content?: string) {
    const policyPath = join(
        mkdtempSync(join(tmpdir(), 'template-sync-ignore-')),
        '.templatesyncignore'
    )

    if (content !== undefined) {
        writeFileSync(policyPath, content)
    }

    return spawnSync(
        process.execPath,
        [
            join(REPO_ROOT, TEMPLATE_SYNC_IGNORE_VALIDATOR),
            policyPath,
        ],
        {
            cwd: REPO_ROOT,
            encoding: 'utf8',
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

    it('runs revision-bound fail-closed coverage assurance in CI and the release gate', () => {
        const workflow = readWorkflow('ci.yml')
        const releaseGate = readScript('release-gate.sh')
        const storefrontRunner = readScript('run-storefront-assurance.mjs')

        expect(workflow).toContain('node scripts/run-assurance-coverage.mjs')
        expect(workflow).toContain('.artifacts/assurance/coverage-assurance.json')
        expect(workflow).toContain('if-no-files-found: error')
        expect(releaseGate).toContain('exec node "$ROOT_DIR/scripts/run-assurance.mjs" --profile full "$@"')
        const runner = readScript('run-assurance-coverage.mjs')
        expect(runner).toContain('validateStorefrontEvidenceReceipt')
        expect(runner).toContain('validateCoverageEvidence')
        expect(storefrontRunner).toContain("'--no-file-parallelism'")
        expect(storefrontRunner).toContain("'--maxWorkers=1'")
        expect(storefrontRunner).toContain('workingTreeSha256')
        expect(storefrontRunner).toContain('inputsSha256')
    })

    it('runs the POS module persistence journey against PostgreSQL in Medusa CI', () => {
        const workflow = readWorkflow('ci.yml')
        const medusaJob = workflow
            .split('\n  # ── Medusa Backend Tests ────────────────────────\n')[1]
            ?.split('\n  # ── E2E Tests (Playwright) ─────────────────────\n')[0]

        expect(medusaJob).toBeDefined()
        expect(medusaJob).toContain('image: postgres:16-alpine')
        expect(medusaJob).toContain('POSTGRES_HOST_AUTH_METHOD: trust')
        expect(medusaJob).toContain('pnpm -C apps/medusa test:integration:modules')
        expect(medusaJob).toContain('DB_HOST: localhost')
        expect(medusaJob).toContain('DB_USERNAME: postgres')
    })

    it('bounds the post-deploy Lighthouse audit runtime', () => {
        const workflow = readWorkflow('lighthouse-ci.yml')

        expect(workflow).toMatch(/\n\s+lighthouse:\n(?:.*\n){1,8}\s+timeout-minutes:\s*15\n/)
    })

    it('runs PR E2E evidence without requiring a catalog-backed Medusa stack', () => {
        const workflow = readWorkflow('ci.yml')
        const e2eJob = workflow
            .split('\n  # ── E2E Tests (Playwright) ─────────────────────\n')[1]
            ?.split('\n  # ── Lighthouse CI ──────────────────────────────\n')[0]

        expect(e2eJob).toBeDefined()
        expect(e2eJob).toContain('name: Run PR-local runtime visual evidence')
        expect(e2eJob).toContain('playwright test e2e/runtime-visual-evidence.spec.ts')
        expect(e2eJob).toContain("BNS_RUNTIME_REQUIRE_INTERACTIVE_STATES: '0'")
        expect(e2eJob).toContain('bash ../../../../scripts/ci/wait-for-health.sh')
        expect(e2eJob).not.toContain('services:')
        expect(e2eJob).not.toContain('scripts/ci/start-medusa-stack.sh')
        expect(e2eJob).not.toContain('secrets.TEST_TENANT_ID')
        expect(e2eJob).not.toContain('secrets.TEST_SUPABASE_URL')
        expect(e2eJob).not.toContain('secrets.TEST_SUPABASE_ANON_KEY')
        expect(e2eJob).not.toContain('secrets.TEST_MEDUSA_KEY')
    })

    it('uses the pinned Lighthouse action already proven by the dedicated audit workflow', () => {
        const workflow = readWorkflow('ci.yml')
        const lighthouseJob = workflow
            .split('\n  # ── Lighthouse CI ──────────────────────────────\n')[1]
            ?.split('\n  # ── Failure Notification ────────────────────────\n')[0]

        expect(lighthouseJob).toBeDefined()
        expect(lighthouseJob).toContain('uses: treosh/lighthouse-ci-action@v12')
        expect(lighthouseJob).toContain('configPath: ./apps/storefront/lighthouserc.json')
        expect(lighthouseJob).not.toContain('@lhci/cli@latest')
        expect(lighthouseJob).not.toContain('lhci autorun')
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

        expect(releaseGate).toContain('run-assurance.mjs" --profile full')
        expect(readScript('assurance-tasks.json')).toContain('"id": "risk-test-matrix"')
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

        const posDomain = matrix.domains.find((domain) => domain.id === 'pos-simulator')
        expect(posDomain?.requiredTestFiles).toEqual(expect.arrayContaining([
            'apps/storefront/src/lib/bns-360/__tests__/pos-primary-journey.test.ts',
            'apps/storefront/src/lib/pos/__tests__/medusa-pos-module.behavior.test.ts',
            'apps/storefront/src/lib/pos/customers/__tests__/customer-refund.test.ts',
            'apps/storefront/src/lib/pos/refunds/__tests__/refund-actions.behavior.test.ts',
            'apps/storefront/src/lib/pos/shifts/__tests__/shift-actions.behavior.test.ts',
            'apps/storefront/src/lib/pos/offline/__tests__/product-sync.behavior.test.ts',
            'apps/storefront/src/lib/pos/history/__tests__/history.test.ts',
            'apps/storefront/src/lib/pos/__tests__/use-barcode-scanner.behavior.test.ts',
            'apps/storefront/src/lib/pos/__tests__/use-pos-sounds.behavior.test.ts',
            'apps/storefront/src/lib/pos/__tests__/use-printer-connection.behavior.test.ts',
            'apps/storefront/src/lib/pos/history/__tests__/sales-history.behavior.test.ts',
            'apps/storefront/src/lib/pos/history/__tests__/daily-stats.behavior.test.ts',
        ]))
        expect(posDomain?.runtimeEvidence.join('\n')).toContain('pos-primary-journey.test.ts')
        expect(posDomain?.runtimeEvidence.join('\n')).toContain('medusa-pos-module.behavior.test.ts')
        expect(posDomain?.runtimeEvidence.join('\n')).toContain('customer-refund.test.ts')
        expect(posDomain?.runtimeEvidence.join('\n')).toContain('refund-actions.behavior.test.ts')
        expect(posDomain?.runtimeEvidence.join('\n')).toContain('shift-actions.behavior.test.ts')
        expect(posDomain?.runtimeEvidence.join('\n')).toContain('product-sync.behavior.test.ts')
        expect(posDomain?.runtimeEvidence.join('\n')).toContain('history.test.ts')
        expect(posDomain?.runtimeEvidence.join('\n')).toContain('use-barcode-scanner.behavior.test.ts')
        expect(posDomain?.runtimeEvidence.join('\n')).toContain('use-pos-sounds.behavior.test.ts')
        expect(posDomain?.runtimeEvidence.join('\n')).toContain('use-printer-connection.behavior.test.ts')
        expect(posDomain?.runtimeEvidence.join('\n')).toContain('sales-history.behavior.test.ts')
        expect(posDomain?.runtimeEvidence.join('\n')).toContain('daily-stats.behavior.test.ts')
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

        expect(releaseGate).toContain('run-assurance.mjs" --profile full')
        expect(readScript('assurance-tasks.json')).toContain('"id": "risk-domain-evidence"')
        expect(workflow).toContain('name: Risk Domain Evidence')
        expect(workflow).toContain('node scripts/run-risk-domain-evidence.mjs')
        expect(runner).toContain('risk-test-matrix.json')
    })

    it('provides an isolated read-only dispatch mode for exact full assurance evidence', () => {
        const workflow = readWorkflow('governance-gate.yml')
        const localAssurance = workflow.slice(
            workflow.indexOf('  local-assurance:'),
            workflow.indexOf('  summary:')
        )

        expect(workflow).toContain('assurance_only:')
        expect(workflow).toContain('permissions:\n  contents: read')
        for (const job of [
            'shared-package-tests',
            'governance-drift',
            'architecture-gate',
            'medusa-typecheck',
        ]) {
            expect(workflow).toContain(
                `  ${job}:\n` +
                "    if: github.event_name != 'workflow_dispatch' || !inputs.assurance_only"
            )
        }
        expect(localAssurance).toContain(
            "if: github.event_name == 'workflow_dispatch' && inputs.assurance_only"
        )
        expect(localAssurance).toContain('persist-credentials: false')
        expect(localAssurance).toContain('uses: actions/checkout@v7')
        expect(localAssurance).toContain('uses: pnpm/action-setup@v6')
        expect(localAssurance).toContain('uses: actions/setup-node@v7')
        expect(localAssurance).toContain('uses: actions/upload-artifact@v7')
        expect(localAssurance).not.toMatch(
            /uses: (?:actions\/(?:checkout|setup-node|upload-artifact)|pnpm\/action-setup)@v4/
        )
        expect(localAssurance).toContain('node-version: 24')
        expect(localAssurance).toContain(
            'astral-sh/setup-uv@08807647e7069bb48b6ef5acd8ec9567f424441b # v8.1.0'
        )
        expect(localAssurance).toContain("version: '0.9.15'")
        expect(localAssurance).toContain('pnpm install --frozen-lockfile')
        expect(localAssurance).toContain(
            'pnpm --filter=storefront exec playwright install --with-deps chromium'
        )
        expect(localAssurance).toContain('pnpm assurance:full -- --no-cache')
        expect(localAssurance).toContain("CI: ''")
        expect(localAssurance).toContain('node scripts/verify-ci-assurance-evidence.mjs')
        expect(localAssurance).toContain('name: assurance-full-${{ github.sha }}')
        expect(localAssurance).toContain('if-no-files-found: error')
        expect(localAssurance).toContain('retention-days: 14')
        expect(localAssurance).not.toMatch(/secrets\.|environment:|deploy|publish|curl\s/)
    })

    it('triggers template propagation when reusable runtime evidence changes', () => {
        const workflow = readWorkflow('template-sync.yml')
        const publishSharedWorkflow = readWorkflow('publish-shared.yml')
        const ignorePolicy = readFileSync(join(REPO_ROOT, '.templatesyncignore'), 'utf8')
        const triggerPaths = workflow.slice(
            workflow.indexOf('    paths:'),
            workflow.indexOf('  workflow_dispatch:')
        )
        const checkoutTarget = workflow.slice(
            workflow.indexOf('- name: Checkout target tenant'),
            workflow.indexOf('- name: Template Sync')
        )
        const templateSyncAction = workflow.slice(
            workflow.indexOf('- name: Template Sync'),
            workflow.indexOf('- name: Dry Run Log')
        )
        const resolverSourceCheckout = workflow.slice(
            workflow.indexOf('- name: Checkout canonical template'),
            workflow.indexOf('- name: Query tenant repos from Supabase')
        )
        const syncPolicyCheckout = workflow.slice(
            workflow.indexOf('- name: Checkout canonical sync policy'),
            workflow.indexOf('- name: Preserve fail-closed sync policy validator')
        )
        const sourcePolicyCheckout = workflow.indexOf('- name: Checkout canonical sync policy')
        const preserveValidator = workflow.indexOf(
            '- name: Preserve fail-closed sync policy validator'
        )
        const targetCheckout = workflow.indexOf('- name: Checkout target tenant')
        const validateTargetPolicy = workflow.indexOf(
            '- name: Validate target template sync policy'
        )
        const templateSync = workflow.indexOf('- name: Template Sync')

        for (const path of [
            'apps/storefront/src/components/checkout/**',
            'apps/storefront/src/components/cart/**',
            'apps/storefront/src/components/newsletter/**',
            'apps/storefront/src/components/ui/**',
            'apps/storefront/src/contexts/**',
            'apps/storefront/src/app/*/(shop)/checkout/**',
            'apps/storefront/src/app/*/(shop)/carrito/**',
            'apps/storefront/src/app/*/(shop)/pedido/**',
            'apps/storefront/src/app/*/(shop)/productos/**',
            'apps/storefront/e2e/**',
            'apps/storefront/playwright.config.ts',
            'scripts/**',
            '.github/workflows/**',
        ]) {
            expect(triggerPaths).toContain(`- '${path}'`)
        }

        expect(triggerPaths).not.toContain('[lang]')
        expect(triggerPaths).not.toContain("- '.templatesyncignore'")
        expect(workflow.indexOf('    paths:')).toBeGreaterThan(-1)
        expect(workflow.indexOf('  workflow_dispatch:')).toBeGreaterThan(
            workflow.indexOf('    paths:')
        )
        expect(workflow.indexOf('- name: Checkout target tenant')).toBeGreaterThan(-1)
        expect(workflow.indexOf('- name: Template Sync')).toBeGreaterThan(
            workflow.indexOf('- name: Checkout target tenant')
        )
        expect(sourcePolicyCheckout).toBeGreaterThan(-1)
        expect(preserveValidator).toBeGreaterThan(sourcePolicyCheckout)
        expect(targetCheckout).toBeGreaterThan(preserveValidator)
        expect(validateTargetPolicy).toBeGreaterThan(targetCheckout)
        expect(templateSync).toBeGreaterThan(validateTargetPolicy)
        expect(checkoutTarget).toContain('repository: ${{ matrix.repo }}')
        expect(checkoutTarget).toContain('ref: main')
        expect(checkoutTarget).toContain('token: ${{ github.token }}')
        expect(checkoutTarget).not.toContain('secrets.TEMPLATE_SYNC_PAT')
        expect(checkoutTarget).toContain('persist-credentials: false')
        for (const canonicalCheckout of [resolverSourceCheckout, syncPolicyCheckout]) {
            expect(canonicalCheckout).toContain(
                'repository: bootandstrap/storefront-template'
            )
            expect(canonicalCheckout).toContain('ref: main')
            expect(canonicalCheckout).toContain('persist-credentials: false')
        }
        expect(workflow).toContain('source_repo_path: bootandstrap/storefront-template')
        expect(templateSyncAction).toContain(
            'target_gh_token: ${{ secrets.TEMPLATE_SYNC_PAT }}'
        )
        expect(workflow.match(/secrets\.TEMPLATE_SYNC_PAT/g)).toHaveLength(1)
        expect(workflow).toContain('permissions:\n  contents: read')
        expect(workflow).toContain('node scripts/ci/resolve-template-sync-repos.mjs')
        expect(workflow).toContain(
            'node "$RUNNER_TEMP/validate-template-sync-ignore.mjs" .templatesyncignore'
        )
        expect(publishSharedWorkflow).toContain(
            "if: github.repository == 'bootandstrap/storefront-template'"
        )
        expect(publishSharedWorkflow).toContain(
            "github.repository == 'bootandstrap/storefront-template' &&"
        )

        for (const protectedPath of [
            'apps/storefront/src/app/globals.css',
            'apps/storefront/src/components/home/',
            'apps/storefront/src/components/layout/Header.tsx',
            'apps/storefront/src/components/layout/Footer.tsx',
            'apps/storefront/src/lib/i18n/dictionaries/',
            'apps/storefront/public/',
            ':(literal)apps/storefront/src/app/[lang]/(shop)/page.tsx',
            '.templatesyncignore',
        ]) {
            expect(ignorePolicy).toContain(protectedPath)
        }
    })

    it('allows only deduplicated tenant repositories in the authorized namespace', () => {
        const result = resolveTemplateSyncRepos([
            { github_repo_url: 'https://github.com/bootandstrap/store-tenant-1-0-test' },
            { github_repo_url: 'https://github.com/bootandstrap/store-tenant-1-0-test/' },
            { github_repo_url: 'https://github.com/bootandstrap/store-tenant-2' },
        ])

        expect(result.status).toBe(0)
        expect(JSON.parse(result.stdout)).toEqual({
            repos: [
                'bootandstrap/store-tenant-1-0-test',
                'bootandstrap/store-tenant-2',
            ],
            count: 2,
        })
    })

    it('normalizes repository casing before deduplicating sync targets', () => {
        const result = resolveTemplateSyncRepos([
            { github_repo_url: 'https://github.com/bootandstrap/Store-Tenant-1' },
            { github_repo_url: 'https://github.com/bootandstrap/store-tenant-1' },
        ])

        expect(result.status).toBe(0)
        expect(JSON.parse(result.stdout)).toEqual({
            repos: ['bootandstrap/store-tenant-1'],
            count: 1,
        })
    })

    it.each([
        'https://github.com/untrusted/store-tenant',
        'http://github.com/bootandstrap/store-tenant',
        'https://github.com:444/bootandstrap/store-tenant',
        'https://example.com/bootandstrap/store-tenant',
        'https://github.com/bootandstrap/store-tenant/issues',
        'https://github.com/bootandstrap/store-tenant?tab=readme',
        'https://github.com/bootandstrap/store-tenant.git',
    ])('fails closed before using the sync PAT for %s', (githubRepoUrl) => {
        const result = resolveTemplateSyncRepos([{ github_repo_url: githubRepoUrl }])

        expect(result.status).toBe(1)
        expect(result.stderr).toContain('authorized namespace')
    })

    it('accepts the canonical target template sync ignore policy', () => {
        const result = validateTemplateSyncIgnore(
            readFileSync(join(REPO_ROOT, '.templatesyncignore'), 'utf8')
        )

        expect(result.status).toBe(0)
        expect(result.stdout).toContain('policy valid')
    })

    it('fails closed when the target template sync ignore policy is missing', () => {
        const result = validateTemplateSyncIgnore()

        expect(result.status).toBe(1)
        expect(result.stderr).toContain('policy file is required')
    })

    it('fails closed when a mandatory customize zone is missing', () => {
        const policy = readFileSync(join(REPO_ROOT, '.templatesyncignore'), 'utf8')
            .replace('apps/storefront/src/app/globals.css\n', '')
        const result = validateTemplateSyncIgnore(policy)

        expect(result.status).toBe(1)
        expect(result.stderr).toContain('must match the authorized customize policy')
    })

    it('fails closed when the target excludes platform-owned code', () => {
        const policy = [
            readFileSync(join(REPO_ROOT, '.templatesyncignore'), 'utf8'),
            'apps/storefront/src/lib/**',
        ].join('\n')
        const result = validateTemplateSyncIgnore(policy)

        expect(result.status).toBe(1)
        expect(result.stderr).toContain('must match the authorized customize policy')
    })

    it('requires exact storefront receipt validation before direct risk evidence', () => {
        const runner = readScript('run-risk-domain-evidence.mjs')

        expect(runner).toContain('validateStorefrontEvidenceReceipt')
        expect(runner).toContain('storefront assurance receipt')
        expect(runner).toContain('resolveTaskIdentity')
    })

    it('selects every declared domain when no domain filter is provided', () => {
        const runner = readScript('run-risk-domain-evidence.mjs')

        expect(runner).toContain('if (!requestedDomain) return matrix.domains')
        expect(runner).toContain('planRiskDomainEvidence({ ...matrix, domains }, testsArtifact)')
    })

    it('fails closed when a requested risk domain does not exist', () => {
        const matrixPath = writeRiskMatrix([riskDomain({ id: 'ci-release-artifacts' })])

        const result = runEvidenceRunner(['--matrix', matrixPath, '--domain', 'missing-domain'])

        expect(result.status).toBe(1)
        expect(result.stderr).toContain('unknown risk domain: missing-domain')
    })

    it('fails closed when risk-domain runtime evidence is not defined', () => {
        const runner = readScript('run-risk-domain-evidence.mjs')

        expect(runner).toContain('runtimeEvidence must define at least one command')
    })

    it('fails closed when a risk-domain evidence command is not safe to execute', () => {
        const runner = readScript('run-risk-domain-evidence.mjs')

        expect(runner).toContain('unsupported runtimeEvidence command')
        expect(runner).toContain('unsafe or unsupported evidence path')
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
                expect.stringContaining('serializes independent server reads'),
            ])
        )
        expect(visualDomain?.requiredTestFiles).toContain(
            'apps/storefront/src/components/products/__tests__/product-listing-page-performance-contract.test.ts'
        )
        expect(visualDomain?.runtimeEvidence).toContain(
            'pnpm --filter=storefront exec vitest run src/components/products/__tests__/product-listing-page-performance-contract.test.ts'
        )
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
        expect(cartCleanup).toContain('const removed = await expect.poll')
        expect(cartCleanup).toContain('if (!removed)')
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
        expect(runner).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder'")
        expect(runner).toContain('return { ...SAFE_ENV_DEFAULTS, ...passthrough }')
    })

    it('treats missing reusable product runtime data as unavailable instead of a hard failure for PR-only interactive evidence', () => {
        const visualSpec = readFileSync(join(REPO_ROOT, 'apps/storefront/e2e/runtime-visual-evidence.spec.ts'), 'utf8')

        expect(visualSpec).toContain(
            'interactive state evidence requires product runtime data; no product cards were rendered'
        )
        expect(visualSpec).toContain(
            "await testInfo.attach(`visual-state-${state.state}-${state.name}-${viewport.name}-runtime-unavailable`"
        )
        expect(visualSpec).toContain('return { available: false, reason }')
        expect(visualSpec).not.toContain(
            "await expect(firstCard).toBeVisible({ timeout: 20_000 })\n\n    return { available: true }"
        )
    })

    it('treats missing reusable product runtime data as unavailable instead of a hard failure for PR-only primary products route evidence', () => {
        const visualSpec = readFileSync(join(REPO_ROOT, 'apps/storefront/e2e/runtime-visual-evidence.spec.ts'), 'utf8')

        expect(visualSpec).toContain(
            'primary products route visual evidence requires product runtime data; no product cards were rendered'
        )
        expect(visualSpec).toContain('visual-products-${viewport.name}-runtime-unavailable')
        expect(visualSpec).toContain("if (route.name === 'products')")
        expect(visualSpec).toContain('test.skip(true, availability.reason)')
    })

    it('writes an auditable risk-domain evidence summary without secrets', () => {
        const runner = readScript('run-risk-domain-evidence.mjs')
        expect(runner).toContain('bootandstrap.risk-domain-evidence.summary/v1')
        expect(runner).toContain('executedCommands')
        expect(runner).toContain('reusedCommands')
        expect(runner).toContain('writeJsonAtomic(summaryPath')
        expect(runner).not.toContain('STRIPE_SECRET_KEY')
        expect(runner).not.toContain('API_TOKEN')
    })

    it('uploads the authoritative risk-domain summary and optional visual outputs in GitHub CI', () => {
        const workflow = readWorkflow('ci.yml')
        const artifactBlocks = uploadArtifactBlocks(workflow)
        const riskEvidenceUpload = artifactBlocks.find((block) => block.includes('name: risk-domain-evidence'))

        expect(riskEvidenceUpload).toBeDefined()
        expect(riskEvidenceUpload).toContain('.artifacts/assurance/risk-domain-evidence.json')
        expect(riskEvidenceUpload).not.toContain('.artifacts/risk-domain-evidence/')
        expect(riskEvidenceUpload).toContain('apps/storefront/test-results/')
        expect(riskEvidenceUpload).toContain('apps/storefront/playwright-report/')
        expect(riskEvidenceUpload).toContain('if-no-files-found: error')
        expect(riskEvidenceUpload).toContain('retention-days: 14')
    })
})
