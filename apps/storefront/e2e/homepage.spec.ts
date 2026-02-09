import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
    test('redirects root to locale-prefixed path', async ({ page }) => {
        await page.goto('/')
        await page.waitForURL(/\/(en|es)\//)
        expect(page.url()).toMatch(/\/(en|es)\//)
    })

    test('renders hero section', async ({ page }) => {
        await page.goto('/es/')
        const hero = page.locator('[data-testid="hero-section"], .hero-section, section').first()
        await expect(hero).toBeVisible({ timeout: 10_000 })
    })

    test('loads category grid', async ({ page }) => {
        await page.goto('/es/')
        // Wait for at least one category to appear (loaded via Suspense)
        const categories = page.locator('[data-testid="category-grid"] a, .category-grid a, .categories a')
        await expect(categories.first()).toBeVisible({ timeout: 15_000 })
    })

    test('has header with navigation', async ({ page }) => {
        await page.goto('/es/')
        const header = page.locator('header')
        await expect(header).toBeVisible()
    })

    test('has footer', async ({ page }) => {
        await page.goto('/es/')
        const footer = page.locator('footer')
        await expect(footer).toBeVisible()
    })
})
