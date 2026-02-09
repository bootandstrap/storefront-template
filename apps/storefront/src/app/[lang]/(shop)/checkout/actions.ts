'use server'

import { getConfig, getRequiredTenantId } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import { checkLimit } from '@/lib/limits'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEDUSA_BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''

/**
 * Check whether Stripe keys are configured (not PLACEHOLDER).
 */
function isStripeConfiguredSync(): boolean {
    const key = process.env.STRIPE_SECRET_KEY ?? ''
    return key.length > 0 && !key.includes('PLACEHOLDER')
}

export async function isStripeConfigured(): Promise<boolean> {
    return isStripeConfiguredSync()
}

// ---------------------------------------------------------------------------
// Internal Medusa fetch helper (server-side only)
// ---------------------------------------------------------------------------

async function medusaAdmin<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const url = `${MEDUSA_BACKEND_URL}${path}`
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(PUBLISHABLE_KEY && { 'x-publishable-api-key': PUBLISHABLE_KEY }),
        ...options?.headers,
    }
    const res = await fetch(url, { ...options, headers })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Medusa ${res.status}: ${path} — ${text}`)
    }
    return res.json()
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentSession {
    id: string
    provider_id: string
    data: Record<string, unknown>
    status: string
}

interface CartWithPayment {
    id: string
    payment_session?: PaymentSession
    payment_sessions?: PaymentSession[]
    total: number
    subtotal: number
    items: unknown[]
}

interface OrderResult {
    id: string
    display_id: number
    status: string
    email?: string
}

// ---------------------------------------------------------------------------
// Minimum order amount validation
// ---------------------------------------------------------------------------

async function validateMinOrderAmount(
    cartId: string
): Promise<{ allowed: boolean; error?: string }> {
    const { config } = await getConfig()
    const minAmount = config.min_order_amount ?? 0
    if (minAmount <= 0) return { allowed: true }

    try {
        const res = await medusaAdmin<{ cart: CartWithPayment }>(
            `/store/carts/${cartId}?fields=total`
        )
        const total = res.cart.total ?? 0
        if (total < minAmount) {
            const formatted = (minAmount / 100).toFixed(2)
            return { allowed: false, error: `Minimum order amount is $${formatted}` }
        }
        return { allowed: true }
    } catch {
        // Don't block checkout if validation fails
        return { allowed: true }
    }
}

// ---------------------------------------------------------------------------
// Monthly order limit validation (server-side enforcement)
// ---------------------------------------------------------------------------

async function validateMaxOrdersMonth(): Promise<{ allowed: boolean; error?: string }> {
    try {
        const { planLimits } = await getConfig()
        const supabase = await createClient()

        // Count orders from this month using analytics_events or a direct count
        const now = new Date()
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const { count } = await supabase
            .from('analytics_events')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', getRequiredTenantId())
            .eq('event_type', 'order_placed')
            .gte('created_at', firstOfMonth)

        const limitCheck = checkLimit(planLimits, 'max_orders_month', count ?? 0)
        if (!limitCheck.allowed) {
            return { allowed: false, error: 'Monthly order limit reached. Please contact support.' }
        }
        return { allowed: true }
    } catch {
        // Don't block checkout if validation fails
        return { allowed: true }
    }
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Initialize a payment session for a cart with the specified provider.
 * For Stripe, the provider_id is "pp_stripe_stripe".
 */
export async function initializePaymentSession(
    cartId: string,
    providerId: string
): Promise<{ success: boolean; error?: string }> {
    try {
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

        await medusaAdmin<{ cart: CartWithPayment }>(
            `/store/carts/${cartId}/payment-sessions`,
            {
                method: 'POST',
                body: JSON.stringify({ provider_id: providerId }),
            }
        )

        return { success: true }
    } catch (err) {
        console.error('[checkout] initializePaymentSession failed:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

/**
 * After session init, retrieve the client secret for Stripe Elements.
 * Returns the client_secret from the payment session data.
 */
export async function getStripeClientSecret(
    cartId: string
): Promise<{ clientSecret: string | null; error?: string }> {
    try {
        if (!isStripeConfiguredSync()) {
            return { clientSecret: null, error: 'Stripe is not configured' }
        }

        const res = await medusaAdmin<{ cart: CartWithPayment }>(
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
        console.error('[checkout] getStripeClientSecret failed:', err)
        return { clientSecret: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

/**
 * Complete the cart — creates a Medusa Order with validated server-side prices.
 * Call this AFTER Stripe confirms payment (or for non-Stripe methods).
 */
export async function completeCart(
    cartId: string
): Promise<{ order: OrderResult | null; error?: string }> {
    try {
        const res = await medusaAdmin<{ type: string; order: OrderResult }>(
            `/store/carts/${cartId}/complete`,
            { method: 'POST' }
        )

        if (res.type === 'order') {
            return { order: res.order }
        }

        return { order: null, error: 'Cart completion did not create an order' }
    } catch (err) {
        console.error('[checkout] completeCart failed:', err)
        return { order: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

/**
 * Create a pending order for bank transfer payment.
 * The order will stay "pending" until admin manually confirms payment.
 */
export async function submitBankTransferOrder(
    cartId: string,
    customerInfo: {
        name: string
        email: string
        phone?: string
        address?: string
        notes?: string
    }
): Promise<{ order: OrderResult | null; error?: string }> {
    try {
        // Validate minimum order amount
        const minCheck = await validateMinOrderAmount(cartId)
        if (!minCheck.allowed) return { order: null, error: minCheck.error }

        // Validate monthly order limit
        const orderLimitCheck = await validateMaxOrdersMonth()
        if (!orderLimitCheck.allowed) return { order: null, error: orderLimitCheck.error }

        const { featureFlags } = await getConfig()

        if (!isFeatureEnabled(featureFlags, 'enable_bank_transfer')) {
            return { order: null, error: 'Bank transfer is not enabled' }
        }

        // Update cart with customer info
        await medusaAdmin(`/store/carts/${cartId}`, {
            method: 'POST',
            body: JSON.stringify({
                email: customerInfo.email,
                metadata: {
                    payment_method: 'bank_transfer',
                    customer_name: customerInfo.name,
                    customer_phone: customerInfo.phone,
                    delivery_address: customerInfo.address,
                    notes: customerInfo.notes,
                },
            }),
        })

        // Complete the cart to create the order
        return await completeCart(cartId)
    } catch (err) {
        console.error('[checkout] submitBankTransferOrder failed:', err)
        return { order: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

/**
 * Create a pending order for Cash on Delivery.
 */
export async function submitCODOrder(
    cartId: string,
    customerInfo: {
        name: string
        email: string
        phone?: string
        address: string
        notes?: string
    }
): Promise<{ order: OrderResult | null; error?: string }> {
    try {
        // Validate minimum order amount
        const minCheck = await validateMinOrderAmount(cartId)
        if (!minCheck.allowed) return { order: null, error: minCheck.error }

        // Validate monthly order limit
        const orderLimitCheck = await validateMaxOrdersMonth()
        if (!orderLimitCheck.allowed) return { order: null, error: orderLimitCheck.error }

        const { featureFlags } = await getConfig()

        if (!isFeatureEnabled(featureFlags, 'enable_cash_on_delivery')) {
            return { order: null, error: 'Cash on delivery is not enabled' }
        }

        // Update cart with customer info
        await medusaAdmin(`/store/carts/${cartId}`, {
            method: 'POST',
            body: JSON.stringify({
                email: customerInfo.email,
                metadata: {
                    payment_method: 'cash_on_delivery',
                    customer_name: customerInfo.name,
                    customer_phone: customerInfo.phone,
                    delivery_address: customerInfo.address,
                    notes: customerInfo.notes,
                },
            }),
        })

        return await completeCart(cartId)
    } catch (err) {
        console.error('[checkout] submitCODOrder failed:', err)
        return { order: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

/**
 * Check the current payment status for the Stripe provider (server-side).
 * Useful for polling on the confirmation page.
 */
export async function getPaymentStatus(
    cartId: string
): Promise<{ status: string | null; error?: string }> {
    try {
        const res = await medusaAdmin<{ cart: CartWithPayment }>(
            `/store/carts/${cartId}?fields=+payment_sessions`
        )

        const session = res.cart.payment_sessions?.[0]
        return { status: session?.status ?? null }
    } catch (err) {
        console.error('[checkout] getPaymentStatus failed:', err)
        return { status: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

/**
 * Check if a specific payment method is available (flag + config).
 */
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

// ---------------------------------------------------------------------------
// WhatsApp: fetch default template from Supabase
// ---------------------------------------------------------------------------

export async function fetchDefaultWhatsAppTemplate(): Promise<{
    id: string
    name: string
    template: string
    is_default: boolean
    variables: string[]
} | null> {
    try {
        const supabase = await createClient()

        // Try default template first
        const { data: defaultTmpl } = await supabase
            .from('whatsapp_templates')
            .select('id, name, template, is_default, variables')
            .eq('tenant_id', getRequiredTenantId())
            .eq('is_default', true)
            .limit(1)
            .single()

        if (defaultTmpl) return defaultTmpl

        // Fallback: first template
        const { data: firstTmpl } = await supabase
            .from('whatsapp_templates')
            .select('id, name, template, is_default, variables')
            .eq('tenant_id', getRequiredTenantId())
            .order('created_at', { ascending: true })
            .limit(1)
            .single()

        return firstTmpl ?? null
    } catch {
        return null
    }
}
