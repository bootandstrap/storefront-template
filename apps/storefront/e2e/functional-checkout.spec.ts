import { expect, test, type Page } from '@playwright/test'

const shouldRunFunctionalCheckout = process.env.BNS_FUNCTIONAL_CHECKOUT_E2E === '1'

test.describe('Public storefront functional checkout', () => {
    test.skip(!shouldRunFunctionalCheckout, 'Set BNS_FUNCTIONAL_CHECKOUT_E2E=1 to create a test-mode/COD order.')

    test('adds a product to cart and completes a COD order end-to-end', async ({ page }) => {
        const failedAppResponses: string[] = []

        page.on('response', (response) => {
            const url = response.url()
            if (!url.startsWith(new URL(page.url() || 'http://localhost').origin)) {
                return
            }
            if (response.status() >= 400) {
                failedAppResponses.push(`${response.status()} ${response.request().method()} ${url}`)
            }
        })

        await page.goto(`/es/productos?functional-checkout=${Date.now()}`)
        await page.waitForLoadState('domcontentloaded')
        await dismissCookieBanner(page)

        await expect(page.getByRole('heading', { name: /Todos los productos/i })).toBeVisible()
        await expect(page.getByRole('searchbox', { name: /Buscar productos/i }).first()).toBeVisible()

        const firstProduct = page.locator('[data-testid="product-card"]').first()
        await expect(firstProduct).toBeVisible({ timeout: 20_000 })
        await firstProduct.getByRole('heading').first().click()
        await expect(page).toHaveURL(/\/es\/productos\/[^/?#]+/)

        const addToCart = page.getByTestId('add-to-cart')
        await expect(addToCart).toBeVisible({ timeout: 15_000 })
        await addToCart.click()

        await expect(page.getByText(/añadido al carrito/i)).toBeVisible({ timeout: 15_000 })
        await page.getByRole('button', { name: /^Carrito/ }).click()

        await expect(page.getByRole('dialog', { name: /Carrito/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /Finalizar compra/i })).toBeEnabled()
        await page.getByRole('button', { name: /Finalizar compra/i }).click()

        await expect(page).toHaveURL(/\/es\/checkout/)
        await page.getByRole('button', { name: /Proceder al pago/i }).click()

        await page.getByRole('textbox', { name: /Nombre/i }).fill('Functional')
        await page.getByRole('textbox', { name: /Apellidos/i }).fill('QA')
        await page.getByRole('textbox', { name: /Correo electrónico/i }).fill(`functional.qa+${Date.now()}@bootandstrap.test`)
        await page.getByRole('textbox', { name: /Teléfono/i }).fill('+34600000000')
        await page.getByRole('button', { name: /^Continuar$/i }).click()

        await page.getByRole('textbox', { name: /Dirección/i }).fill('Calle QA 123')
        await page.getByRole('textbox', { name: /Piso \/ Puerta/i }).fill('Piso 1')
        await page.getByRole('textbox', { name: /Ciudad/i }).fill('Valencia')
        await page.getByRole('textbox', { name: /C\.P\./i }).fill('46001')
        await page.getByRole('textbox', { name: /Notas del pedido/i }).fill('Functional checkout E2E without real payment')
        await page.getByRole('button', { name: /^Continuar$/i }).click()

        await page.getByRole('button', { name: /Pago contra entrega/i }).click()
        await page.getByRole('button', { name: /^Continuar$/i }).click()
        await page.getByRole('button', { name: /Confirmar pedido/i }).click()

        await expect(page.getByRole('heading', { name: /Pedido confirmado/i })).toBeVisible({ timeout: 30_000 })
        await expect(page.getByText(/Número de pedido/i)).toBeVisible()
        await expect(page.getByRole('button', { name: /Seguir comprando/i })).toBeVisible()
        expect(failedAppResponses).toEqual([])
    })
})

async function dismissCookieBanner(page: Page) {
    const cookieDialog = page.getByRole('dialog', { name: /Preferencias de cookies/i })
    if (!(await cookieDialog.isVisible().catch(() => false))) {
        return
    }

    await page.getByRole('button', { name: /Aceptar todas/i }).click()
    await expect(cookieDialog).toBeHidden({ timeout: 5_000 })
}
