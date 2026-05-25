import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const REPO_ROOT = resolve(process.cwd(), '..', '..')

function readPackageJson(packageName: 'platform-contract' | 'tenant-context') {
    return JSON.parse(
        readFileSync(join(REPO_ROOT, 'packages', packageName, 'package.json'), 'utf8')
    ) as Record<string, unknown>
}

function npmPackDryRun(packageName: 'platform-contract' | 'tenant-context') {
    const packageDir = join(REPO_ROOT, 'packages', packageName)
    const output = execFileSync('npm', ['pack', '--json', '--dry-run'], {
        cwd: packageDir,
        encoding: 'utf8',
    })
    return JSON.parse(output) as Array<{
        files: Array<{ path: string }>
    }>
}

function readPublishWorkflow() {
    return readFileSync(
        join(REPO_ROOT, '.github', 'workflows', 'publish-platform-kernel.yml'),
        'utf8'
    )
}

describe('shared package publication contract', () => {
    it.each(['platform-contract', 'tenant-context'] as const)(
        '%s exposes a publishable dist-based manifest',
        (packageName) => {
            const manifest = readPackageJson(packageName)

            expect(manifest.private).not.toBe(true)
            expect(manifest.main).toBe('./dist/index.js')
            expect(manifest.types).toBe('./dist/index.d.ts')
            expect(manifest.files).toEqual(['dist', 'README.md'])
            expect(manifest.publishConfig).toEqual({
                registry: 'https://npm.pkg.github.com',
                access: 'restricted',
            })
            expect(manifest.repository).toEqual({
                type: 'git',
                url: 'https://github.com/bootandstrap/storefront-template.git',
                directory: `packages/${packageName}`,
            })
            expect(manifest.license).toBe('UNLICENSED')
        }
    )

    it.each(['platform-contract', 'tenant-context'] as const)(
        '%s dry-run pack includes built JS, declarations, and README',
        (packageName) => {
            const [packResult] = npmPackDryRun(packageName)
            const packedFiles = packResult?.files.map((file) => file.path) ?? []

            expect(packedFiles).toContain('dist/index.js')
            expect(packedFiles).toContain('dist/index.d.ts')
            expect(packedFiles).toContain('README.md')
            expect(packedFiles).not.toContain('src/index.ts')
        }
    )

    it('publish workflow validates on pull requests and supports manual default-branch dispatch', () => {
        const workflow = readPublishWorkflow()

        expect(workflow).toContain('pull_request:')
        expect(workflow).toContain('workflow_dispatch:')
        expect(workflow).toContain("branches: [main]")
        expect(workflow).toContain("github.event_name == 'push'")
        expect(workflow).toContain("github.event_name == 'workflow_dispatch'")
    })
})
