import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

const layoutDir = join(__dirname, '..')

describe('header search accessibility contract', () => {
    it('associates desktop and mobile search controls with stable labels, ids, and names', () => {
        const source = readFileSync(join(layoutDir, 'Header.tsx'), 'utf-8')
        const fields = [
            'desktop-product-search',
            'mobile-product-search',
        ]

        for (const id of fields) {
            expect(source).toContain(`htmlFor="${id}"`)
            expect(source).toContain(`id="${id}"`)
            expect(source).toContain(`name="${id}"`)
        }
    })

    it('keeps the icon-only mobile account link named for assistive tech', () => {
        const source = readFileSync(join(layoutDir, 'Header.tsx'), 'utf-8')

        expect(source).toContain('aria-label={isAuthenticated ? t(\'nav.account\') : t(\'nav.login\')}')
    })
})
