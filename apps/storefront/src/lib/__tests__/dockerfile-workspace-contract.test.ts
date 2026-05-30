import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const REPO_ROOT = resolve(process.cwd(), '..', '..')

function readJson<T>(path: string): T {
    return JSON.parse(readFileSync(path, 'utf8')) as T
}

function readStorefrontManifest() {
    return readJson<{
        dependencies?: Record<string, string>
    }>(join(REPO_ROOT, 'apps', 'storefront', 'package.json'))
}

function readWorkspacePackages() {
    const packagesDir = join(REPO_ROOT, 'packages')
    const entries = readdirSync(packagesDir, { withFileTypes: true })

    return new Map(
        entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => {
                const manifest = readJson<{ name: string }>(
                    join(packagesDir, entry.name, 'package.json')
                )
                return [manifest.name, entry.name] as const
            })
    )
}

function readDockerfile() {
    return readFileSync(join(REPO_ROOT, 'apps', 'storefront', 'Dockerfile'), 'utf8')
}

describe('storefront Dockerfile workspace contract', () => {
    it('copies every local workspace dependency required by storefront into deps and builder stages', () => {
        const manifest = readStorefrontManifest()
        const workspacePackages = readWorkspacePackages()
        const dockerfile = readDockerfile()

        const localWorkspaceDeps = Object.entries(manifest.dependencies ?? {})
            .filter(([, version]) => version.startsWith('workspace:'))
            .map(([packageName]) => {
                const packageDir = workspacePackages.get(packageName)
                expect(packageDir, `Missing local workspace package for ${packageName}`).toBeTruthy()
                return packageDir!
            })

        for (const packageDir of localWorkspaceDeps) {
            expect(dockerfile).toContain(`COPY packages/${packageDir}/package.json ./packages/${packageDir}/`)
            expect(dockerfile).toContain(`COPY --from=deps /app/packages/${packageDir}/node_modules ./packages/${packageDir}/node_modules`)
            expect(dockerfile).toContain(`COPY packages/${packageDir} ./packages/${packageDir}`)
        }
    })
})
