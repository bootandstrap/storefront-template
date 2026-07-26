import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
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
})
