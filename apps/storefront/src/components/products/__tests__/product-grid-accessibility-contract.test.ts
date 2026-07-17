import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
    join(__dirname, '..', 'ProductGrid.tsx'),
    'utf-8',
)

describe('ProductGrid accessibility contract', () => {
    it('names the search, sort, and filter controls for mobile Lighthouse audits', () => {
        expect(source).toContain('htmlFor="product-grid-search"')
        expect(source).toContain('id="product-grid-search"')
        expect(source).toContain('name="product-grid-search"')
        expect(source).toContain('aria-label={t(\'product.sort\')}')
        expect(source).toContain('aria-label={t(\'product.filter\')}')
    })

    it('keeps product cards in a valid heading hierarchy below the page h1', () => {
        expect(source).not.toContain('<h3 className="text-sm font-semibold text-tx line-clamp-2')
        expect(source).toContain('<h2 className="text-sm font-semibold text-tx line-clamp-2')
    })
})
