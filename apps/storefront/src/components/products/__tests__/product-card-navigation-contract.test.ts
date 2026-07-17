import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
    join(__dirname, '..', 'ProductCard.tsx'),
    'utf-8',
)

describe('ProductCard navigation contract', () => {
    it('renders the product card as a real link with href for visual and automated navigation', () => {
        expect(source).toContain("import Link from 'next/link'")
        expect(source).toContain('<Link')
        expect(source).toContain('href={productHref}')
        expect(source).toContain('data-testid="product-card"')
    })

    it('does not emulate link navigation with a clickable div', () => {
        expect(source).not.toContain('role="link"')
        expect(source).not.toContain('router.push(productHref)')
    })
})
