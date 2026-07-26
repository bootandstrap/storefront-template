import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
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

function runEvidenceRunner(args: string[]) {
    return spawnSync(
        process.execPath,
        [join(REPO_ROOT, 'scripts', 'run-risk-domain-evidence.mjs'), ...args],
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
                'ci-release-artifacts',
            ])
        )

        for (const domain of matrix.domains) {
            expect(domain.requiredTestFiles.length, domain.id).toBeGreaterThanOrEqual(2)
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
})
