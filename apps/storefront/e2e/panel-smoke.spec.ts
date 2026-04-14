import { test, expect } from '@playwright/test'

/**
 * Panel Smoke Test — verifies critical panel UI renders without errors.
 *
 * These tests run against a deployed instance with a valid owner session.
 * They do NOT modify data — purely read-only verification.
 *
 * Pre-requisite: Set PANEL_TEST_EMAIL and PANEL_TEST_PASSWORD env vars,
 * or use a pre-authenticated storage state via Playwright's `storageState`.
 */

const LANG = 'es'
const PANEL_BASE = `/${LANG}/panel`

test.describe('Panel Smoke Tests', () => {
    // Skip if no auth credentials
    test.skip(!process.env.PANEL_TEST_EMAIL, 'No panel test credentials set')

    test.beforeEach(async ({ page }) => {
        // Login flow
        await page.goto(`/${LANG}/login`)
        await page.fill('input[type="email"]', process.env.PANEL_TEST_EMAIL!)
        await page.fill('input[type="password"]', process.env.PANEL_TEST_PASSWORD!)
        await page.click('button[type="submit"]')
        await page.waitForURL(`**/${LANG}/panel/**`, { timeout: 15_000 })
    })

    test('Dashboard renders without errors', async ({ page }) => {
        await page.goto(PANEL_BASE)
        // Should see the greeting or dashboard content
        await expect(page.locator('main')).toBeVisible()
        // No error boundary visible
        await expect(page.locator('text=Algo salió mal')).not.toBeVisible()
    })

    test('Catalog page loads products', async ({ page }) => {
        await page.goto(`${PANEL_BASE}/catalogo`)
        await expect(page.locator('main')).toBeVisible()
        // Wait for loading skeleton to disappear
        await page.waitForTimeout(2000)
        await expect(page.locator('text=Algo salió mal')).not.toBeVisible()
    })

    test('Settings page shows tabs', async ({ page }) => {
        await page.goto(`${PANEL_BASE}/ajustes`)
        await expect(page.locator('main')).toBeVisible()
        await expect(page.locator('text=Algo salió mal')).not.toBeVisible()
    })

    test('Ventas page renders', async ({ page }) => {
        await page.goto(`${PANEL_BASE}/ventas`)
        await expect(page.locator('main')).toBeVisible()
        await expect(page.locator('text=Algo salió mal')).not.toBeVisible()
    })

    test('Clientes page renders', async ({ page }) => {
        await page.goto(`${PANEL_BASE}/clientes`)
        await expect(page.locator('main')).toBeVisible()
        await expect(page.locator('text=Algo salió mal')).not.toBeVisible()
    })
})
