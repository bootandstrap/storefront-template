import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..')

describe('checkout currency formatting contract', () => {
    it('uses the shared zero-decimal-aware formatter in checkout surfaces', () => {
        const checkoutPage = readFileSync(
            join(ROOT, 'app/[lang]/(shop)/checkout/CheckoutPageClient.tsx'),
            'utf8',
        )
        const checkoutModal = readFileSync(
            join(ROOT, 'components/checkout/CheckoutModal.tsx'),
            'utf8',
        )
        const freeShippingBanner = readFileSync(
            join(ROOT, 'components/cart/FreeShippingBanner.tsx'),
            'utf8',
        )

        for (const source of [checkoutPage, checkoutModal, freeShippingBanner]) {
            expect(source).toContain("formatPrice as formatCurrencyPrice")
            expect(source).not.toContain('.format(amount / 100)')
        }
    })
})
