'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isPaymentMethodAvailable } from '@/app/[lang]/(shop)/checkout/actions'
import type { FeatureFlags, PlanLimits } from '@/lib/config'
import { getEnabledMethods, type PaymentMethod } from '@/lib/payment-methods'
import {
    beginCheckoutMethodRequest,
    invalidateCheckoutMethodRequests,
    isCurrentCheckoutMethodRequest,
} from './checkout-method-request-epoch'

interface CheckoutMethodDiscoveryOptions {
    isOpen: boolean
    featureFlags: FeatureFlags
    planLimits: PlanLimits
    errorMessage: string
}

export function useCheckoutMethodDiscovery({
    isOpen,
    featureFlags,
    planLimits,
    errorMessage,
}: CheckoutMethodDiscoveryOptions) {
    const requestEpoch = useRef(0)
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
    const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([])
    const [loadingMethods, setLoadingMethods] = useState(true)
    const [methodsError, setMethodsError] = useState<string | null>(null)

    const retryMethods = useCallback(async () => {
        const requestId = beginCheckoutMethodRequest(requestEpoch)
        setLoadingMethods(true)
        setMethodsError(null)
        try {
            const checks = await Promise.all(
                getEnabledMethods(featureFlags, planLimits).map(async (method) => ({
                    method,
                    available: await isPaymentMethodAvailable(method.id),
                }))
            )
            if (!isCurrentCheckoutMethodRequest(requestEpoch, requestId)) return
            setAvailableMethods(checks.filter((check) => check.available).map((check) => check.method))
        } catch {
            if (!isCurrentCheckoutMethodRequest(requestEpoch, requestId)) return
            setAvailableMethods([])
            setSelectedMethod(null)
            setMethodsError(errorMessage)
        } finally {
            if (isCurrentCheckoutMethodRequest(requestEpoch, requestId)) {
                setLoadingMethods(false)
            }
        }
    }, [errorMessage, featureFlags, planLimits])

    useEffect(() => {
        if (!isOpen) {
            setSelectedMethod(null)
            setMethodsError(null)
            return
        }

        void retryMethods()
        return () => invalidateCheckoutMethodRequests(requestEpoch)
    }, [isOpen, retryMethods])

    return {
        availableMethods,
        loadingMethods,
        methodsError,
        retryMethods,
        selectedMethod,
        setSelectedMethod,
    }
}
