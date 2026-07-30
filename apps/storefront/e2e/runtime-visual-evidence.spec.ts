import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page, type Response, type TestInfo } from '@playwright/test'
import { source as axeSource } from 'axe-core'

type VisualViewport = {
    name: 'desktop' | 'tablet' | 'mobile'
    width: number
    height: number
}

type VisualRoute = {
    name: string
    path: string
    expectedStatus: number[]
    state: 'primary' | 'empty' | 'error' | 'form' | 'loading' | 'modal' | 'toast'
}

type LoadingStateSource = {
    name: string
    sourcePath: string
    state: 'loading'
    expectedPatterns: RegExp[]
}

type RuntimeLoadingState = {
    name: string
    startPath: string
    state: 'loading'
    minSkeletons: number
}

type InteractiveState = {
    name: string
    path: string
    state: 'modal' | 'toast'
}

type ProductRouteAvailability = {
    available: boolean
    reason?: string
}

type RuntimeVisualRouteRetryConfig = {
    maxAttempts: number
    fallbackDelayMs: number
    maxDelayMs: number
    maxTotalWaitMs: number
}

type DelayedRuntimeNavigation = {
    release: () => Promise<void>
}

type AxeViolation = {
    id: string
    impact: string | null
    description: string
    nodes: Array<{ target: string[] }>
}

declare global {
    interface Window {
        axe: {
            run: (
                context: Document | Element,
                options: {
                    runOnly: {
                        type: 'tag'
                        values: string[]
                    }
                }
            ) => Promise<{ violations: AxeViolation[] }>
        }
    }
}

const viewports: VisualViewport[] = [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 },
]

const routes: VisualRoute[] = [
    { name: 'home', path: '/es/', expectedStatus: [200], state: 'primary' },
    { name: 'products', path: '/es/productos', expectedStatus: [200], state: 'primary' },
    { name: 'cart-empty', path: '/es/carrito', expectedStatus: [200], state: 'empty' },
    { name: 'checkout-form-or-auth', path: '/es/checkout', expectedStatus: [200, 307, 308], state: 'form' },
    { name: 'not-found', path: '/es/visual-runtime-missing-route', expectedStatus: [404], state: 'error' },
]

const loadingStateSources: LoadingStateSource[] = [
    {
        name: 'cart-loading',
        sourcePath: 'apps/storefront/src/app/[lang]/(shop)/carrito/loading.tsx',
        state: 'loading',
        expectedPatterns: [/Skeleton/, /CarritoLoading/],
    },
    {
        name: 'checkout-loading',
        sourcePath: 'apps/storefront/src/app/[lang]/(shop)/checkout/loading.tsx',
        state: 'loading',
        expectedPatterns: [/CheckoutLoading/, /animate-pulse|bg-sf-2/],
    },
    {
        name: 'product-detail-loading',
        sourcePath: 'apps/storefront/src/app/[lang]/(shop)/productos/[handle]/loading.tsx',
        state: 'loading',
        expectedPatterns: [/Skeleton/, /ProductDetailLoading/],
    },
]

const runtimeLoadingStates: RuntimeLoadingState[] = [
    {
        name: 'product-detail-loading',
        startPath: '/es/productos',
        state: 'loading',
        minSkeletons: 5,
    },
]

const _quickViewTranslationKey = 'product.quickView'
const quickViewLabelPattern = /vista rápida|quick view|aperçu rapide|anteprima rapida|schnellansicht/i

const interactiveStates: InteractiveState[] = [
    { name: 'product-quick-view', path: '/es/productos', state: 'modal' },
    { name: 'add-to-cart-feedback', path: '/es/productos', state: 'toast' },
]

function repoRoot() {
    return process.cwd().endsWith('/apps/storefront') ? resolve(process.cwd(), '..', '..') : process.cwd()
}

