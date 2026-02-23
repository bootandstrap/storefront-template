import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E test configuration for the storefront.
 *
 * Run with: npx playwright test
 * Debug with: npx playwright test --debug
 * UI mode: npx playwright test --ui
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? 'html' : 'list',
    timeout: process.env.CI ? 30_000 : 60_000,

    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        navigationTimeout: process.env.CI ? 15_000 : 30_000,
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        // Uncomment for multi-browser testing:
        // {
        //     name: 'firefox',
        //     use: { ...devices['Desktop Firefox'] },
        // },
        // {
        //     name: 'webkit',
        //     use: { ...devices['Desktop Safari'] },
        // },
        // Mobile viewport:
        // {
        //     name: 'mobile-chrome',
        //     use: { ...devices['Pixel 5'] },
        // },
    ],

    // Start storefront dev server before running tests
    webServer: process.env.CI
        ? undefined  // In CI, services are started via Docker Compose
        : {
            command: 'pnpm dev',
            url: 'http://localhost:3000',
            reuseExistingServer: true,
            timeout: 60_000,
        },
})
