import { describe, expect, it } from 'vitest'

import { shouldPrioritizeProductCardImage } from '@/components/products/product-card-image-priority'

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
})
