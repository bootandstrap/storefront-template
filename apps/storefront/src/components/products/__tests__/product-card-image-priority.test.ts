import { describe, expect, it } from 'vitest'

import { shouldPrioritizeProductCardImage } from '@/components/products/product-card-image-priority'

describe('shouldPrioritizeProductCardImage', () => {
    it('prioritizes the first row of grid cards for LCP discovery', () => {
        expect([0, 1, 2, 3].map((index) => shouldPrioritizeProductCardImage(index))).toEqual([
            true,
            true,
            true,
            true,
        ])
    })

    it('does not prioritize cards below the fold', () => {
        expect([4, 5, 6].map((index) => shouldPrioritizeProductCardImage(index))).toEqual([
            false,
            false,
            false,
        ])
    })
})
