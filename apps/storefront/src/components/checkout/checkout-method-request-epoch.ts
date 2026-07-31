export type CheckoutMethodRequestEpoch = { current: number }

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
