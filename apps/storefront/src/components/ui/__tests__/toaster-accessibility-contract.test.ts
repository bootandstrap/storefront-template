import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const toaster = readFileSync(
    resolve(process.cwd(), 'src/components/ui/Toaster.tsx'),
    'utf8'
)

describe('storefront toast accessibility contract', () => {
    it('does not reduce the inherited AA text contrast for toast actions', () => {
        const actionStart = toaster.indexOf('{toast.action && (')
        const actionEnd = toaster.indexOf('</button>', actionStart)
        const action = toaster.slice(actionStart, actionEnd)

        expect(actionStart).toBeGreaterThan(-1)
        expect(action).toContain('underline underline-offset-2')
        expect(action).not.toMatch(/\bopacity-(?:[0-9]|[1-8][0-9]|9[0-9])\b/)
    })
})
