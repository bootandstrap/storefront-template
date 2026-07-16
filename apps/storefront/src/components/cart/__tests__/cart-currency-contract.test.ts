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

        expect(page).toContain("cart?.currency_code || cart?.region?.currency_code")
        expect(page).toContain('<CartItem key={item.id} item={item} currencyCode={currency} />')
    })

    it('uses the shared currency formatter for cart totals', () => {
        const page = readFileSync(
            join(srcRoot, 'app/[lang]/(shop)/carrito/page.tsx'),
            'utf-8',
        )

        expect(page).toContain("import { formatPrice as formatCurrency } from '@/lib/i18n/currencies'")
        expect(page).toContain('formatCurrency(amount, currency, locale)')
        expect(page).not.toContain('amount / 100')
    })

    it('CartItem uses the cart currency and shared zero-decimal handling', () => {
        const cartItem = readFileSync(
            join(srcRoot, 'components/cart/CartItem.tsx'),
            'utf-8',
        )

        expect(cartItem).toContain("|| 'EUR'")
        expect(cartItem).toContain("import { formatPrice as formatCurrency } from '@/lib/i18n/currencies'")
        expect(cartItem).toContain('const unitPrice = item.unit_price')
        expect(cartItem).toContain('formatCurrency(amount, currency, locale)')
        expect(cartItem).not.toContain('item.unit_price / 100')
    })
})
