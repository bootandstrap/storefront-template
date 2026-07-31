import { expect, type Page } from '@playwright/test'

type InterceptedRuntimeAction = {
    waitUntilIntercepted: () => Promise<void>
    abort: () => Promise<void>
}

export const checkoutPromotionRuntimeState = {
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

export async function delayNextCartAction(
    page: Page,
    targetPath: string,
    expectedBody?: string
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
            if (
                request.method() !== 'POST'
                || !request.headers()['next-action']
                || (expectedBody && !request.postData()?.includes(expectedBody))
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
