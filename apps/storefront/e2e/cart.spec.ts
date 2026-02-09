import { test, expect } from '@playwright/test'

test.describe('Cart', () => {
    test('add to cart from product page opens drawer', async ({ page }) => {
        await page.goto('/es/productos')
        const firstCard = page.locator('.product-card a, [data-testid="product-card"] a').first()
        await expect(firstCard).toBeVisible({ timeout: 15_000 })
        await firstCard.click()

        await page.waitForURL(/\/productos\//)
        const addToCart = page.locator('button:has-text("carrito"), button:has-text("cart"), button:has-text("añadir"), [data-testid="add-to-cart"]')
        await expect(addToCart.first()).toBeVisible({ timeout: 10_000 })
        await addToCart.first().click()

        // Cart drawer should open or cart badge should update
        const drawer = page.locator('[data-testid="cart-drawer"], .cart-drawer, [role="dialog"]')
        const badge = page.locator('[data-testid="cart-badge"], .cart-badge')
        const visible = await drawer.isVisible().catch(() => false) || await badge.isVisible().catch(() => false)
        expect(visible).toBeTruthy()
    })

    test('cart page renders', async ({ page }) => {
        await page.goto('/es/carrito')
        // Should show cart content or empty state
        await expect(page.locator('main, [role="main"]')).toBeVisible({ timeout: 10_000 })
    })
})
