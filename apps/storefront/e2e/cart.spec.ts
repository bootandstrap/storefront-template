import { test, expect } from '@playwright/test'

test.describe('Cart', () => {
    test('add to cart from product page opens drawer', async ({ page }) => {
        await page.goto('/es/productos')
        const firstCard = page.locator('[data-testid="product-card"] a').first()
        await expect(firstCard).toBeVisible({ timeout: 15_000 })
        await firstCard.click()

        await page.waitForURL(/\/productos\//)
        const addToCart = page.locator('[data-testid="add-to-cart"]')
        await expect(addToCart).toBeVisible({ timeout: 10_000 })
        await addToCart.click()

        // Cart drawer OR cart badge MUST become visible — no catch
        const cartIndicator = page.locator(
            '[data-testid="cart-drawer"], [data-testid="cart-badge"]'
        )
        await expect(cartIndicator.first()).toBeVisible({ timeout: 5_000 })
    })

    test('cart page renders', async ({ page }) => {
        await page.goto('/es/carrito')
        await expect(page.locator('main')).toBeVisible({ timeout: 10_000 })
    })
})
