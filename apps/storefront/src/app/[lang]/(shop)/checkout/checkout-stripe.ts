'use server'

import { getConfig } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import { validateMinOrderAmount, validateMaxOrdersMonth, checkCheckoutRateLimit } from './checkout-validation'
import { medusaStore } from './checkout-medusa'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Stripe configuration check
// ---------------------------------------------------------------------------

function isStripeConfiguredSync(): boolean {
    const key = process.env.STRIPE_SECRET_KEY ?? ''
    return key.length > 0 && !key.includes('PLACEHOLDER')
}

export async function isStripeConfigured(): Promise<boolean> {
    return isStripeConfiguredSync()
}

// ---------------------------------------------------------------------------
// Initialize a payment session
// ---------------------------------------------------------------------------

export async function initializePaymentSession(
    cartId: string,
    providerId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Rate limit check
        const rateCheck = await checkCheckoutRateLimit(cartId)
        if (!rateCheck.allowed) return { success: false, error: rateCheck.error }

        // Validate minimum order amount
        const minCheck = await validateMinOrderAmount(cartId)
        if (!minCheck.allowed) return { success: false, error: minCheck.error }

        // Validate monthly order limit
        const orderLimitCheck = await validateMaxOrdersMonth()
        if (!orderLimitCheck.allowed) return { success: false, error: orderLimitCheck.error }

        const { featureFlags } = await getConfig()

        // Validate feature flag
        if (providerId.includes('stripe') && !isFeatureEnabled(featureFlags, 'enable_online_payments')) {
            return { success: false, error: 'Online payments are not enabled' }
        }

        if (providerId.includes('stripe') && !isStripeConfiguredSync()) {
            return { success: false, error: 'Stripe is not configured. Replace PLACEHOLDER keys with real Stripe keys.' }
        }

        await medusaStore(`/store/carts/${cartId}/payment-sessions`, {
            method: 'POST',
            body: JSON.stringify({ provider_id: providerId }),
        })

        return { success: true }
    } catch (err) {
        logger.error('[checkout] initializePaymentSession failed:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ---------------------------------------------------------------------------
// Get Stripe client secret
// ---------------------------------------------------------------------------

interface CartWithPayment {
    id: string
    payment_session?: { id: string; provider_id: string; data: Record<string, unknown>; status: string }
    payment_sessions?: { id: string; provider_id: string; data: Record<string, unknown>; status: string }[]
    total: number
    subtotal: number
    items: unknown[]
}

export async function getStripeClientSecret(
    cartId: string
): Promise<{ clientSecret: string | null; error?: string }> {
    try {
        if (!isStripeConfiguredSync()) {
            return { clientSecret: null, error: 'Stripe is not configured' }
        }

        const res = await medusaStore<{ cart: CartWithPayment }>(
            `/store/carts/${cartId}?fields=+payment_sessions`
        )

        const stripeSession = res.cart.payment_sessions?.find(
            (s) => s.provider_id.includes('stripe')
        )

        if (!stripeSession) {
            return { clientSecret: null, error: 'No Stripe payment session found' }
        }

        const clientSecret = stripeSession.data?.client_secret as string | undefined

        if (!clientSecret) {
            return { clientSecret: null, error: 'No client_secret in payment session' }
        }

        return { clientSecret }
    } catch (err) {
        logger.error('[checkout] getStripeClientSecret failed:', err)
        return { clientSecret: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ---------------------------------------------------------------------------
// Get payment status
// ---------------------------------------------------------------------------

export async function getPaymentStatus(
    cartId: string
): Promise<{ status: string | null; error?: string }> {
    try {
        const res = await medusaStore<{ cart: CartWithPayment }>(
            `/store/carts/${cartId}?fields=+payment_sessions`
        )

        const session = res.cart.payment_sessions?.[0]
        return { status: session?.status ?? null }
    } catch (err) {
        logger.error('[checkout] getPaymentStatus failed:', err)
        return { status: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ---------------------------------------------------------------------------
// Check if a payment method is available
// ---------------------------------------------------------------------------

export async function isPaymentMethodAvailable(
    methodId: string
): Promise<boolean> {
    const { featureFlags } = await getConfig()

    switch (methodId) {
        case 'card':
            return isFeatureEnabled(featureFlags, 'enable_online_payments') && isStripeConfiguredSync()
        case 'bank_transfer':
            return isFeatureEnabled(featureFlags, 'enable_bank_transfer')
        case 'cod':
            return isFeatureEnabled(featureFlags, 'enable_cash_on_delivery')
        case 'whatsapp':
            return isFeatureEnabled(featureFlags, 'enable_whatsapp_checkout')
        default:
            return false
    }
}
