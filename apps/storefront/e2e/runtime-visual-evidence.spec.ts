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
    path: string
    requestPath: string
    state: 'loading'
    buttonTestId: string
    spinnerTestId: string
}

type OrderLookupRuntimeState = {
    loadingName: string
    notFoundName: string
    path: string
    requestPath: string
    formTestId: string
    emailTestId: string
    orderIdTestId: string
    buttonTestId: string
    spinnerTestId: string
    errorTestId: string
}

type CheckoutPromotionRuntimeState = {
    loadingName: string
    errorName: string
    path: string
    requestPath: string
    formTestId: string
    toggleTestId: string
    inputTestId: string
    buttonTestId: string
    spinnerTestId: string
    errorTestId: string
}

type CartItemUpdateRuntimeState = {
    loadingName: string
    errorName: string
    removeLoadingName: string
    removeErrorName: string
    path: string
    actionPath: string
    buttonTestId: string
    spinnerTestId: string
    removeButtonTestId: string
    removeSpinnerTestId: string
    errorToastTestId: string
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

type DelayedRuntimeFetch = {
    release: () => Promise<void>
}

type InterceptedRuntimeFetch = DelayedRuntimeFetch & {
    waitUntilIntercepted: () => Promise<void>
}

type InterceptedRuntimeAction = {
    waitUntilIntercepted: () => Promise<void>
    abort: () => Promise<void>
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
        name: 'newsletter-submit-loading',
        path: '/es/',
        requestPath: '/api/newsletter',
        state: 'loading',
        buttonTestId: 'newsletter-submit-button',
        spinnerTestId: 'newsletter-submit-spinner',
    },
]

const orderLookupRuntimeState: OrderLookupRuntimeState = {
    loadingName: 'order-lookup-loading',
    notFoundName: 'order-lookup-not-found',
    path: '/es/pedido',
    requestPath: '/api/orders/lookup',
    formTestId: 'order-lookup-form',
    emailTestId: 'order-lookup-email',
    orderIdTestId: 'order-lookup-id',
    buttonTestId: 'order-lookup-submit',
    spinnerTestId: 'order-lookup-spinner',
    errorTestId: 'order-lookup-error',
}

const checkoutPromotionRuntimeState: CheckoutPromotionRuntimeState = {
    loadingName: 'checkout-promotion-loading',
    errorName: 'checkout-promotion-error',
    path: '/es/checkout',
    requestPath: '/api/cart/promotions',
    formTestId: 'checkout-promotion-form',
    toggleTestId: 'checkout-promotion-toggle',
    inputTestId: 'checkout-promotion-input',
    buttonTestId: 'checkout-promotion-apply',
    spinnerTestId: 'checkout-promotion-spinner',
    errorTestId: 'checkout-promotion-error',
}

const cartItemUpdateRuntimeState: CartItemUpdateRuntimeState = {
    loadingName: 'cart-item-update-loading',
    errorName: 'cart-item-update-error',
    removeLoadingName: 'cart-item-remove-loading',
    removeErrorName: 'cart-item-remove-error',
    path: '/es/carrito',
    actionPath: '/es/carrito',
    buttonTestId: 'cart-item-increase',
    spinnerTestId: 'cart-item-increase-spinner',
    removeButtonTestId: 'cart-item-remove',
    removeSpinnerTestId: 'cart-item-remove-spinner',
    errorToastTestId: 'toast-error',
}

const RUNTIME_CART_SETUP_MAX_ATTEMPTS = 3
const RUNTIME_CART_HYDRATION_MAX_ATTEMPTS = 2
const RUNTIME_CART_RETRY_DELAY_MS = 2_000

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

function shouldRequireOrderLookupStates() {
    return process.env.BNS_RUNTIME_REQUIRE_ORDER_LOOKUP_STATES === '1'
        || shouldRequireInteractiveStates()
}

function shouldRequireCheckoutStates() {
    return process.env.BNS_RUNTIME_REQUIRE_CHECKOUT_STATES === '1'
        || shouldRequireInteractiveStates()
}

