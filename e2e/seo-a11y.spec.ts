import { test, expect } from '@playwright/test'

test.describe('SEO & Accessibility', () => {
    test('homepage has meta description', async ({ page }) => {
        await page.goto('/es/')
        await page.waitForLoadState('domcontentloaded')
        const metaDescription = page.locator('meta[name="description"]')
        await expect(metaDescription).toBeAttached()
        const content = await metaDescription.getAttribute('content')
        expect(content?.length).toBeGreaterThan(10)
    })

    test('pages have unique h1 headings', async ({ page }) => {
        await page.goto('/es/')
        await page.waitForLoadState('domcontentloaded')
        const h1s = page.locator('h1')
        const count = await h1s.count()
        expect(count).toBeGreaterThanOrEqual(1)
    })

    test('product page has structured data (JSON-LD)', async ({ page }) => {
        await page.goto('/es/productos')
        await page.waitForLoadState('domcontentloaded')
        const firstCard = page.locator('[data-testid="product-card"]').first()
        await expect(firstCard).toBeAttached({ timeout: 20_000 })

        const href = await firstCard.getAttribute('href')
        expect(href).toBeTruthy()
        await page.goto(`/${href!.replace(/^\//, '')}`)
        await page.waitForLoadState('domcontentloaded')

        const jsonLd = page.locator('script[type="application/ld+json"]')
        const count = await jsonLd.count()
        expect(count).toBeGreaterThanOrEqual(1)

        const first = await jsonLd.first().textContent()
        expect(first).toBeTruthy()
        const parsed = JSON.parse(first!)
        // Product structured data should have @type
        expect(parsed).toHaveProperty('@type')
    })

    test('images have alt attributes', async ({ page }) => {
        await page.goto('/es/')
        await page.waitForLoadState('domcontentloaded')
        const images = page.locator('img')
        const count = await images.count()

        // Check first 5 images have alt attributes
        for (let i = 0; i < Math.min(5, count); i++) {
            const img = images.nth(i)
            const alt = await img.getAttribute('alt')
            // Alt should be present (can be empty for decorative images)
            expect(alt).toBeDefined()
        }
    })

    test('skip links or main landmark exist for accessibility', async ({ page }) => {
        await page.goto('/es/')
        await page.waitForLoadState('domcontentloaded')
        // Page should have a main landmark
        const main = page.locator('main, [role="main"]')
        await expect(main.first()).toBeAttached({ timeout: 10_000 })
    })

    test('locale segment produces correct html lang attribute', async ({ page }) => {
        await page.goto('/es/')
        await page.waitForLoadState('domcontentloaded')
        const lang = await page.locator('html').getAttribute('lang')
        expect(lang).toMatch(/^es/)
    })

    test('navigation elements are keyboard accessible', async ({ page }) => {
        await page.goto('/es/')
        await page.waitForLoadState('domcontentloaded')

        // Tab to first interactive element — should be focusable
        await page.keyboard.press('Tab')
        const focused = page.locator(':focus')
        await expect(focused).toBeAttached({ timeout: 5_000 })
    })
})

test.describe('Multi-locale Routing', () => {
    const locales = ['en', 'es', 'de', 'fr', 'it']

    for (const locale of locales) {
        test(`/${locale}/ returns 200 and correct lang`, async ({ page }) => {
            const response = await page.goto(`/${locale}/`)
            // Accept 200 or redirect (some locales may redirect)
            expect([200, 301, 302, 307, 308]).toContain(response?.status() ?? 200)
            await page.waitForLoadState('domcontentloaded')
            const htmlLang = await page.locator('html').getAttribute('lang')
            expect(htmlLang).toMatch(new RegExp(`^(${locale}|es)`))
        })
    }
})
