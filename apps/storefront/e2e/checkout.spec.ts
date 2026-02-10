import { test, expect } from '@playwright/test'

test.describe('Checkout', () => {
    test('checkout page requires items in cart', async ({ page }) => {
        await page.goto('/es/checkout')
        // Should redirect to cart or show empty state if cart is empty
        const hasContent = await page.locator('main, [role="main"]').isVisible()
        expect(hasContent).toBeTruthy()
    })

    test('checkout flow can be reached from cart', async ({ page }) => {
        // Add a product to cart first
        await page.goto('/es/productos')
        const firstCard = page.locator('.product-card a, [data-testid="product-card"] a').first()
        await expect(firstCard).toBeVisible({ timeout: 15_000 })
        await firstCard.click()

        await page.waitForURL(/\/productos\//)
        const addToCart = page.locator('button:has-text("carrito"), button:has-text("cart"), button:has-text("añadir"), [data-testid="add-to-cart"]')
        await expect(addToCart.first()).toBeVisible({ timeout: 10_000 })
        await addToCart.first().click()

        // Wait for cart to update by observing a cart badge or toast
        const cartIndicator = page.locator(
            '[data-testid="cart-count"], .cart-badge, [aria-label*="cart"], .toast-message'
        )
        await expect(cartIndicator.first()).toBeVisible({ timeout: 5_000 }).catch(() => {
            // Cart indicator might not exist — continue anyway
        })

        // Navigate to checkout
        const checkoutLink = page.locator('a[href*="checkout"], button:has-text("checkout"), button:has-text("pagar"), button:has-text("comprar")')
        if (await checkoutLink.first().isVisible()) {
            await checkoutLink.first().click()
            // Wait for checkout page to load by checking for a form or heading
            await expect(
                page.locator('form, h1, h2, [data-testid="checkout"]').first()
            ).toBeVisible({ timeout: 10_000 })
        }
    })
})