function shouldRequireCartStates() {
    return process.env.BNS_RUNTIME_REQUIRE_CART_STATES === '1'
        || shouldRequireInteractiveStates()
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

async function assertMobileStickyCtaDoesNotOverlapBottomNav(page: Page) {
    const primaryCta = page.getByTestId('product-primary-cta')
    await expect(primaryCta).toBeVisible({ timeout: 10_000 })
    await primaryCta.scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' }))
    await expect(primaryCta).not.toBeInViewport()

    const stickyCta = page.locator('.product-sticky-cta')
    const bottomNav = page.locator('.bottom-nav')
    await expect(stickyCta).toBeVisible({ timeout: 10_000 })
    await expect(bottomNav).toBeVisible({ timeout: 10_000 })

    const stickyRect = await stickyCta.boundingBox()
    const navRect = await bottomNav.boundingBox()
    expect(stickyRect).not.toBeNull()
    expect(navRect).not.toBeNull()
    expect(stickyRect!.y + stickyRect!.height).toBeLessThanOrEqual(navRect!.y + 1)
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

async function delayNextRuntimeVisualFetch(page: Page, targetPath: string): Promise<DelayedRuntimeFetch> {
    const normalizedTargetPath = `/${targetPath.replace(/^\//, '').split('?')[0]}`
    let releaseFetch!: () => void
    let routeWasDelayed = false
    const releasePromise = new Promise<void>((resolve) => {
        releaseFetch = resolve
    })

    await page.route(
        (url) => url.pathname === normalizedTargetPath,
        async (route) => {
            routeWasDelayed = true
            await releasePromise
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true }),
            }).catch(() => {})
        },
        { times: 1 }
    )

    return {
        release: async () => {
            releaseFetch()
            if (routeWasDelayed) {
                await page.waitForTimeout(100)
            }
        },
    }
}

async function prepareNewsletterSubmitLoadingState(
    page: Page,
    testInfo: TestInfo,
    state: RuntimeLoadingState,
    viewport: VisualViewport
): Promise<ProductRouteAvailability & { delayedFetch?: DelayedRuntimeFetch }> {
    const response = await gotoRuntimeVisualRouteWithBackoff(page, state.path, [200])
    expect(response?.status() ?? 200).toBe(200)

    const button = page.locator(`[data-testid="${state.buttonTestId}"]`).first()
    const hasNewsletterSubmit = await button.isVisible({ timeout: 20_000 }).catch(() => false)
    if (!hasNewsletterSubmit) {
        const reason = 'loading state evidence requires newsletter runtime UI; newsletter submit is not visible'
        await testInfo.attach(`visual-state-${state.state}-${state.name}-${viewport.name}-runtime-unavailable`, {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
        })

        return { available: false, reason }
    }

    await expect(page.getByTestId('newsletter-signup-form')).toHaveAttribute('data-runtime-ready', 'true')
    const delayedFetch = await delayNextRuntimeVisualFetch(page, state.requestPath)
    await button.scrollIntoViewIfNeeded()
    await page.locator('footer input[name="email"]').first().fill(`runtime-evidence-${Date.now()}@example.test`)
    await button.click()

    return { available: true, delayedFetch }
}

async function delayNextOrderLookupFetch(
    page: Page,
    targetPath: string
): Promise<InterceptedRuntimeFetch> {
    const normalizedTargetPath = `/${targetPath.replace(/^\//, '').split('?')[0]}`
    let releaseFetch!: () => void
    let released = false
    let routeWasDelayed = false
    const releasePromise = new Promise<void>((resolve) => {
        releaseFetch = resolve
    })

    await page.route(
        (url) => url.pathname === normalizedTargetPath,
        async (route) => {
            if (route.request().method() !== 'POST') {
                await route.continue()
                return
            }

            routeWasDelayed = true
            await releasePromise
            await route.fulfill({
                status: 404,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'order not found' }),
            }).catch(() => {})
        }
    )

    return {
        waitUntilIntercepted: async () => {
            await expect.poll(
                () => routeWasDelayed,
                {
                    message: `expected POST ${normalizedTargetPath} to be intercepted`,
                    timeout: 5_000,
                }
            ).toBe(true)
        },
        release: async () => {
            if (!released) {
                released = true
                releaseFetch()
            }
            if (routeWasDelayed) {
                await page.waitForTimeout(100)
            }
        },
    }
}

