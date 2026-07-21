import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { shouldPrioritizeProductCardImage } from '@/components/products/product-card-image-priority'

const productCardSource = readFileSync(join(__dirname, '..', 'ProductCard.tsx'), 'utf-8')
const productGridSource = readFileSync(join(__dirname, '..', 'ProductGrid.tsx'), 'utf-8')

describe('shouldPrioritizeProductCardImage', () => {
    it('prioritizes the mobile above-the-fold grid cards for LCP discovery', () => {
        expect([0, 1].map((index) => shouldPrioritizeProductCardImage(index))).toEqual([
            true,
            true,
        ])
    })

    it('does not preload extra grid cards that compete with the LCP image', () => {
        expect([2, 3, 4, 5, 6].map((index) => shouldPrioritizeProductCardImage(index))).toEqual([
            false,
            false,
            false,
            false,
            false,
        ])
    })

    it('marks prioritized product images with high fetch priority for deployed Lighthouse LCP', () => {
        expect(productCardSource).toContain("fetchPriority={imagePriority ? 'high' : undefined}")
        expect(productGridSource).toContain("fetchPriority={imagePriority ? 'high' : undefined}")
    })
})
