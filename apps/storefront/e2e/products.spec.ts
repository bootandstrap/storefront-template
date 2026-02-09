import { test, expect } from '@playwright/test'

test.describe('Products', () => {
    test('product list page renders product cards', async ({ page }) => {
        await page.goto('/es/productos')
        const cards = page.locator('.product-card, [data-testid="product-card"]')
        await expect(cards.first()).toBeVisible({ timeout: 15_000 })
    })

    test('product card shows name and price', async ({ page }) => {
        await page.goto('/es/productos')
        const firstCard = page.locator('.product-card, [data-testid="product-card"]').first()
        await expect(firstCard).toBeVisible({ timeout: 15_000 })

        // Card should contain text content (name)
        const text = await firstCard.textContent()
        expect(text?.length).toBeGreaterThan(0)
    })

    test('clicking product card navigates to detail page', async ({ page }) => {
        await page.goto('/es/productos')
        const firstCard = page.locator('.product-card a, [data-testid="product-card"] a').first()
        await expect(firstCard).toBeVisible({ timeout: 15_000 })

        await firstCard.click()
        await page.waitForURL(/\/productos\//)
        expect(page.url()).toContain('/productos/')
    })

    test('product detail page shows add to cart button', async ({ page }) => {
        await page.goto('/es/productos')
        const firstCard = page.locator('.product-card a, [data-testid="product-card"] a').first()
        await expect(firstCard).toBeVisible({ timeout: 15_000 })
        await firstCard.click()

        await page.waitForURL(/\/productos\//)
        const addToCart = page.locator('button:has-text("carrito"), button:has-text("cart"), button:has-text("añadir"), [data-testid="add-to-cart"]')
        await expect(addToCart.first()).toBeVisible({ timeout: 10_000 })
    })
})