async function prepareOrderLookupLoadingState(
    page: Page,
    testInfo: TestInfo,
    state: OrderLookupRuntimeState,
    viewport: VisualViewport
): Promise<ProductRouteAvailability & { delayedFetch?: InterceptedRuntimeFetch }> {
    const response = await gotoRuntimeVisualRouteWithBackoff(page, state.path, [200])
    expect(response?.status() ?? 200).toBe(200)

    const button = page.getByTestId(state.buttonTestId)
    const hasOrderLookup = await button.isVisible({ timeout: 20_000 }).catch(() => false)
    if (!hasOrderLookup) {
        const reason = 'order lookup runtime evidence requires the guest lookup form'
        await testInfo.attach(`visual-state-loading-order-lookup-${viewport.name}-runtime-unavailable`, {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
        })

        return { available: false, reason }
    }

    await expect(page.getByTestId(state.formTestId)).toHaveAttribute('data-runtime-ready', 'true')
    const delayedFetch = await delayNextOrderLookupFetch(page, state.requestPath)
    await page.getByTestId(state.emailTestId).fill(`runtime-evidence-${Date.now()}@example.test`)
    await page.getByTestId(state.orderIdTestId).fill('999999999')
    await button.click()

    return { available: true, delayedFetch }
}

async function delayNextCheckoutPromotionFetch(
    page: Page,
    targetPath: string
): Promise<InterceptedRuntimeFetch> {
    const normalizedTargetPath = `/${targetPath.replace(/^\//, '').split('?')[0]}`
    let releaseFetch!: () => void
    let released = false
    let routeWasDelayed = false
    const releasePromise = new Promise<void>((resolve) => {
        releaseFetch = resolve
    })

    await page.route(
        (url) => url.pathname === normalizedTargetPath,
        async (route) => {
            if (route.request().method() !== 'POST') {
                await route.continue()
                return
            }

            routeWasDelayed = true
            await releasePromise
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Runtime evidence invalid promotion code' }),
            }).catch(() => {})
        }
    )

    return {
        waitUntilIntercepted: async () => {
            await expect.poll(
                () => routeWasDelayed,
                {
                    message: `expected POST ${normalizedTargetPath} to be intercepted`,
                    timeout: 5_000,
                }
            ).toBe(true)
        },
        release: async () => {
            if (!released) {
                released = true
                releaseFetch()
            }
            if (routeWasDelayed) {
                await page.waitForTimeout(100)
            }
        },
    }
}

async function addRuntimeEvidenceProductToCart(
    page: Page,
    failureMessage: string
) {
    const addToCart = page.locator('[data-testid="add-to-cart"]:visible').first()
    await expect(addToCart).toBeVisible({ timeout: 15_000 })

    for (let attempt = 1; attempt <= RUNTIME_CART_SETUP_MAX_ATTEMPTS; attempt += 1) {
        await expect(addToCart).toBeEnabled({ timeout: 10_000 })
        await addToCart.click()

        const cartCreated = await page.waitForFunction(
            () => localStorage.getItem('bns-cart-id') !== null,
            undefined,
            { timeout: 10_000 }
        ).then(() => true).catch(() => false)
        if (cartCreated) return

        if (attempt < RUNTIME_CART_SETUP_MAX_ATTEMPTS) {
            await page.waitForTimeout(RUNTIME_CART_RETRY_DELAY_MS * attempt)
        }
    }

    throw new Error(failureMessage)
}

async function waitForHydratedRuntimeCartItem(
    page: Page,
    state: CartItemUpdateRuntimeState
) {
    for (let attempt = 1; attempt <= RUNTIME_CART_HYDRATION_MAX_ATTEMPTS; attempt += 1) {
        const hydrated = await page.getByTestId(state.buttonTestId).first()
            .waitFor({ state: 'visible', timeout: 20_000 })
            .then(() => true)
            .catch(() => false)
        if (hydrated) return true

        const cartId = await page.evaluate(() => localStorage.getItem('bns-cart-id'))
        if (!cartId || attempt === RUNTIME_CART_HYDRATION_MAX_ATTEMPTS) break

        await page.waitForTimeout(RUNTIME_CART_RETRY_DELAY_MS * attempt)
        const response = await gotoRuntimeVisualRouteWithBackoff(page, state.path, [200])
        expect(response?.status() ?? 200).toBe(200)
    }

    return false
}

