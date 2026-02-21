import { test, expect } from '@playwright/test'

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD
const EXPECT_OWNER_LITE = process.env.E2E_EXPECT_OWNER_LITE !== 'false'

async function loginAsOwner(page: Parameters<typeof test>[0]['page']) {
    await page.goto('/es/login')
    await page.waitForLoadState('domcontentloaded')
    await page.fill('input[name="email"]', OWNER_EMAIL ?? '')
    await page.fill('input[name="password"]', OWNER_PASSWORD ?? '')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/es\/(panel|cuenta)/, { timeout: 20_000 })
}

test.describe('owner lite critical', () => {
    test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run owner critical flows')

    test('owner login reaches panel and sees essential modules', async ({ page }) => {
        await loginAsOwner(page)
        await expect(page).toHaveURL(/\/es\/panel/)

        await expect(page.locator('a[href="/es/panel/catalogo"]')).toBeVisible()
        await expect(page.locator('a[href="/es/panel/pedidos"]')).toBeVisible()
        await expect(page.locator('a[href="/es/panel/clientes"]')).toBeVisible()
        await expect(page.locator('a[href="/es/panel/tienda"]')).toBeVisible()
    })

    test('advanced route is blocked in owner lite mode', async ({ page }) => {
        test.skip(!EXPECT_OWNER_LITE, 'Skipping: E2E_EXPECT_OWNER_LITE=false')

        await loginAsOwner(page)
        await page.goto('/es/panel/analiticas')
        await expect(page).toHaveURL(/\/es\/panel$/)
    })
})
