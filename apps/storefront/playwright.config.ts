import { loadEnvConfig } from '@next/env'
import { defineConfig, devices } from '@playwright/test'

loadEnvConfig(process.cwd())

const resolvedBaseUrl =
    process.env.BNS_360_BASE_URL ||
    process.env.NEXT_PUBLIC_STORE_URL ||
    process.env.BASE_URL ||
    'http://localhost:3000'

const shouldStartLocalServer =
    !process.env.CI &&
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(resolvedBaseUrl)

function parsePositiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const resolvedTestTimeout = parsePositiveInteger(
    process.env.BNS_360_TEST_TIMEOUT_MS,
    process.env.CI ? 30_000 : 60_000
)
const resolvedNavigationTimeout = parsePositiveInteger(
    process.env.BNS_360_NAVIGATION_TIMEOUT_MS,
    process.env.CI ? 15_000 : 30_000
)

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
    timeout: resolvedTestTimeout,

    use: {
        baseURL: resolvedBaseUrl,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        navigationTimeout: resolvedNavigationTimeout,
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
    webServer: shouldStartLocalServer
        ? {
            command: 'pnpm dev',
            url: 'http://localhost:3000',
            reuseExistingServer: true,
            timeout: 60_000,
        }
        : undefined, // In CI or remote-runtime mode, services are already available
})