async function prepareCheckoutPromotionLoadingState(
    page: Page,
    testInfo: TestInfo,
    state: CheckoutPromotionRuntimeState,
    viewport: VisualViewport,
    onCartCreated: () => void
): Promise<ProductRouteAvailability & { delayedFetch?: InterceptedRuntimeFetch }> {
    const productsAvailability = await prepareProductsRoute(
        page,
        testInfo,
        { name: state.loadingName, path: '/es/productos', state: 'toast' },
        viewport
    )
    if (!productsAvailability.available) return productsAvailability

    await openFirstProductDetail(page)
    await addRuntimeEvidenceProductToCart(
        page,
        'add-to-cart should persist the runtime evidence cart before checkout navigation'
    )
    onCartCreated()

    const response = await gotoRuntimeVisualRouteWithBackoff(page, state.path, [200])
    expect(response?.status() ?? 200).toBe(200)

    const form = page.getByTestId(state.formTestId)
    const hasPromotionInput = await form
        .waitFor({ state: 'visible', timeout: 20_000 })
        .then(() => true)
        .catch(() => false)
    if (!hasPromotionInput) {
        const reason = 'checkout promotion evidence requires a hydrated cart and enabled promotion UI'
        await testInfo.attach(`visual-state-loading-checkout-promotion-${viewport.name}-runtime-unavailable`, {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
        })

        return { available: false, reason }
    }

    await expect(form).toHaveAttribute('data-runtime-ready', 'true')
    await page.getByTestId(state.toggleTestId).click()
    await page.getByTestId(state.inputTestId).fill('RUNTIME-EVIDENCE-NOT-REAL')

    const delayedFetch = await delayNextCheckoutPromotionFetch(page, state.requestPath)
    const button = page.getByTestId(state.buttonTestId)
    await button.scrollIntoViewIfNeeded()
    await button.click()

    return { available: true, delayedFetch }
}

async function delayNextCartAction(
    page: Page,
    targetPath: string
): Promise<InterceptedRuntimeAction> {
    const normalizedTargetPath = `/${targetPath.replace(/^\//, '').split('?')[0]}`
    let abortAction!: () => void
    let aborted = false
    let actionWasDelayed = false
    const abortPromise = new Promise<void>((resolve) => {
        abortAction = resolve
    })

    await page.route(
        (url) => url.pathname === normalizedTargetPath,
        async (route) => {
            const request = route.request()
            if (request.method() !== 'POST' || !request.headers()['next-action']) {
                await route.continue()
                return
            }

            actionWasDelayed = true
            await abortPromise
            await route.abort('failed').catch(() => {})
        }
    )

    return {
        waitUntilIntercepted: async () => {
            await expect.poll(
                () => actionWasDelayed,
                {
                    message: `expected a Next.js Server Action POST to ${normalizedTargetPath}`,
                    timeout: 5_000,
                }
            ).toBe(true)
        },
        abort: async () => {
            if (!aborted) {
                aborted = true
                abortAction()
            }
            if (actionWasDelayed) {
                await page.waitForTimeout(100)
            }
        },
    }
}

async function prepareCartItemUpdateLoadingState(
    page: Page,
    testInfo: TestInfo,
    state: CartItemUpdateRuntimeState,
    viewport: VisualViewport
): Promise<ProductRouteAvailability & { delayedAction?: InterceptedRuntimeAction }> {
    const response = await gotoRuntimeVisualRouteWithBackoff(page, state.path, [200])
    expect(response?.status() ?? 200).toBe(200)

    const button = page.getByTestId(state.buttonTestId).first()
    const hasCartItem = await waitForHydratedRuntimeCartItem(page, state)
    if (!hasCartItem) {
        const reason = 'cart item update evidence requires a hydrated runtime cart item'
        await testInfo.attach(`visual-state-loading-cart-item-update-${viewport.name}-runtime-unavailable`, {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
        })

        return { available: false, reason }
    }

    const delayedAction = await delayNextCartAction(page, state.actionPath)
    await button.scrollIntoViewIfNeeded()
    await button.click()

    return { available: true, delayedAction }
}

