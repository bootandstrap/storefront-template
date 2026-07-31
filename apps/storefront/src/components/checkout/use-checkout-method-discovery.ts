'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isPaymentMethodAvailable } from '@/app/[lang]/(shop)/checkout/actions'
import type { FeatureFlags, PlanLimits } from '@/lib/config'
import { getEnabledMethods, type PaymentMethod } from '@/lib/payment-methods'
import {
    beginCheckoutMethodRequest,
    canContinueCheckoutMethod,
    invalidateCheckoutMethodRequests,
    isCurrentCheckoutMethodRequest,
} from './checkout-method-request-epoch'

interface CheckoutMethodDiscoveryOptions {
    isOpen: boolean
    isActive: boolean
    featureFlags: FeatureFlags
    planLimits: PlanLimits
    errorMessage: string
}

export function useCheckoutMethodDiscovery({
    isOpen,
    isActive,
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
        setSelectedMethod(null)
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
            invalidateCheckoutMethodRequests(requestEpoch)
            setSelectedMethod(null)
            setAvailableMethods([])
            setLoadingMethods(true)
            setMethodsError(null)
            return
        }

        if (!isActive) {
            setLoadingMethods(true)
            return
        }

        void retryMethods()
        return () => invalidateCheckoutMethodRequests(requestEpoch)
    }, [isActive, isOpen, retryMethods])

    const canContinueMethod = canContinueCheckoutMethod({
        selectedMethod,
        loadingMethods,
        methodsError,
    })

    return {
        availableMethods,
        canContinueMethod,
        loadingMethods,
        methodsError,
        retryMethods,
        selectedMethod,
        setSelectedMethod,
    }
}
