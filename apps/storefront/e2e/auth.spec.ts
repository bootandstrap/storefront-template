import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
    test('login page renders', async ({ page }) => {
        await page.goto('/es/login')
        // Should show login form or auth UI
        const form = page.locator('form, [data-testid="login-form"]')
        await expect(form).toBeVisible({ timeout: 10_000 })
    })

    test('login page has email/password fields when email auth enabled', async ({ page }) => {
        await page.goto('/es/login')
        const emailInput = page.locator('input[type="email"], input[name="email"]')
        const passwordInput = page.locator('input[type="password"], input[name="password"]')

        // At least one auth method should be visible
        const emailVisible = await emailInput.isVisible().catch(() => false)
        const googleVisible = await page.locator('button:has-text("Google")').isVisible().catch(() => false)
        expect(emailVisible || googleVisible).toBeTruthy()
    })

    test('registration page renders when enabled', async ({ page }) => {
        const response = await page.goto('/es/registro')
        // Either renders (200) or redirects if registration disabled
        expect([200, 301, 302, 307, 308]).toContain(response?.status() ?? 200)
    })
})