async function prepareCartItemRemoveLoadingState(
    page: Page,
    testInfo: TestInfo,
    state: CartItemUpdateRuntimeState,
    viewport: VisualViewport
): Promise<ProductRouteAvailability & { delayedAction?: InterceptedRuntimeAction }> {
    const response = await gotoRuntimeVisualRouteWithBackoff(page, state.path, [200])
    expect(response?.status() ?? 200).toBe(200)

    const button = page.getByTestId(state.removeButtonTestId).first()
    const hasCartItem = await waitForHydratedRuntimeCartItem(page, state)
    if (!hasCartItem) {
        const reason = 'cart item remove evidence requires a hydrated runtime cart item'
        await testInfo.attach(`visual-state-loading-cart-item-remove-${viewport.name}-runtime-unavailable`, {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
        })

        return { available: false, reason }
    }

    const delayedAction = await delayNextCartAction(page, state.actionPath)
    await button.scrollIntoViewIfNeeded()
    await button.click()

    return { available: true, delayedAction }
}

async function cleanupRuntimeEvidenceCart(page: Page, state: CartItemUpdateRuntimeState) {
    const response = await gotoRuntimeVisualRouteWithBackoff(page, '/es/carrito', [200])
    expect(response?.status() ?? 200).toBe(200)

    const hydrated = await waitForHydratedRuntimeCartItem(page, state)
    expect(hydrated, 'runtime evidence cart should hydrate before cleanup').toBe(true)

    const removeButtons = page.getByTestId('cart-item-remove')
    await expect(removeButtons.first()).toBeVisible()

    for (let remainingAttempts = 10; remainingAttempts > 0; remainingAttempts -= 1) {
        const previousCount = await removeButtons.count()
        if (previousCount === 0) break

        await removeButtons.first().click()
        await expect.poll(
            () => removeButtons.count(),
            {
                message: 'runtime evidence cart line item should be removed during cleanup',
                timeout: 10_000,
            }
        ).toBeLessThan(previousCount)
    }

    await expect(removeButtons).toHaveCount(0)
    await page.evaluate(() => localStorage.removeItem('bns-cart-id'))
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

    const addToCart = page.locator('[data-testid="add-to-cart"]:visible').first()
    await expect(addToCart).toBeVisible({ timeout: 15_000 })
    await addToCart.click()

    const toastOrDrawer = page.locator('[role="alert"], [data-testid="cart-drawer"]')
    await expect(toastOrDrawer.first()).toBeVisible({ timeout: 10_000 })
}

async function assertVisibleLoadingState(page: Page, state: RuntimeLoadingState) {
    const button = page.locator(`[data-testid="${state.buttonTestId}"]`).first()
    await expect(button).toBeDisabled({ timeout: 5_000 })
    await expect(page.locator(`[data-testid="${state.spinnerTestId}"]`).first()).toBeVisible({ timeout: 5_000 })
}

