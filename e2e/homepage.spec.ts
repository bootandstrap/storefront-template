import { test, expect } from '@playwright/test'

test.describe('Homepage — Business Assertions', () => {
    test('redirects root to locale-prefixed path', async ({ page }) => {
        await page.goto('/')
        // Root may redirect server-side (308) or client-side (JS redirect)
        await page.waitForURL(/\/(en|es)/, { timeout: 10_000 })
        expect(page.url()).toMatch(/\/(en|es)/)
    })

    test('renders hero section with CTA', async ({ page }) => {
        await page.goto('/es/')
        await page.waitForLoadState('domcontentloaded')
        const hero = page.locator('[data-testid="hero-section"]')
        await expect(hero).toBeAttached({ timeout: 15_000 })

        // CTA button should exist
        const cta = hero.locator('a[href], button').first()
        await expect(cta).toBeAttached()
        const text = await cta.textContent()
        expect(text?.trim().length).toBeGreaterThan(0)
    })

    test('loads category grid with at least one category', async ({ page }) => {
        await page.goto('/es/')
        await page.waitForLoadState('domcontentloaded')
        const categoryGrid = page.locator('[data-testid="category-grid"]')
        await expect(categoryGrid).toBeAttached({ timeout: 20_000 })
        const categoryLinks = categoryGrid.locator('a')
        await expect(categoryLinks.first()).toBeAttached()
        const count = await categoryLinks.count()
        expect(count).toBeGreaterThanOrEqual(1)
    })

    test('header contains navigation links', async ({ page }) => {
        await page.goto('/es/')
        await page.waitForLoadState('domcontentloaded')
        const header = page.locator('[data-testid="main-header"]')
        await expect(header).toBeAttached({ timeout: 10_000 })

        const navLinks = header.locator('a[href]')
        const navCount = await navLinks.count()
        expect(navCount).toBeGreaterThanOrEqual(1)
    })

    test('footer contains business info', async ({ page }) => {
        await page.goto('/es/')
        await page.waitForLoadState('domcontentloaded')
        const footer = page.locator('[data-testid="main-footer"]')
        await expect(footer).toBeAttached({ timeout: 10_000 })

        const text = await footer.textContent()
        expect(text?.trim().length).toBeGreaterThan(10)
    })

    test('product cards display price', async ({ page }) => {
        await page.goto('/es/')
        await page.waitForLoadState('domcontentloaded')
        const productCards = page.locator('[data-testid="product-card"]')
        await expect(productCards.first()).toBeAttached({ timeout: 20_000 })

        const count = await productCards.count()
        expect(count).toBeGreaterThan(0)

        // At least one product card should show a price (digits or currency symbol)
        const firstCardText = await productCards.first().textContent()
        expect(firstCardText).toMatch(/[\d€$£¥]/)
    })

    test('page has proper title tag', async ({ page }) => {
        await page.goto('/es/')
        const title = await page.title()
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
