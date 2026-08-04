import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const SOURCE_ROOT = path.resolve(process.cwd(), 'src')
const THIS_FILE = path.resolve(__filename)
const FORBIDDEN_CROSS_REPO_PATTERNS = [
    new RegExp(['BS', 'WEB_ROOT'].join('')),
    new RegExp(`path\\.resolve\\([\\s\\S]{0,240}${['BOOT', 'ANDSTRAP_WEB'].join('')}`),
]

function collectUnitTests(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const absolutePath = path.join(directory, entry.name)
        if (entry.isDirectory()) return collectUnitTests(absolutePath)
        if (!entry.isFile() || !/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) return []
        return absolutePath === THIS_FILE ? [] : [absolutePath]
    })
}

describe('storefront unit-suite hermeticity', () => {
    it('does not read control-plane checkouts from normal unit tests', () => {
        const violations = collectUnitTests(SOURCE_ROOT).flatMap((absolutePath) => {
            const source = fs.readFileSync(absolutePath, 'utf8')
            const patterns = FORBIDDEN_CROSS_REPO_PATTERNS.filter((pattern) => pattern.test(source))
            return patterns.map((pattern) => ({
                file: path.relative(process.cwd(), absolutePath),
                pattern: pattern.source,
            }))
        })

        expect(violations).toEqual([])
    })
})
