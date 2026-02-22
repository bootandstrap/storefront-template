'use server'

/**
 * Checkout Server Actions
 *
 * This file is the public API for checkout actions. It delegates to
 * focused sub-modules for better maintainability:
 *
 * - checkout-validation.ts  → order limits
 * - checkout-stripe.ts      → payment sessions
 * - checkout-orders.ts      → order completion flows
 * - checkout-shipping.ts    → address, shipping, totals
 * - checkout-medusa.ts      → internal fetcher
 */

import * as validation from './checkout-validation'
import * as stripe from './checkout-stripe'
import * as orders from './checkout-orders'
import * as shipping from './checkout-shipping'
import { createClient } from '@/lib/supabase/server'
import { getRequiredTenantId } from '@/lib/config'

// Re-export types
export type { CheckoutAddress, ShippingOption, CartTotals } from './checkout-shipping'

// ---------------------------------------------------------------------------
// Validation delegates
// ---------------------------------------------------------------------------

export async function validateMinOrderAmount(cartId: string) {
    return validation.validateMinOrderAmount(cartId)
}

export async function validateMaxOrdersMonth() {
    return validation.validateMaxOrdersMonth()
}

export async function checkCheckoutRateLimit(cartId: string) {
    return validation.checkCheckoutRateLimit(cartId)
}

// ---------------------------------------------------------------------------
// Stripe / payment delegates
// ---------------------------------------------------------------------------

export async function isStripeConfigured() {
    return stripe.isStripeConfigured()
}

export async function initializePaymentSession(cartId: string, providerId: string) {
    return stripe.initializePaymentSession(cartId, providerId)
}

export async function getStripeClientSecret(cartId: string) {
    return stripe.getStripeClientSecret(cartId)
}

export async function getPaymentStatus(cartId: string) {
    return stripe.getPaymentStatus(cartId)
}

export async function isPaymentMethodAvailable(methodId: string) {
    return stripe.isPaymentMethodAvailable(methodId)
}

// ---------------------------------------------------------------------------
// Order delegates
// ---------------------------------------------------------------------------

export async function completeCart(cartId: string) {
    return orders.completeCart(cartId)
}

export async function submitBankTransferOrder(
    cartId: string,
    customerInfo: { name: string; email: string; phone?: string; address?: string; notes?: string }
) {
    return orders.submitBankTransferOrder(cartId, customerInfo)
}

export async function submitCODOrder(
    cartId: string,
    customerInfo: { name: string; email: string; phone?: string; address: string; notes?: string }
) {
    return orders.submitCODOrder(cartId, customerInfo)
}

export async function submitWhatsAppOrder(
    cartId: string,
    customerInfo: { name: string; email: string; phone?: string; address?: string; notes?: string }
) {
    return orders.submitWhatsAppOrder(cartId, customerInfo)
}

// ---------------------------------------------------------------------------
// Shipping / address delegates
// ---------------------------------------------------------------------------

export async function setCartAddress(
    cartId: string,
    address: shipping.CheckoutAddress
) {
    return shipping.setCartAddress(cartId, address)
}

export async function getShippingOptions(cartId: string) {
    return shipping.getShippingOptions(cartId)
}

export async function setShippingMethod(cartId: string, optionId: string) {
    return shipping.setShippingMethod(cartId, optionId)
}

export async function getCartTotals(cartId: string) {
    return shipping.getCartTotals(cartId)
}

// ---------------------------------------------------------------------------
// WhatsApp template (kept here — small, DB-only, no Medusa)
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

        const { data: defaultTmpl } = await supabase
            .from('whatsapp_templates')
            .select('id, name, template, is_default, variables')
            .eq('tenant_id', getRequiredTenantId())
            .eq('is_default', true)
            .limit(1)
            .single()

        if (defaultTmpl) return defaultTmpl

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
