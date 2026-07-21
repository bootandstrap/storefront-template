import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const appRoot = join(__dirname, '..', '..', 'app')
const layoutSource = readFileSync(join(appRoot, 'layout.tsx'), 'utf-8')
const globalsSource = readFileSync(join(appRoot, 'globals.css'), 'utf-8')

describe('storefront font preload contract', () => {
    it('loads only Inter because body and display typography both resolve to it', () => {
        expect(globalsSource).toContain('--font-body: var(--font-inter')
        expect(globalsSource).toContain('--font-display: var(--font-inter')
        expect(layoutSource).toContain('import { Inter } from')
        expect(layoutSource).not.toContain('Outfit')
        expect(layoutSource).not.toContain('--font-outfit')
        expect(layoutSource).not.toContain('fonts.googleapis.com')
        expect(layoutSource).not.toContain('fonts.gstatic.com')
    })
})
