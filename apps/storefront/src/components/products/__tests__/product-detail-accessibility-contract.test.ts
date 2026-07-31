import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
    join(__dirname, '..', 'ProductDetailClient.tsx'),
    'utf-8',
)
const globalStyles = readFileSync(
    join(__dirname, '..', '..', '..', 'app', 'globals.css'),
    'utf-8',
)

describe('ProductDetailClient accessibility contract', () => {
    it('uses AA-safe text contrast for the in-stock status on light backgrounds', () => {
        expect(source).not.toContain("'text-green-600 dark:text-green-400'")
        expect(source).toContain("'text-green-700 dark:text-green-400'")
    })

    it('keeps the mobile sticky CTA above the bottom navigation', () => {
        expect(source).toContain('data-testid="product-primary-cta"')
        expect(source).toContain('product-sticky-cta')
        expect(source).toContain('product-sticky-cta fixed left-0 right-0 z-40 md:hidden')
        expect(source).toContain('animate-product-sticky-cta')
        expect(source).not.toContain('animate-fade-in')
        expect(source).not.toContain('product-sticky-cta fixed left-0 right-0 z-40 md:hidden bg-glass-heavy backdrop-blur-sm border-t border-sf-3 animate-slide-up')
        expect(source).not.toContain('fixed bottom-0 left-0 right-0 z-40 md:hidden')
        expect(globalStyles).toContain('.product-sticky-cta')
        expect(globalStyles).toContain('@keyframes product-sticky-cta-fade')
        expect(globalStyles).toContain('.animate-product-sticky-cta')
        expect(globalStyles).toContain('animation: product-sticky-cta-fade 0.2s var(--ease-smooth);')
        expect(globalStyles).toContain(
            'bottom: calc(4rem + env(safe-area-inset-bottom, 0px));'
        )
    })
})
