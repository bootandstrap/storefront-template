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

    it('CartDrawer uses the shared formatter for zero-decimal subtotal display', () => {
        const drawer = readFileSync(
            join(srcRoot, 'components/cart/CartDrawer.tsx'),
            'utf-8',
        )

        expect(drawer).toContain("import { formatPrice as formatCurrency } from '@/lib/i18n/currencies'")
        expect(drawer).toContain('const formattedSubtotal = formatCurrency(subtotal, currency, locale)')
        expect(drawer).not.toContain('subtotal / 100')
    })

    it('CartDrawer navigates checkout CTAs imperatively before unmounting itself', () => {
        const drawer = readFileSync(
            join(srcRoot, 'components/cart/CartDrawer.tsx'),
            'utf-8',
        )
        const checkoutCtaStart = drawer.indexOf('{hasAnyCheckoutMethod && (')
        const whatsappCtaStart = drawer.indexOf('{hasWhatsAppCheckout &&')
        const checkoutCtaBlock = drawer.slice(checkoutCtaStart, whatsappCtaStart)

        expect(drawer).toContain("import { useRouter } from 'next/navigation'")
        expect(drawer).toContain('function navigateFromDrawer')
        expect(drawer).toContain('router.push(href)')
        const navigateStart = drawer.indexOf('function navigateFromDrawer')
        const navigateEnd = drawer.indexOf('return (', navigateStart)
        const navigateBlock = drawer.slice(navigateStart, navigateEnd)
        expect(navigateBlock.indexOf('router.push(href)')).toBeLessThan(
            navigateBlock.indexOf('closeDrawer()')
        )
        expect(checkoutCtaBlock).toContain("onClick={() => navigateFromDrawer(localizedHref('cart'))}")
        expect(checkoutCtaBlock).toContain("{t('cart.drawer.viewFullCart')}")
        expect(checkoutCtaBlock).toContain("onClick={() => navigateFromDrawer(localizedHref('checkout'))}")
        expect(checkoutCtaBlock).toContain("{t('cart.checkout')}")
        expect(drawer).not.toContain("href={localizedHref('checkout')}\n                                onClick={closeDrawer}")
    })

    it('CartDrawer renders above cookie consent so first-visit CTAs remain clickable', () => {
        const drawer = readFileSync(
            join(srcRoot, 'components/cart/CartDrawer.tsx'),
            'utf-8',
        )
        const cookieConsent = readFileSync(
            join(srcRoot, 'components/consent/CookieConsentBanner.tsx'),
            'utf-8',
        )

        expect(cookieConsent).toContain('z-50')
        expect(drawer).toContain('fixed inset-0 z-[80] animate-fade-in')
    })
})
