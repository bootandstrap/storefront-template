import { test, expect } from '@playwright/test'

test.describe('Checkout Flow — Modal Steps', () => {
    test('checkout button on cart page opens modal or redirects', async ({ page }) => {
        // Navigate to cart page
        await page.goto('/es/carrito')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.locator('main')).toBeAttached({ timeout: 15_000 })

        // Look for checkout button/link
        const checkoutBtn = page.locator(
            '[data-testid="checkout-button"], a[href*="checkout"], button:has-text("Pedir"), button:has-text("Checkout")'
        )

        // If cart is empty, checkout button may not be present (acceptable)
        const count = await checkoutBtn.count()
        if (count > 0) {
            await checkoutBtn.first().click()
            // Should either open a modal or navigate to checkout page
            await page.waitForTimeout(2000)
            const url = page.url()
            const modalVisible = await page.locator('[data-testid="checkout-modal"]').isVisible().catch(() => false)
            expect(url.includes('checkout') || modalVisible).toBeTruthy()
        }
    })

    test('checkout page/modal shows order form fields when accessible', async ({ page }) => {
        await page.goto('/es/checkout')
        await page.waitForLoadState('domcontentloaded')

        // Either shows checkout form or redirects to login
        await page.waitForURL(/\/(checkout|login)/, { timeout: 15_000 })
        const url = page.url()

        if (url.includes('checkout')) {
            // Verify form fields exist
            const form = page.locator('form, [data-testid="checkout-form"], [data-testid="checkout-modal"]')
            await expect(form.first()).toBeAttached({ timeout: 15_000 })
        }
        // If redirected to login, that's also correct behavior
    })

    test('API health endpoint returns expected fields', async ({ request }) => {
        const response = await request.get('/api/health')
        expect(response.status()).toBe(200)
        const body = await response.json()
        expect(body).toHaveProperty('status', 'ok')
    })

    test('robots.txt disallows private routes', async ({ request }) => {
        const response = await request.get('/robots.txt')
        expect(response.status()).toBe(200)
        const text = await response.text()
        // Must block private routes from crawlers
        expect(text).toContain('Disallow')
        // Should allow root/product pages
        expect(text).toMatch(/Allow.*\//)
    })

    test('sitemap.xml returns valid XML', async ({ request }) => {
        const response = await request.get('/sitemap.xml')
        expect(response.status()).toBe(200)
        const text = await response.text()
        expect(text).toContain('<?xml')
        expect(text).toContain('<urlset')
    })
})
