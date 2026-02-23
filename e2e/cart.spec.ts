import { test, expect } from '@playwright/test'

test.describe('Cart', () => {
    test('product detail page has add-to-cart form', async ({ page }) => {
        // Navigate to product listing, find first product href
        await page.goto('/es/productos')
        await page.waitForLoadState('domcontentloaded')
        const firstCard = page.locator('[data-testid="product-card"]').first()
        await expect(firstCard).toBeAttached({ timeout: 20_000 })

        // Navigate directly to product detail page via href
        const href = await firstCard.getAttribute('href')
        expect(href).toBeTruthy()
        await page.goto(`/${href!.replace(/^\//, '')}`)
        await page.waitForLoadState('domcontentloaded')

        // Verify add-to-cart button exists in a form
        const addToCart = page.locator('[data-testid="add-to-cart"]')
        await expect(addToCart).toBeAttached({ timeout: 15_000 })
        const form = page.locator('form:has([data-testid="add-to-cart"])')
        await expect(form).toBeAttached()
    })

    test('cart page renders', async ({ page }) => {
        await page.goto('/es/carrito')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.locator('main')).toBeAttached({ timeout: 15_000 })
    })
})
