import { expect, type Page, type APIRequestContext } from '@playwright/test'

export const BNS_360_LANG = process.env.BNS_360_LANG || 'es'
export const BNS_360_OWNER_EMAIL = process.env.BNS_360_OWNER_EMAIL || process.env.PANEL_TEST_EMAIL || process.env.E2E_OWNER_EMAIL
export const BNS_360_OWNER_PASSWORD = process.env.BNS_360_OWNER_PASSWORD || process.env.PANEL_TEST_PASSWORD || process.env.E2E_OWNER_PASSWORD

export function hasOwnerCredentials() {
    return Boolean(BNS_360_OWNER_EMAIL && BNS_360_OWNER_PASSWORD)
}

export async function loginAsOwner(page: Page) {
    await page.goto(`/${BNS_360_LANG}/login`)
    await page.waitForLoadState('domcontentloaded')
    await page.fill('input[type="email"]', BNS_360_OWNER_EMAIL ?? '')
    await page.fill('input[type="password"]', BNS_360_OWNER_PASSWORD ?? '')
    await page.click('button[type="submit"]')
    await page.waitForURL(`**/${BNS_360_LANG}/panel/**`, { timeout: 20_000 })
}

export async function expectPanelRouteHealthy(page: Page, route: string) {
    await page.goto(route)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('text=Algo salió mal')).not.toBeVisible()
}

export async function expectApiHealthy(request: APIRequestContext, route: string) {
    const response = await request.get(route)
    expect(response.ok()).toBe(true)
}
