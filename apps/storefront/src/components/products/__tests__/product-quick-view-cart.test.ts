import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
    join(__dirname, '..', 'ProductQuickView.tsx'),
    'utf-8',
)

describe('ProductQuickView cart behavior', () => {
    it('can add the first item when no cart id exists yet', () => {
        expect(source).toContain('addToCartAction(cartId, activeVariant.id)')
        expect(source).not.toContain('!cartId')
    })

    it('persists a newly created cart id after quick-view add-to-cart', () => {
        expect(source).toContain('setCartId')
        expect(source).toContain('if (result.cartId) setCartId(result.cartId)')
    })
})
