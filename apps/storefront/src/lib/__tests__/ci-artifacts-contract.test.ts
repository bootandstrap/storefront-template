import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const REPO_ROOT = resolve(process.cwd(), '..', '..')

function readWorkflow(name: string) {
    return readFileSync(join(REPO_ROOT, '.github', 'workflows', name), 'utf8')
}

function readScript(name: string) {
    return readFileSync(join(REPO_ROOT, 'scripts', name), 'utf8')
}

function uploadArtifactBlocks(workflow: string) {
    return workflow
        .split('\n      - name:')
        .filter((block) => block.includes('uses: actions/upload-artifact@v4'))
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
})
