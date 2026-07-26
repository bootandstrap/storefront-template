import { expect, test, type Page } from '@playwright/test'
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
    state: 'primary' | 'empty' | 'error' | 'form'
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

async function assertNoCriticalAxeViolations(page: Page) {
    await page.addScriptTag({ content: axeSource })
    const results = await page.evaluate(() =>
        window.axe.run(document.querySelector('main, [role="main"]') ?? document, {
            runOnly: {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa'],
            },
        })
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
        await expect(page.getByLabel(/precio mínimo|minimum price|prix min|mindestpreis/i)).toBeVisible()
    }

    if (route.state === 'empty') {
        await expect(page.locator('main')).toContainText(/carrito|cart|empty|vacío/i)
    }

    if (route.state === 'form') {
        await expect(page.locator('main')).toContainText(/checkout|login|iniciar|correo|email|pedido/i)
    }

    if (route.state === 'error') {
        await expect(page.locator('main, body').first()).toContainText(/404|not found|no encontrada|volver/i)
    }
}

test.describe('runtime visual evidence', () => {
    for (const viewport of viewports) {
        for (const route of routes) {
            test(`${route.name} renders visual evidence on ${viewport.name}`, async ({ page }, testInfo) => {
                const blockingConsoleMessages = collectBlockingConsoleMessages(page)
                await page.setViewportSize({ width: viewport.width, height: viewport.height })

                const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' })
                expect(route.expectedStatus).toContain(response?.status() ?? 200)
                await assertVisibleState(page, route)
                await assertNoAppErrorShell(page)
                await assertNoHorizontalOverflow(page)
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
    }
})
