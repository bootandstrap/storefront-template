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

        expect(visualSpec).toContain("state: 'loading'")
        expect(visualSpec).toContain("state: 'modal'")
        expect(visualSpec).toContain("state: 'toast'")
        expect(visualSpec).toContain('loadingStateSources')
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
    })

    it('stabilizes motion before runtime visual screenshots and axe scans', () => {
        const visualSpec = readFileSync(join(REPO_ROOT, 'apps/storefront/e2e/runtime-visual-evidence.spec.ts'), 'utf8')

        expect(visualSpec).toContain('async function stabilizeRuntimeEvidencePage')
        expect(visualSpec).toContain('data-runtime-evidence-stable-motion')
        expect(visualSpec).toContain('animation: none !important')
        expect(visualSpec).toContain('transition: none !important')
        expect(visualSpec).toContain('await stabilizeRuntimeEvidencePage(page)')
    })

    it('prepares CI to execute visual runtime evidence locally', () => {
        const workflow = readWorkflow('ci.yml')
        const runner = readScript('run-risk-domain-evidence.mjs')

        expect(workflow).toContain('name: Install Playwright Chromium')
        expect(workflow).toContain('pnpm --filter=storefront exec playwright install --with-deps chromium')
        expect(workflow).toMatch(/name: Risk Domain Evidence[\s\S]*CI: ''/)
        expect(workflow).toMatch(/name: Risk Domain Evidence[\s\S]*NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder/)
        expect(runner).toContain("'NEXT_PUBLIC_SUPABASE_ANON_KEY'")
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