function shouldRequireInteractiveStates() {
    const baseUrl = process.env.BNS_360_BASE_URL ?? process.env.NEXT_PUBLIC_STORE_URL ?? process.env.BASE_URL ?? ''
    const targetsRemoteRuntime = /^https?:\/\//i.test(baseUrl) && !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(baseUrl)

    return process.env.BNS_RUNTIME_REQUIRE_INTERACTIVE_STATES === '1' || targetsRemoteRuntime
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function getRuntimeVisualRouteRetryConfig(env = process.env): RuntimeVisualRouteRetryConfig {
    return {
        maxAttempts: parsePositiveInteger(env.BNS_RUNTIME_ROUTE_RETRY_MAX_ATTEMPTS, 3),
        fallbackDelayMs: parsePositiveInteger(env.BNS_RUNTIME_ROUTE_RETRY_FALLBACK_MS, 5_000),
        maxDelayMs: parsePositiveInteger(env.BNS_RUNTIME_ROUTE_RETRY_MAX_DELAY_MS, 65_000),
        maxTotalWaitMs: parsePositiveInteger(env.BNS_RUNTIME_ROUTE_RETRY_MAX_TOTAL_WAIT_MS, 75_000),
    }
}

function resolveRuntimeVisualRetryAfterMs(
    retryAfter: string | null | undefined,
    config: RuntimeVisualRouteRetryConfig
) {
    if (!retryAfter) return config.fallbackDelayMs

    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.min(Math.round(seconds * 1000), config.maxDelayMs)
    }

    const retryAt = Date.parse(retryAfter)
    if (Number.isFinite(retryAt)) {
        return Math.min(Math.max(retryAt - Date.now(), 0), config.maxDelayMs)
    }

    return config.fallbackDelayMs
}

function isRetriableRuntimeVisualStatus(status: number | undefined) {
    return status === 429 || status === 502 || status === 503 || status === 504
}

async function gotoRuntimeVisualRouteWithBackoff(
    page: Page,
    path: string,
    expectedStatus: number[]
): Promise<Response | null> {
    const config = getRuntimeVisualRouteRetryConfig()
    let response: Response | null = null
    let totalWaitMs = 0

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        response = await page.goto(path, { waitUntil: 'domcontentloaded' })
        const status = response?.status() ?? 200

        if (expectedStatus.includes(status) || !isRetriableRuntimeVisualStatus(status) || attempt === config.maxAttempts) {
            return response
        }

        const waitMs = resolveRuntimeVisualRetryAfterMs(response?.headers()['retry-after'], config)
        const remainingWaitMs = config.maxTotalWaitMs - totalWaitMs
        if (remainingWaitMs <= 0) return response

        const boundedWaitMs = Math.min(waitMs, remainingWaitMs)
        totalWaitMs += boundedWaitMs
        await page.waitForTimeout(boundedWaitMs)
    }

    return response
}

async function stabilizeRuntimeEvidencePage(page: Page) {
    await page.addStyleTag({
        content: `
            [data-runtime-evidence-stable-motion],
            [data-runtime-evidence-stable-motion] *,
            [data-runtime-evidence-stable-motion] *::before,
            [data-runtime-evidence-stable-motion] *::after {
                animation: none !important;
                transition: none !important;
                scroll-behavior: auto !important;
            }

            [data-runtime-evidence-stable-motion] .animate-slide-up-stagger,
            [data-runtime-evidence-stable-motion] .animate-fade-in,
            [data-runtime-evidence-stable-motion] .animate-slide-in-left,
            [data-runtime-evidence-stable-motion] .animate-pulse {
                opacity: 1 !important;
                transform: none !important;
            }
        `,
    })

    await page.evaluate(() => {
        document.documentElement.setAttribute('data-runtime-evidence-stable-motion', 'true')
    })
}

async function assertNoCriticalAxeViolations(page: Page, contextSelector = 'main, [role="main"]') {
    const axeReady = await page.evaluate(() => typeof window.axe?.run === 'function')
    expect(axeReady).toBe(true)

    const results = await page.evaluate((selector) =>
        window.axe.run(document.querySelector(selector) ?? document, {
            runOnly: {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa'],
            },
        }),
        contextSelector
    )
    const blockingViolations = results.violations.filter((violation) =>
        violation.impact === 'critical' || violation.impact === 'serious'
    )

    expect(blockingViolations).toEqual([])
    return results
}

async function assertNoHorizontalOverflow(page: Page) {
    const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
    }))

    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 2)
}

