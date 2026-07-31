import { expect, type Locator, type Page } from '@playwright/test'

const CHECKOUT_METHOD_IDS = ['card', 'bank_transfer', 'cod', 'whatsapp'] as const

export const checkoutMethodRuntimeState = {
    loadingName: 'checkout-methods-loading',
    errorName: 'checkout-methods-error',
    path: '/es/checkout',
    proceedTestId: 'checkout-proceed-payment',
    continueTestId: 'checkout-modal-continue',
    loadingTestId: 'checkout-methods-loading',
    errorTestId: 'checkout-methods-error',
    retryTestId: 'checkout-methods-retry',
}

type InterceptedRuntimeAction = {
    waitUntilIntercepted: () => Promise<void>
    abort: () => Promise<void>
}

async function traverseOptionalCheckoutShippingStep(
    dialog: Locator,
    continueButton: Locator,
    methodLoading: Locator
) {
    const shippingStep = dialog.getByTestId('checkout-shipping-step')
    await expect(shippingStep.or(methodLoading)).toBeVisible({ timeout: 20_000 })
    if (!await shippingStep.isVisible()) return

    await shippingStep.getByTestId('checkout-shipping-option').first().click()
    await expect(continueButton).toBeEnabled()
    await continueButton.click()
    await expect(methodLoading).toBeVisible({ timeout: 20_000 })
}

export async function delayNextCheckoutMethodAvailabilityAction(
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
            const body = request.postData() ?? ''
            let args: unknown
            try {
                args = JSON.parse(body)
            } catch {
                args = null
            }
            const isAvailabilityCheck = Array.isArray(args)
                && args.length === 1
                && CHECKOUT_METHOD_IDS.some((methodId) => args[0] === methodId)

            if (
                actionWasDelayed
                || request.method() !== 'POST'
                || !request.headers()['next-action']
                || !isAvailabilityCheck
            ) {
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
                    message: `expected a checkout method availability action at ${normalizedTargetPath}`,
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

export async function reachCheckoutMethodStep(page: Page) {
    const proceed = page.getByTestId(checkoutMethodRuntimeState.proceedTestId)
    await expect(proceed).toBeVisible({ timeout: 10_000 })
    await proceed.click()

    const dialog = page.getByRole('dialog', { name: /checkout|finalizar compra|paiement|kasse/i })
    const continueButton = dialog.getByTestId(checkoutMethodRuntimeState.continueTestId)
    await expect(dialog).toBeVisible()
    const closeButton = dialog.getByRole('button', { name: /cerrar|close|fermer|chiudi|schließen/i })
    await expect(closeButton).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(dialog.locator('#checkout-phone')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(closeButton).toBeFocused()
    await dialog.locator('#checkout-first-name').fill('Runtime')
    await dialog.locator('#checkout-last-name').fill('Evidence')
    await continueButton.click()

    await dialog.locator('#checkout-street').fill('Runtime Evidence Street 1')
    await dialog.locator('#checkout-city').fill('Test City')
    await dialog.locator('#checkout-postal-code').fill('28001')
    await continueButton.click()

    const methodLoading = dialog.getByTestId(checkoutMethodRuntimeState.loadingTestId)
    await traverseOptionalCheckoutShippingStep(dialog, continueButton, methodLoading)

    return dialog
}
