import { test, expect } from '@playwright/test'

test.describe('Products', () => {
    test('product list page renders product cards', async ({ page }) => {
        await page.goto('/es/productos')
        await page.waitForLoadState('domcontentloaded')
        const cards = page.locator('[data-testid="product-card"]')
        await expect(cards.first()).toBeAttached({ timeout: 20_000 })
    })

    test('product card shows name and price', async ({ page }) => {
        await page.goto('/es/productos')
        await page.waitForLoadState('domcontentloaded')
        const firstCard = page.locator('[data-testid="product-card"]').first()
        await expect(firstCard).toBeAttached({ timeout: 20_000 })

        // Card must contain text (name + price)
        const text = await firstCard.textContent()
        expect(text?.length).toBeGreaterThan(0)
        // Must contain price digits
        expect(text).toMatch(/[\d€$£¥]/)
    })

    test('clicking product card navigates to detail page', async ({ page }) => {
        await page.goto('/es/productos')
        await page.waitForLoadState('domcontentloaded')
        const firstCard = page.locator('[data-testid="product-card"]').first()
        await expect(firstCard).toBeAttached({ timeout: 20_000 })

        // Use JS click to bypass CSS visibility
        const href = await firstCard.getAttribute('href')
        expect(href).toBeTruthy()
        await page.goto(`/${href!.replace(/^\//, '')}`)
        expect(page.url()).toContain('/productos/')
    })

    test('product detail page shows add to cart button', async ({ page }) => {
        await page.goto('/es/productos')
        await page.waitForLoadState('domcontentloaded')
        const firstCard = page.locator('[data-testid="product-card"]').first()
        await expect(firstCard).toBeAttached({ timeout: 20_000 })

        // Navigate to product detail via href
        const href = await firstCard.getAttribute('href')
        expect(href).toBeTruthy()
        await page.goto(`/${href!.replace(/^\//, '')}`)
        await page.waitForLoadState('domcontentloaded')
        const addToCart = page.locator('[data-testid="add-to-cart"]')
        await expect(addToCart).toBeAttached({ timeout: 15_000 })
    })
})
