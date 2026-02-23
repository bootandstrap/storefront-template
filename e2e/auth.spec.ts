import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
    test('login page renders form', async ({ page }) => {
        await page.goto('/es/login')
        await page.waitForLoadState('domcontentloaded')
        const form = page.locator('[data-testid="login-form"], form')
        await expect(form.first()).toBeAttached({ timeout: 15_000 })
    })

    test('login page has auth fields', async ({ page }) => {
        await page.goto('/es/login')
        await page.waitForLoadState('domcontentloaded')
        // At least one auth method MUST be present — email OR OAuth
        const authElement = page.locator(
            'input[type="email"], input[name="email"], button:has-text("Google"), [data-testid="google-auth"]'
        )
        await expect(authElement.first()).toBeAttached({ timeout: 15_000 })
    })

    test('registration page renders when enabled', async ({ page }) => {
        const response = await page.goto('/es/registro')
        // Either renders (200) or redirects if registration disabled
        expect([200, 301, 302, 307, 308]).toContain(response?.status() ?? 200)
    })
})
