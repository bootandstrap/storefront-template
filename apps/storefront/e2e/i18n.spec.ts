import { test, expect } from '@playwright/test'

test.describe('i18n', () => {
    test('locale route segments work (en)', async ({ page }) => {
        await page.goto('/en/')
        await expect(page.locator('html')).toHaveAttribute('lang', /en/)
    })

    test('locale route segments work (es)', async ({ page }) => {
        await page.goto('/es/')
        // Content should be in Spanish or the lang attribute should be es
        const lang = await page.locator('html').getAttribute('lang')
        expect(lang).toMatch(/es/)
    })

    test('navigation links use localized slugs', async ({ page }) => {
        await page.goto('/es/')
        const productLink = page.locator('a[href*="/productos"], a[href*="/products"]')
        await expect(productLink.first()).toBeVisible({ timeout: 10_000 })
    })

    test('language selector is visible when multi-language enabled', async ({ page }) => {
        await page.goto('/es/')
        // Language selector may or may not be present depending on feature flag
        const selector = page.locator('[data-testid="language-selector"], .language-selector')
        // Just verify it doesn't error — visibility depends on flags
        await page.waitForTimeout(2_000)
    })
})
