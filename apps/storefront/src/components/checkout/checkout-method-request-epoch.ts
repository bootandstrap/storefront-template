export type CheckoutMethodRequestEpoch = { current: number }

interface CheckoutMethodContinuationState {
    selectedMethod: string | null
    loadingMethods: boolean
    methodsError: string | null
}

export function canContinueCheckoutMethod({
    selectedMethod,
    loadingMethods,
    methodsError,
}: CheckoutMethodContinuationState) {
    return selectedMethod !== null && !loadingMethods && methodsError === null
}

export function beginCheckoutMethodRequest(epoch: CheckoutMethodRequestEpoch) {
    epoch.current += 1
    return epoch.current
}

export function invalidateCheckoutMethodRequests(epoch: CheckoutMethodRequestEpoch) {
    epoch.current += 1
}

export function isCurrentCheckoutMethodRequest(
    epoch: CheckoutMethodRequestEpoch,
    requestId: number
) {
    return epoch.current === requestId
}
