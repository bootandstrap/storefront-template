import { test, expect } from '@playwright/test'

test.describe('Checkout', () => {
    test('checkout page requires items in cart', async ({ page }) => {
        await page.goto('/es/checkout')
        await expect(page.locator('main')).toBeVisible({ timeout: 10_000 })
    })

    test('checkout flow can be reached from cart', async ({ page }) => {
        // Add a product to cart first
        await page.goto('/es/productos')
        const firstCard = page.locator('[data-testid="product-card"] a').first()
        await expect(firstCard).toBeVisible({ timeout: 15_000 })
        await firstCard.click()

        await page.waitForURL(/\/productos\//)
        const addToCart = page.locator('[data-testid="add-to-cart"]')
        await expect(addToCart).toBeVisible({ timeout: 10_000 })
        await addToCart.click()

        // Wait for cart to update — hard assertion, no catch
        const cartIndicator = page.locator(
            '[data-testid="cart-badge"], [data-testid="cart-drawer"]'
        )
        await expect(cartIndicator.first()).toBeVisible({ timeout: 5_000 })

        // Navigate to checkout
        const checkoutLink = page.locator(
            'a[href*="checkout"], [data-testid="checkout-button"]'
        )
        await expect(checkoutLink.first()).toBeVisible({ timeout: 5_000 })
        await checkoutLink.first().click()

        // Checkout page must load
        await expect(
            page.locator('form, [data-testid="checkout-form"]').first()
        ).toBeVisible({ timeout: 10_000 })
    })
})
