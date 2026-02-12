import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
    test('login page renders form', async ({ page }) => {
        await page.goto('/es/login')
        const form = page.locator('[data-testid="login-form"], form')
        await expect(form.first()).toBeVisible({ timeout: 10_000 })
    })

    test('login page has auth fields', async ({ page }) => {
        await page.goto('/es/login')
        // At least one auth method MUST be visible — email OR OAuth
        const _emailInput = page.locator('input[type="email"], input[name="email"]')
        const _oauthButton = page.locator('button:has-text("Google"), [data-testid="google-auth"]')

        const authElement = page.locator(
            'input[type="email"], input[name="email"], button:has-text("Google"), [data-testid="google-auth"]'
        )
        await expect(authElement.first()).toBeVisible({ timeout: 10_000 })
    })

    test('registration page renders when enabled', async ({ page }) => {
        const response = await page.goto('/es/registro')
        // Either renders (200) or redirects if registration disabled
        expect([200, 301, 302, 307, 308]).toContain(response?.status() ?? 200)
    })
})