async function assertNoAppErrorShell(page: Page) {
    const bodyText = await page.locator('body').innerText()

    expect(bodyText).not.toMatch(/Application error|Unhandled Runtime Error|Hydration failed/i)
}

function collectBlockingConsoleMessages(page: Page) {
    const messages: string[] = []

    page.on('console', (message) => {
        if (!['error', 'warning'].includes(message.type())) return

        const text = message.text()
        if (/Hydration failed|A tree hydrated|Unhandled Runtime Error|Application error/i.test(text)) {
            messages.push(text)
        }
    })

    return messages
}

async function isMaintenanceScreen(page: Page) {
    return page
        .getByRole('heading', { name: /mantenimiento|maintenance/i })
        .isVisible()
        .catch(() => false)
}

async function assertVisibleState(page: Page, route: VisualRoute) {
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 20_000 })

    if (await isMaintenanceScreen(page)) {
        await expect(page.locator('main')).toContainText(/mantenimiento|maintenance/i)
        return
    }

    if (route.state === 'primary' && route.name === 'home') {
        await expect(page.locator('[data-testid="hero-section"]')).toBeVisible({ timeout: 20_000 })
        await expect(page.locator('[data-testid="main-header"]')).toBeVisible({ timeout: 10_000 })
    }

    if (route.state === 'primary' && route.name === 'products') {
        await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({ timeout: 20_000 })
        await page.getByRole('button', { name: /filtrar|filter/i }).click()
        await expect(page.locator('main')).toContainText(/rango de precio|price range|prix|preis/i)
        await expect(page.getByRole('spinbutton').first()).toBeVisible()
    }

    if (route.state === 'empty') {
        await expect(page.locator('main')).toContainText(/carrito|cart|empty|vacío/i)
    }

    if (route.state === 'form') {
        await expect(page.locator('main')).toContainText(/checkout|login|iniciar|correo|email|pedido|carrito|cart|productos/i)
    }

    if (route.state === 'error') {
        await expect(page.locator('main, body').first()).toContainText(/404|not found|no encontrada|volver/i)
    }
}

async function attachRuntimeEvidence(
    page: Page,
    testInfo: TestInfo,
    names: { screenshot: string; axe: string },
    axeContext = 'main, [role="main"]'
) {
    await assertNoAppErrorShell(page)
    await assertNoHorizontalOverflow(page)
    await stabilizeRuntimeEvidencePage(page)

    const screenshot = await page.screenshot({ fullPage: true })
    await testInfo.attach(names.screenshot, {
        body: screenshot,
        contentType: 'image/png',
    })

    const axeResults = await assertNoCriticalAxeViolations(page, axeContext)
    await testInfo.attach(names.axe, {
        body: JSON.stringify(axeResults, null, 2),
        contentType: 'application/json',
    })
}

async function delayNextRuntimeVisualNavigation(page: Page, targetPath: string): Promise<DelayedRuntimeNavigation> {
    const normalizedTargetPath = `/${targetPath.replace(/^\//, '').split('?')[0]}`
    let releaseNavigation!: () => void
    let routeWasDelayed = false
    const releasePromise = new Promise<void>((resolve) => {
        releaseNavigation = resolve
    })

    await page.route(
        (url) => url.pathname === normalizedTargetPath,
        async (route) => {
            routeWasDelayed = true
            await releasePromise
            await route.continue().catch(() => {})
        },
        { times: 1 }
    )

    return {
        release: async () => {
            releaseNavigation()
            if (routeWasDelayed) {
                await page.waitForLoadState('domcontentloaded', { timeout: 5_000 }).catch(() => {})
            }
        },
    }
}

async function prepareProductsRoute(
    page: Page,
    testInfo: TestInfo,
    state: InteractiveState,
    viewport: VisualViewport
): Promise<ProductRouteAvailability> {
    const response = await gotoRuntimeVisualRouteWithBackoff(page, '/es/productos', [200])
    expect(response?.status() ?? 200).toBe(200)

    if (await isMaintenanceScreen(page)) {
        const reason = 'interactive state evidence requires product runtime data; products route is in maintenance'
        await testInfo.attach(`visual-state-${state.state}-${state.name}-${viewport.name}-runtime-unavailable`, {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
        })

        return { available: false, reason }
    }

    const firstCard = page.locator('[data-testid="product-card"]').first()
    await expect(firstCard).toBeVisible({ timeout: 20_000 })

    return { available: true }
}

