import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const sourceRoutePath = 'apps/storefront/src/app/api/panel/vault/backups/route.ts'

function git(args: string[]) {
    const repoRoot = spawnSync('git', ['rev-parse', '--show-toplevel'], {
        cwd: process.cwd(),
        encoding: 'utf8',
    }).stdout.trim()

    return spawnSync('git', args, {
        cwd: repoRoot,
        encoding: 'utf8',
    })
}

describe('gitignore source contracts', () => {
    it('does not ignore source API route directories named backups', () => {
        const result = git(['check-ignore', sourceRoutePath])

        expect(result.status).not.toBe(0)
        expect(`${result.stdout}${result.stderr}`).toBe('')
    })

    it('tracks the vault backups source route required by panel tests', () => {
        const result = git(['ls-files', '--error-unmatch', sourceRoutePath])

        expect(result.status).toBe(0)
        expect(result.stdout.trim()).toBe(sourceRoutePath)
    })
})
