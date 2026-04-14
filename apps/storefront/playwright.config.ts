import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Test Configuration — BootandStrap Storefront
 *
 * TESTING STRATEGY:
 * - Smoke tests (e2e/panel-smoke.spec.ts): Verify critical panel pages render
 *   without errors. Read-only — no data mutations. Fast feedback loop (~30s).
 * - Full E2E tests: (future) Login → navigate → mutate → verify. Slower but
 *   comprehensive. Use Playwright's storageState for auth persistence.
 *
 * AUTH PREREQUISITES:
 * - Set PANEL_TEST_EMAIL and PANEL_TEST_PASSWORD env vars
 * - The account must have 'owner' role for the target tenant
 * - Without credentials, smoke tests skip gracefully
 *
 * LOCAL vs CI:
 * - Local: Auto-starts dev server, longer timeouts (60s), no retries
 * - CI: Expects externally-running services (Docker Compose), shorter timeouts
 *   (30s), 2 retries, single worker for stability
 *
 * COMMANDS:
 *   npx playwright test           # Run all tests
 *   npx playwright test --debug   # Step-through debugger
 *   npx playwright test --ui      # Interactive UI mode
 *   npx playwright show-report    # View HTML report (CI)
 *
 * ADDING NEW TESTS:
 * 1. Create a new .spec.ts file in the e2e/ directory
 * 2. Use test.describe() to group related tests
 * 3. Use test.beforeEach() for shared setup (e.g., login)
 * 4. Keep tests independent — each should work in isolation
 * 5. Use page.waitForURL() instead of hard delays
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