async function openFirstProductDetailWithDelayedRuntimeNavigation(
    page: Page,
    testInfo: TestInfo,
    state: RuntimeLoadingState,
    viewport: VisualViewport
): Promise<ProductRouteAvailability & { delayedNavigation?: DelayedRuntimeNavigation }> {
    const response = await gotoRuntimeVisualRouteWithBackoff(page, '/es/productos', [200])
    expect(response?.status() ?? 200).toBe(200)

    if (await isMaintenanceScreen(page)) {
        const reason = 'loading state evidence requires product runtime data; products route is in maintenance'
        await testInfo.attach(`visual-state-${state.state}-${state.name}-${viewport.name}-runtime-unavailable`, {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
        })

        return { available: false, reason }
    }

    const firstCard = page.locator('[data-testid="product-card"]').first()
    const hasProductCard = await firstCard.isVisible({ timeout: 20_000 }).catch(() => false)
    if (!hasProductCard) {
        const reason = 'loading state evidence requires product runtime data; no product cards are visible'
        await testInfo.attach(`visual-state-${state.state}-${state.name}-${viewport.name}-runtime-unavailable`, {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
        })

        return { available: false, reason }
    }

    const href = await firstCard.getAttribute('href')
    expect(href).toBeTruthy()

    const productPath = `/${href!.replace(/^\//, '')}`
    const delayedNavigation = await delayNextRuntimeVisualNavigation(page, productPath)
    await firstCard.click({ noWaitAfter: true })
    return { available: true, delayedNavigation }
}

async function openFirstProductDetail(page: Page) {
    const firstCard = page.locator('[data-testid="product-card"]').first()
    const href = await firstCard.getAttribute('href')
    expect(href).toBeTruthy()

    const productPath = `/${href!.replace(/^\//, '')}`
    const response = await gotoRuntimeVisualRouteWithBackoff(page, productPath, [200])
    expect(response?.status() ?? 200).toBe(200)
}

async function assertModalState(page: Page) {
    const firstArticle = page.locator('article').first()
    const quickViewButton = firstArticle.getByRole('button', { name: quickViewLabelPattern }).first()

    await firstArticle.hover()
    await expect(quickViewButton).toBeVisible({ timeout: 10_000 })
    await expect(quickViewButton).toBeEnabled({ timeout: 10_000 })
    await quickViewButton.click()

    const dialog = page.locator('[role="dialog"][aria-modal="true"]').first()
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await expect(dialog).toContainText(/\S+/)
}

async function assertToastState(page: Page) {
    await openFirstProductDetail(page)

    const addToCart = page.locator('[data-testid="add-to-cart"]')
    await expect(addToCart).toBeVisible({ timeout: 15_000 })
    await addToCart.click()

    const toastOrDrawer = page.locator('[role="alert"], [data-testid="cart-drawer"]')
    await expect(toastOrDrawer.first()).toBeVisible({ timeout: 10_000 })
}

async function assertVisibleLoadingState(page: Page, state: RuntimeLoadingState) {
    const skeletons = page.locator('main .skeleton')
    await expect(skeletons.nth(state.minSkeletons - 1)).toBeVisible({ timeout: 5_000 })
}

