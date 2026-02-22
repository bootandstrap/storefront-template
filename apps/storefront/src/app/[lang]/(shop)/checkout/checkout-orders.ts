'use server'

import { getConfig } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import { emitServerEvent } from '@/lib/analytics-server'
import { validateMinOrderAmount, validateMaxOrdersMonth, checkCheckoutRateLimit } from './checkout-validation'
import { medusaStore } from './checkout-medusa'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderResult {
    id: string
    display_id: number
    status: string
    email?: string
}

// ---------------------------------------------------------------------------
// Complete cart → creates a Medusa Order
// ---------------------------------------------------------------------------

export async function completeCart(
    cartId: string
): Promise<{ order: OrderResult | null; error?: string }> {
    try {
        const res = await medusaStore<{ type: string; order: OrderResult }>(
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

// ---------------------------------------------------------------------------
// Bank Transfer order
// ---------------------------------------------------------------------------

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
        // Rate limit check
        const rateCheck = await checkCheckoutRateLimit(cartId)
        if (!rateCheck.allowed) return { order: null, error: rateCheck.error }

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
        await medusaStore(`/store/carts/${cartId}`, {
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
        const result = await completeCart(cartId)

        // Emit order_placed event for analytics funnel
        if (result.order) {
            emitServerEvent('order_placed', {
                order_id: result.order.id,
                payment_method: 'bank_transfer',
            }).catch(() => { })
        }

        return result
    } catch (err) {
        console.error('[checkout] submitBankTransferOrder failed:', err)
        return { order: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ---------------------------------------------------------------------------
// Cash on Delivery order
// ---------------------------------------------------------------------------

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
        const rateCheck = await checkCheckoutRateLimit(cartId)
        if (!rateCheck.allowed) return { order: null, error: rateCheck.error }

        const minCheck = await validateMinOrderAmount(cartId)
        if (!minCheck.allowed) return { order: null, error: minCheck.error }

        const orderLimitCheck = await validateMaxOrdersMonth()
        if (!orderLimitCheck.allowed) return { order: null, error: orderLimitCheck.error }

        const { featureFlags } = await getConfig()

        if (!isFeatureEnabled(featureFlags, 'enable_cash_on_delivery')) {
            return { order: null, error: 'Cash on delivery is not enabled' }
        }

        await medusaStore(`/store/carts/${cartId}`, {
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

        const result = await completeCart(cartId)

        if (result.order) {
            emitServerEvent('order_placed', {
                order_id: result.order.id,
                payment_method: 'cash_on_delivery',
            }).catch(() => { })
        }

        return result
    } catch (err) {
        console.error('[checkout] submitCODOrder failed:', err)
        return { order: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ---------------------------------------------------------------------------
// WhatsApp order
// ---------------------------------------------------------------------------

export async function submitWhatsAppOrder(
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
        const rateCheck = await checkCheckoutRateLimit(cartId)
        if (!rateCheck.allowed) return { order: null, error: rateCheck.error }

        const minCheck = await validateMinOrderAmount(cartId)
        if (!minCheck.allowed) return { order: null, error: minCheck.error }

        const orderLimitCheck = await validateMaxOrdersMonth()
        if (!orderLimitCheck.allowed) return { order: null, error: orderLimitCheck.error }

        const { featureFlags } = await getConfig()

        if (!isFeatureEnabled(featureFlags, 'enable_whatsapp_checkout')) {
            return { order: null, error: 'WhatsApp checkout is not enabled' }
        }

        await medusaStore(`/store/carts/${cartId}`, {
            method: 'POST',
            body: JSON.stringify({
                email: customerInfo.email,
                metadata: {
                    payment_method: 'whatsapp',
                    customer_name: customerInfo.name,
                    customer_phone: customerInfo.phone,
                    delivery_address: customerInfo.address,
                    notes: customerInfo.notes,
                },
            }),
        })

        const result = await completeCart(cartId)

        if (result.order) {
            emitServerEvent('order_placed', {
                order_id: result.order.id,
                payment_method: 'whatsapp',
            }).catch(() => { })
        }

        return result
    } catch (err) {
        console.error('[checkout] submitWhatsAppOrder failed:', err)
        return { order: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