test.describe('runtime visual evidence', () => {
    test.describe.configure({ mode: 'serial' })
    test.setTimeout(240_000)
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
            let delayedFetch: DelayedRuntimeFetch | undefined

            try {
                const availability = await prepareNewsletterSubmitLoadingState(
                    page,
                    testInfo,
                    state,
                    loadingEvidenceViewport
                )
                delayedFetch = availability.delayedFetch
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
                await delayedFetch?.release()
                await page.unrouteAll({ behavior: 'ignoreErrors' })
            }
        })
    }

    for (const viewport of viewports.filter(({ name }) => name === 'desktop' || name === 'mobile')) {
        test(`order lookup renders loading and not-found visual evidence on ${viewport.name}`, async ({ page }, testInfo) => {
            const blockingConsoleMessages = collectBlockingConsoleMessages(page)
            await page.addInitScript({ content: axeSource })
            await page.setViewportSize({ width: viewport.width, height: viewport.height })
            let delayedFetch: InterceptedRuntimeFetch | undefined

            try {
                const availability = await prepareOrderLookupLoadingState(
                    page,
                    testInfo,
                    orderLookupRuntimeState,
                    viewport
                )
                delayedFetch = availability.delayedFetch
                if (!availability.available) {
                    if (shouldRequireOrderLookupStates()) {
                        throw new Error(availability.reason)
                    }

                    test.skip(true, availability.reason)
                }

                expect(delayedFetch).toBeDefined()
                await delayedFetch!.waitUntilIntercepted()
                await expect(page.getByTestId(orderLookupRuntimeState.buttonTestId)).toBeDisabled()
                await expect(page.getByTestId(orderLookupRuntimeState.spinnerTestId)).toBeVisible()
                await attachRuntimeEvidence(page, testInfo, {
                    screenshot: `visual-state-loading-order-lookup-${viewport.name}`,
                    axe: `axe-core-visual-state-loading-order-lookup-${viewport.name}`,
                })

                await delayedFetch?.release()

                const error = page.getByTestId(orderLookupRuntimeState.errorTestId)
                await expect(error).toBeVisible({ timeout: 5_000 })
                await expect(error).toContainText(/\S+/)
                await expect(page.getByTestId(orderLookupRuntimeState.buttonTestId)).toBeEnabled()
                await attachRuntimeEvidence(page, testInfo, {
                    screenshot: `visual-state-error-order-lookup-${viewport.name}`,
                    axe: `axe-core-visual-state-error-order-lookup-${viewport.name}`,
                })
                expect(blockingConsoleMessages).toEqual([])
            } finally {
                await delayedFetch?.release()
                await page.unrouteAll({ behavior: 'ignoreErrors' })
            }
        })
    }

    for (const viewport of viewports.filter(({ name }) => name === 'desktop' || name === 'mobile')) {
        test(`checkout promotion and cart item update/remove render runtime evidence on ${viewport.name}`, async ({ page }, testInfo) => {
            const blockingConsoleMessages = collectBlockingConsoleMessages(page)
            await page.addInitScript({ content: axeSource })
            await page.setViewportSize({ width: viewport.width, height: viewport.height })
            let delayedFetch: InterceptedRuntimeFetch | undefined
            let delayedAction: InterceptedRuntimeAction | undefined
            let runtimeCartCreated = false

            try {
                const checkoutAvailability = await prepareCheckoutPromotionLoadingState(
                    page,
                    testInfo,
                    checkoutPromotionRuntimeState,
                    viewport,
                    () => {
                        runtimeCartCreated = true
                    }
                )
                delayedFetch = checkoutAvailability.delayedFetch
                if (!checkoutAvailability.available) {
                    if (shouldRequireCheckoutStates()) {
                        throw new Error(checkoutAvailability.reason)
                    }

                    test.skip(true, checkoutAvailability.reason)
                }

                expect(delayedFetch).toBeDefined()
                await delayedFetch!.waitUntilIntercepted()
                const applyButton = page.getByTestId(checkoutPromotionRuntimeState.buttonTestId)
                await expect(applyButton).toBeDisabled()
                await expect(applyButton).toHaveAccessibleName(/aplicar|apply/i)
                await expect(page.getByTestId(checkoutPromotionRuntimeState.spinnerTestId)).toBeVisible()
                await attachRuntimeEvidence(page, testInfo, {
                    screenshot: `visual-state-loading-checkout-promotion-${viewport.name}`,
                    axe: `axe-core-visual-state-loading-checkout-promotion-${viewport.name}`,
                })

                await delayedFetch?.release()

                const error = page.getByTestId(checkoutPromotionRuntimeState.errorTestId)
                await expect(error).toBeVisible({ timeout: 5_000 })
                await expect(error).toContainText(/\S+/)
                await expect(error).toHaveAttribute('role', 'alert')
                await expect(page.getByTestId(checkoutPromotionRuntimeState.buttonTestId)).toBeEnabled()
                await attachRuntimeEvidence(page, testInfo, {
                    screenshot: `visual-state-error-checkout-promotion-${viewport.name}`,
                    axe: `axe-core-visual-state-error-checkout-promotion-${viewport.name}`,
                })

                await delayedFetch?.release()
                await page.unrouteAll({ behavior: 'ignoreErrors' })
                delayedFetch = undefined

                const cartAvailability = await prepareCartItemUpdateLoadingState(
                    page,
                    testInfo,
                    cartItemUpdateRuntimeState,
                    viewport
                )
                delayedAction = cartAvailability.delayedAction
                if (!cartAvailability.available) {
                    if (shouldRequireCartStates()) {
                        throw new Error(cartAvailability.reason)
                    }

                    test.skip(true, cartAvailability.reason)
                }

                expect(delayedAction).toBeDefined()
                await delayedAction!.waitUntilIntercepted()
                const increaseButton = page.getByTestId(cartItemUpdateRuntimeState.buttonTestId).first()
                await expect(increaseButton).toBeDisabled()
                await expect(increaseButton).toHaveAccessibleName(/aumentar|increase|augmenter|aumenta|erhöhen/i)
                await expect(page.getByTestId(cartItemUpdateRuntimeState.spinnerTestId).first()).toBeVisible()
                await attachRuntimeEvidence(page, testInfo, {
                    screenshot: `visual-state-loading-cart-item-update-${viewport.name}`,
                    axe: `axe-core-visual-state-loading-cart-item-update-${viewport.name}`,
                }, 'body')

                await delayedAction!.abort()

                const errorToast = page.getByTestId(cartItemUpdateRuntimeState.errorToastTestId).last()
                await expect(errorToast).toBeVisible({ timeout: 5_000 })
                await expect(errorToast).toContainText(/\S+/)
                await expect(errorToast).toHaveAttribute('role', 'alert')
                await expect(increaseButton).toBeEnabled()
                await attachRuntimeEvidence(page, testInfo, {
                    screenshot: `visual-state-error-cart-item-update-${viewport.name}`,
                    axe: `axe-core-visual-state-error-cart-item-update-${viewport.name}`,
                }, 'body')

                await errorToast.getByRole('button', { name: 'Dismiss' }).click()
                await expect(errorToast).toBeHidden()
                await page.unrouteAll({ behavior: 'ignoreErrors' })
                delayedAction = undefined

                const removeAvailability = await prepareCartItemRemoveLoadingState(
                    page,
                    testInfo,
                    cartItemUpdateRuntimeState,
                    viewport
                )
                delayedAction = removeAvailability.delayedAction
                if (!removeAvailability.available) {
                    if (shouldRequireCartStates()) {
                        throw new Error(removeAvailability.reason)
                    }

                    test.skip(true, removeAvailability.reason)
                }

                expect(delayedAction).toBeDefined()
                await delayedAction!.waitUntilIntercepted()
                const removeButton = page.getByTestId(cartItemUpdateRuntimeState.removeButtonTestId).first()
                await expect(removeButton).toBeDisabled()
                await expect(removeButton).toHaveAccessibleName(/eliminar|remove|supprimer|rimuovi|entfernen/i)
                await expect(page.getByTestId(cartItemUpdateRuntimeState.removeSpinnerTestId).first()).toBeVisible()
                await attachRuntimeEvidence(page, testInfo, {
                    screenshot: `visual-state-loading-cart-item-remove-${viewport.name}`,
                    axe: `axe-core-visual-state-loading-cart-item-remove-${viewport.name}`,
                }, 'body')

                await delayedAction!.abort()

                const removeErrorToast = page.getByTestId(cartItemUpdateRuntimeState.errorToastTestId).last()
                await expect(removeErrorToast).toBeVisible({ timeout: 5_000 })
                await expect(removeErrorToast).toContainText(/\S+/)
                await expect(removeErrorToast).toHaveAttribute('role', 'alert')
                await expect(removeButton).toBeEnabled()
                await attachRuntimeEvidence(page, testInfo, {
                    screenshot: `visual-state-error-cart-item-remove-${viewport.name}`,
                    axe: `axe-core-visual-state-error-cart-item-remove-${viewport.name}`,
                }, 'body')
                expect(blockingConsoleMessages).toEqual([])
            } finally {
                await delayedFetch?.release()
                await delayedAction?.abort()
                await page.unrouteAll({ behavior: 'ignoreErrors' })
                if (runtimeCartCreated) {
                    await cleanupRuntimeEvidenceCart(page, cartItemUpdateRuntimeState)
                }
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

    test('mobile PDP sticky CTA stays above the bottom navigation', async ({ page }, testInfo) => {
        const viewport = viewports.find((candidate) => candidate.name === 'mobile')!
        const state = interactiveStates.find((candidate) => candidate.state === 'toast')!
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

        await openFirstProductDetail(page)
        await assertMobileStickyCtaDoesNotOverlapBottomNav(page)
        await attachRuntimeEvidence(page, testInfo, {
            screenshot: 'visual-state-mobile-pdp-sticky-cta',
            axe: 'axe-core-mobile-pdp-sticky-cta',
        }, 'body')
        expect(blockingConsoleMessages).toEqual([])
    })
})
