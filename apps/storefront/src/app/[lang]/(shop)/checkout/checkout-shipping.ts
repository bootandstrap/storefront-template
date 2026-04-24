'use server'

import { medusaStore } from './checkout-medusa'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckoutAddress {
    first_name: string
    last_name: string
    address_1: string
    address_2?: string
    city: string
    postal_code: string
    country_code: string
    phone?: string
}

export interface ShippingOption {
    id: string
    name: string
    amount: number
    currency_code?: string
}

export interface CartTotals {
    subtotal: number
    shipping_total: number
    tax_total: number
    discount_total: number
    total: number
    currency_code: string
}

// ---------------------------------------------------------------------------
// Set structured address on Medusa cart
// ---------------------------------------------------------------------------

export async function setCartAddress(
    cartId: string,
    address: CheckoutAddress
): Promise<{ success: boolean; error?: string }> {
    try {
        await medusaStore(`/store/carts/${cartId}`, {
            method: 'POST',
            body: JSON.stringify({
                shipping_address: address,
                billing_address: address,
            }),
        })
        return { success: true }
    } catch (err) {
        logger.error('[checkout] setCartAddress failed:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ---------------------------------------------------------------------------
// Get shipping options
// ---------------------------------------------------------------------------

export async function getShippingOptions(
    cartId: string
): Promise<{ options: ShippingOption[]; error?: string }> {
    try {
        const res = await medusaStore<{
            shipping_options: {
                id: string
                name: string
                amount: number
                currency_code?: string
            }[]
        }>(`/store/shipping-options?cart_id=${cartId}`)

        const options: ShippingOption[] = (res.shipping_options ?? []).map((o) => ({
            id: o.id,
            name: o.name,
            amount: o.amount ?? 0,
            currency_code: o.currency_code,
        }))

        return { options }
    } catch (err) {
        // Graceful fallback: no fulfillment provider configured → no shipping options
        logger.warn('[checkout] getShippingOptions fallback (no provider?):', err)
        return { options: [] }
    }
}

// ---------------------------------------------------------------------------
// Select shipping method
// ---------------------------------------------------------------------------

export async function setShippingMethod(
    cartId: string,
    optionId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await medusaStore(`/store/carts/${cartId}/shipping-methods`, {
            method: 'POST',
            body: JSON.stringify({ option_id: optionId }),
        })
        return { success: true }
    } catch (err) {
        logger.error('[checkout] setShippingMethod failed:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ---------------------------------------------------------------------------
// Get Medusa-computed cart totals
// ---------------------------------------------------------------------------

export async function getCartTotals(
    cartId: string
): Promise<{ totals: CartTotals | null; error?: string }> {
    try {
        const res = await medusaStore<{
            cart: {
                total: number
                subtotal: number
                tax_total: number
                shipping_total: number
                discount_total: number
                region?: { currency_code: string }
            }
        }>(`/store/carts/${cartId}?fields=+total,+subtotal,+tax_total,+shipping_total,+discount_total,+region`)

        const cart = res.cart
        return {
            totals: {
                subtotal: cart.subtotal ?? 0,
                shipping_total: cart.shipping_total ?? 0,
                tax_total: cart.tax_total ?? 0,
                discount_total: cart.discount_total ?? 0,
                total: cart.total ?? 0,
                currency_code: cart.region?.currency_code ?? 'EUR',
            },
        }
    } catch (err) {
        logger.error('[checkout] getCartTotals failed:', err)
        return { totals: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
