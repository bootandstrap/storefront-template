import { describe, expect, it } from 'vitest'
import {
    beginCheckoutMethodRequest,
    canContinueCheckoutMethod,
    invalidateCheckoutMethodRequests,
    isCurrentCheckoutMethodRequest,
    type CheckoutMethodRequestEpoch,
} from '../checkout-method-request-epoch'

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise
        reject = rejectPromise
    })
    return { promise, resolve, reject }
}

describe('checkout method request epoch', () => {
    it('prevents an older rejected request from overwriting a newer success', async () => {
        const epoch: CheckoutMethodRequestEpoch = { current: 0 }
        const first = deferred<string[]>()
        const second = deferred<string[]>()
        let state: string[] | 'error' = []

        async function applyLatest(result: Promise<string[]>) {
            const requestId = beginCheckoutMethodRequest(epoch)
            try {
                const methods = await result
                if (isCurrentCheckoutMethodRequest(epoch, requestId)) state = methods
            } catch {
                if (isCurrentCheckoutMethodRequest(epoch, requestId)) state = 'error'
            }
        }

        const firstRun = applyLatest(first.promise)
        const secondRun = applyLatest(second.promise)
        second.resolve(['cod'])
        await secondRun
        first.reject(new Error('stale failure'))
        await firstRun

        expect(state).toEqual(['cod'])
    })

    it('invalidates an in-flight request when checkout closes', () => {
        const epoch: CheckoutMethodRequestEpoch = { current: 0 }
        const requestId = beginCheckoutMethodRequest(epoch)

        invalidateCheckoutMethodRequests(epoch)

        expect(isCurrentCheckoutMethodRequest(epoch, requestId)).toBe(false)
    })

    it.each([
        { selectedMethod: null, loadingMethods: false, methodsError: null, expected: false },
        { selectedMethod: 'cod', loadingMethods: true, methodsError: null, expected: false },
        { selectedMethod: 'cod', loadingMethods: false, methodsError: 'unavailable', expected: false },
        { selectedMethod: 'cod', loadingMethods: false, methodsError: null, expected: true },
    ])(
        'allows continuation only with a currently validated selection: $expected',
        ({ selectedMethod, loadingMethods, methodsError, expected }) => {
            expect(canContinueCheckoutMethod({
                selectedMethod,
                loadingMethods,
                methodsError,
            })).toBe(expected)
        }
    )
})
