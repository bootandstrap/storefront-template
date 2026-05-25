import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const ARTIFACTS_DIR = join(ROOT, '.artifacts', 'packages')
const PACKAGES = ['platform-contract', 'tenant-context']

mkdirSync(ARTIFACTS_DIR, { recursive: true })

for (const packageName of PACKAGES) {
    const packageDir = join(ROOT, 'packages', packageName)

    rmSync(join(packageDir, 'dist'), { recursive: true, force: true })

    const result = spawnSync('npm', ['pack', '--json', '--pack-destination', ARTIFACTS_DIR], {
        cwd: packageDir,
        encoding: 'utf8',
        stdio: 'pipe',
    })

    if (result.status !== 0) {
        process.stderr.write(result.stderr || result.stdout)
        process.exit(result.status ?? 1)
    }

    process.stdout.write(result.stdout)
}
