import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const SRC_ROOT = join(__dirname, '../..')
const FORBIDDEN_PATTERNS = [
    /featureFlags\.enable_customer_accounts\b/,
    /featureFlags\.enable_order_tracking\b/,
    /featureFlags\[['"]enable_customer_accounts['"]\]/,
    /featureFlags\[['"]enable_order_tracking['"]\]/,
]
const EXCLUDED_PATH_PARTS = [
    '__tests__',
    'features.ts',
    'feature-gate-config.ts',
    'owner-config.ts',
    'governance/schemas.ts',
    'supabase/database.types.ts',
]

function listSourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry)
        const stats = statSync(path)

        if (stats.isDirectory()) {
            if (entry === 'node_modules') return []
            return listSourceFiles(path)
        }

        if (!/\.(ts|tsx)$/.test(entry)) return []
        return [path]
    })
}

describe('core invariant feature usage contract', () => {
    it('routes runtime feature checks through isFeatureEnabled', () => {
        const offenders = listSourceFiles(SRC_ROOT)
            .filter((file) => {
                const rel = relative(SRC_ROOT, file)
                return !EXCLUDED_PATH_PARTS.some((part) => rel.includes(part))
            })
            .filter((file) => FORBIDDEN_PATTERNS.some((pattern) => pattern.test(readFileSync(file, 'utf8'))))
            .map((file) => relative(SRC_ROOT, file))

        expect(
            offenders,
            `Core invariant flags must use isFeatureEnabled() so accidental false governance data cannot disable checkout-adjacent account/tracking flows.\n${offenders.join('\n')}`,
        ).toEqual([])
    })
})
