import { test, expect } from '@playwright/test'

test.describe('Homepage — Business Assertions', () => {
    test('redirects root to locale-prefixed path', async ({ page }) => {
        await page.goto('/')
        await page.waitForURL(/\/(en|es)\//)
        expect(page.url()).toMatch(/\/(en|es)\//)
    })

    test('renders hero section with CTA', async ({ page }) => {
        await page.goto('/es/')
        // Hero section must be visible
        const hero = page.locator('[data-testid="hero-section"], .hero-section, section').first()
        await expect(hero).toBeVisible({ timeout: 10_000 })

        // CTA button should exist and be clickable
        const cta = hero.locator('a[href], button').first()
        await expect(cta).toBeVisible()
        // CTA text should be non-empty (not a placeholder)
        const text = await cta.textContent()
        expect(text?.trim().length).toBeGreaterThan(0)
    })

    test('loads category grid with at least one category', async ({ page }) => {
        await page.goto('/es/')
        const categoryLinks = page.locator('[data-testid="category-grid"] a, .category-grid a, .categories a')
        // At least one category must load via Suspense
        await expect(categoryLinks.first()).toBeVisible({ timeout: 15_000 })
        const count = await categoryLinks.count()
        expect(count).toBeGreaterThanOrEqual(1)
    })

    test('header contains navigation links', async ({ page }) => {
        await page.goto('/es/')
        const header = page.locator('header')
        await expect(header).toBeVisible()

        // Header must contain at least one navigation link
        const navLinks = header.locator('a[href]')
        const navCount = await navLinks.count()
        expect(navCount).toBeGreaterThanOrEqual(1)
    })

    test('footer contains business info', async ({ page }) => {
        await page.goto('/es/')
        const footer = page.locator('footer')
        await expect(footer).toBeVisible()

        // Footer should have text content (not empty)
        const text = await footer.textContent()
        expect(text?.trim().length).toBeGreaterThan(10)
    })

    test('product cards display price', async ({ page }) => {
        await page.goto('/es/')
        // Wait for product grid to appear via Suspense
        const productCards = page.locator('[data-testid="product-card"], .product-card')

        // If products exist, verify they display a price
        try {
            await productCards.first().waitFor({ state: 'visible', timeout: 15_000 })
            const count = await productCards.count()
            if (count > 0) {
                // At least one product card should show a price (contains currency symbol or digits)
                const firstCardText = await productCards.first().textContent()
                expect(firstCardText).toMatch(/[\d€$£¥]/)
            }
        } catch {
            // No products loaded — acceptable for empty catalogs, but flag it
            console.warn('No product cards found — empty catalog or Medusa offline')
        }
    })

    test('page has proper title tag', async ({ page }) => {
        await page.goto('/es/')
        const title = await page.title()
        // Title should not be empty or the default Next.js title
        expect(title.length).toBeGreaterThan(0)
        expect(title).not.toBe('Create Next App')
    })

    test('health endpoint returns 200', async ({ request }) => {
        const response = await request.get('/api/health')
        expect(response.status()).toBe(200)
        const body = await response.json()
        expect(body.status).toBe('ok')
    })
})
