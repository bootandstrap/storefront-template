import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const srcRoot = join(__dirname, '../../..')

describe('cart currency render contract', () => {
    it('passes the resolved page currency into each cart item', () => {
        const page = readFileSync(
            join(srcRoot, 'app/[lang]/(shop)/carrito/page.tsx'),
            'utf-8',
        )

        expect(page).toContain('<CartItem key={item.id} item={item} currencyCode={currency} />')
    })

    it('CartItem falls back to EUR before formatting currency', () => {
        const cartItem = readFileSync(
            join(srcRoot, 'components/cart/CartItem.tsx'),
            'utf-8',
        )

        expect(cartItem).toContain("|| 'EUR'")
    })
})