test.describe('runtime visual evidence', () => {
    test.describe.configure({ mode: 'serial' })
    test.setTimeout(120_000)
    const loadingEvidenceViewport = viewports.find((viewport) => viewport.name === 'desktop') ?? viewports[0]

    test('loading route components expose source-backed visual states', async ({}, testInfo) => {
        const evidence = loadingStateSources.map((source) => {
            const absolutePath = resolve(repoRoot(), source.sourcePath)
            expect(existsSync(absolutePath), source.sourcePath).toBe(true)

            const content = readFileSync(absolutePath, 'utf8')
            for (const pattern of source.expectedPatterns) {
                expect(content, source.sourcePath).toMatch(pattern)
            }

            return {
                name: source.name,
                sourcePath: source.sourcePath,
                state: source.state,
                covered: true,
            }
        })

        await testInfo.attach('visual-state-loading-source-backed', {
            body: JSON.stringify(evidence, null, 2),
            contentType: 'application/json',
        })
    })

    for (const state of runtimeLoadingStates) {
        test(`${state.name} renders ${state.state} visual evidence on ${loadingEvidenceViewport.name}`, async ({ page }, testInfo) => {
            const blockingConsoleMessages = collectBlockingConsoleMessages(page)
            await page.addInitScript({ content: axeSource })
            await page.setViewportSize({ width: loadingEvidenceViewport.width, height: loadingEvidenceViewport.height })
            let delayedNavigation: DelayedRuntimeNavigation | undefined

            try {
                const availability = await openFirstProductDetailWithDelayedRuntimeNavigation(
                    page,
                    testInfo,
                    state,
                    loadingEvidenceViewport
                )
                delayedNavigation = availability.delayedNavigation
                if (!availability.available) {
                    if (shouldRequireInteractiveStates()) {
                        throw new Error(availability.reason)
                    }

                    test.skip(true, availability.reason)
                }

                await assertVisibleLoadingState(page, state)
                await attachRuntimeEvidence(page, testInfo, {
                    screenshot: `visual-state-loading-${state.name}-${loadingEvidenceViewport.name}`,
                    axe: `axe-core-visual-state-loading-${state.name}-${loadingEvidenceViewport.name}`,
                })
                expect(blockingConsoleMessages).toEqual([])
            } finally {
                await delayedNavigation?.release()
                await page.unrouteAll({ behavior: 'ignoreErrors' })
            }
        })
    }

    for (const viewport of viewports) {
        for (const route of routes) {
            test(`${route.name} renders visual evidence on ${viewport.name}`, async ({ page }, testInfo) => {
                const blockingConsoleMessages = collectBlockingConsoleMessages(page)
                await page.addInitScript({ content: axeSource })
                await page.setViewportSize({ width: viewport.width, height: viewport.height })

                const response = await gotoRuntimeVisualRouteWithBackoff(page, route.path, route.expectedStatus)
                expect(route.expectedStatus).toContain(response?.status() ?? 200)
                await assertVisibleState(page, route)
                await assertNoAppErrorShell(page)
                await assertNoHorizontalOverflow(page)
                await stabilizeRuntimeEvidencePage(page)
                expect(blockingConsoleMessages).toEqual([])

                const screenshot = await page.screenshot({ fullPage: true })
                await testInfo.attach(`visual-${route.name}-${viewport.name}`, {
                    body: screenshot,
                    contentType: 'image/png',
                })

                const axeResults = await assertNoCriticalAxeViolations(page)
                await testInfo.attach(`axe-core-${route.name}-${viewport.name}`, {
                    body: JSON.stringify(axeResults, null, 2),
                    contentType: 'application/json',
                })
            })
        }

        for (const state of interactiveStates) {
            test(`${state.name} renders ${state.state} visual evidence on ${viewport.name}`, async ({ page }, testInfo) => {
                const blockingConsoleMessages = collectBlockingConsoleMessages(page)
                await page.addInitScript({ content: axeSource })
                await page.setViewportSize({ width: viewport.width, height: viewport.height })
                const availability = await prepareProductsRoute(page, testInfo, state, viewport)

                if (!availability.available) {
                    if (shouldRequireInteractiveStates()) {
                        throw new Error(availability.reason)
                    }

                    test.skip(true, availability.reason)
                }

                if (state.state === 'modal') {
                    await assertModalState(page)
                    await attachRuntimeEvidence(
                        page,
                        testInfo,
                        {
                            screenshot: `visual-state-modal-${state.name}-${viewport.name}`,
                            axe: `axe-core-visual-state-modal-${state.name}-${viewport.name}`,
                        },
                        '.quick-view-modal'
                    )
                }

                if (state.state === 'toast') {
                    await assertToastState(page)
                    await attachRuntimeEvidence(
                        page,
                        testInfo,
                        {
                            screenshot: `visual-state-toast-${state.name}-${viewport.name}`,
                            axe: `axe-core-visual-state-toast-${state.name}-${viewport.name}`,
                        },
                        'body'
                    )
                }

                expect(blockingConsoleMessages).toEqual([])
            })
        }
    }
})
