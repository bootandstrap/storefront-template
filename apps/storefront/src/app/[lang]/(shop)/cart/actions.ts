'use server'

import {
    createCart as medusaCreateCart,
    addToCart as medusaAddToCart,
    updateCartItem as medusaUpdateCartItem,
    removeFromCart as medusaRemoveFromCart,
    getCart as medusaGetCart,
    type MedusaCart,
} from '@/lib/medusa/client'

// ---------------------------------------------------------------------------
// Server Actions for cart mutations
// ---------------------------------------------------------------------------

export async function addToCartAction(
    cartId: string | null,
    variantId: string,
    quantity: number = 1
): Promise<{ cart: MedusaCart | null; cartId: string | null }> {
    try {
        let currentCartId = cartId

        // Create cart if none exists
        if (!currentCartId) {
            const newCart = await medusaCreateCart()
            currentCartId = newCart.id
        }

        try {
            const cart = await medusaAddToCart(currentCartId, variantId, quantity)
            return { cart, cartId: currentCartId }
        } catch (addErr) {
            // Stale cart recovery: if the existing cart fails (e.g., wrong region,
            // deleted during re-seed), create a fresh cart and retry once
            if (cartId) {
                console.warn('[cart] Stale cart detected, creating fresh cart...', cartId)
                const freshCart = await medusaCreateCart()
                const cart = await medusaAddToCart(freshCart.id, variantId, quantity)
                return { cart, cartId: freshCart.id }
            }
            throw addErr
        }
    } catch (err) {
        console.error('[cart] addToCart failed:', err)
        return { cart: null, cartId: null }
    }
}

export async function updateCartItemAction(
    cartId: string,
    lineItemId: string,
    quantity: number
): Promise<MedusaCart | null> {
    try {
        return await medusaUpdateCartItem(cartId, lineItemId, quantity)
    } catch (err) {
        console.error('[cart] updateCartItem failed:', err)
        return null
    }
}

export async function removeFromCartAction(
    cartId: string,
    lineItemId: string
): Promise<MedusaCart | null> {
    try {
        return await medusaRemoveFromCart(cartId, lineItemId)
    } catch (err) {
        console.error('[cart] removeFromCart failed:', err)
        return null
    }
}

export async function getCartAction(
    cartId: string
): Promise<MedusaCart | null> {
    try {
        return await medusaGetCart(cartId)
    } catch (err) {
        console.error('[cart] getCart failed:', err)
        return null
    }
}
