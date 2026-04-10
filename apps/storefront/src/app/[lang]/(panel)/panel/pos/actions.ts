/**
 * POS Server Actions
 *
 * Server-side actions for the POS module. Uses Medusa draft orders
 * to record in-store sales that appear in the normal order flow.
 */
'use server'

import { revalidatePath } from 'next/cache'
import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { logOwnerAction } from '@/lib/panel/log-owner-action'
import { createDraftOrder, registerDraftPayment } from '@/lib/medusa/admin-draft-orders'
import { getAdminProductsFull, getAdminCustomers } from '@/lib/medusa/admin'
import type { AdminProductFull, AdminCustomer } from '@/lib/medusa/admin'
import type { PaymentMethod } from '@/lib/pos/pos-config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface POSSaleItem {
    variant_id: string
    quantity: number
    unit_price: number
}

interface CreatePOSSaleInput {
    items: POSSaleItem[]
    payment_method: PaymentMethod
    customer_id?: string
    discount_amount?: number
    note?: string
}

interface POSSaleResult {
    success: boolean
    order_id?: string
    draft_order_id?: string
    error?: string
}

// ---------------------------------------------------------------------------
// Create POS Sale
// ---------------------------------------------------------------------------

export async function createPOSSale(input: CreatePOSSaleInput): Promise<POSSaleResult> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)

        // Get region for the draft order
        const { adminFetch } = await import('@/lib/medusa/admin-core')
        const regionsRes = await adminFetch<{ regions: { id: string }[] }>(
            '/admin/regions?limit=1',
            {},
            scope
        )
        const regionId = regionsRes.data?.regions?.[0]?.id
        if (!regionId) {
            return { success: false, error: 'No region configured' }
        }

        // Create draft order
        const { draft_order, error: createError } = await createDraftOrder({
            region_id: regionId,
            items: input.items.map(i => ({
                variant_id: i.variant_id,
                quantity: i.quantity,
                unit_price: i.unit_price,
            })),
            customer_id: input.customer_id,
            email: input.customer_id ? undefined : 'pos-venta@tienda.local',
            no_notification_order: true,
            metadata: {
                source: 'pos',
                payment_method: input.payment_method,
                discount_amount: input.discount_amount || 0,
                note: input.note || '',
            },
        }, scope)

        if (createError || !draft_order) {
            // Detect stale variant errors from Medusa and convert to STALE_CART
            const errStr = createError || 'Failed to create draft order'
            if (errStr.includes('do not exist') || errStr.includes('not published')) {
                return { success: false, error: 'STALE_CART: Some items in cart no longer exist.' }
            }
            return { success: false, error: errStr }
        }

        // Register payment (mark as paid → converts to order)
        const { order_id, error: payError } = await registerDraftPayment(
            draft_order.id,
            scope
        )

        if (payError) {
            return {
                success: false,
                draft_order_id: draft_order.id,
                error: payError,
            }
        }

        revalidatePath('/[lang]/panel/pedidos', 'page')
        revalidatePath('/[lang]/panel', 'page')

        logOwnerAction(tenantId, 'pos.create_sale', {
            itemCount: input.items.length,
            paymentMethod: input.payment_method,
            orderId: order_id,
            draftOrderId: draft_order.id,
        })

        return {
            success: true,
            order_id: order_id || undefined,
            draft_order_id: draft_order.id,
        }
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
        }
    }
}

// ---------------------------------------------------------------------------
// Search products (for barcode / text search within POS)
// ---------------------------------------------------------------------------

export async function searchPOSProducts(
    query: string
): Promise<{ products: AdminProductFull[]; error?: string }> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)

        const { products } = await getAdminProductsFull({
            limit: 20,
            q: query,
            status: 'published',
        }, scope)

        return { products }
    } catch (err) {
        return {
            products: [],
            error: err instanceof Error ? err.message : 'Search failed',
        }
    }
}

// ---------------------------------------------------------------------------
// Lookup customer
// ---------------------------------------------------------------------------

export async function lookupPOSCustomer(
    query: string
): Promise<{ customers: AdminCustomer[]; error?: string }> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)

        const { customers } = await getAdminCustomers({
            limit: 10,
            q: query,
        }, scope)

        return { customers }
    } catch (err) {
        return {
            customers: [],
            error: err instanceof Error ? err.message : 'Lookup failed',
        }
    }
}

// ---------------------------------------------------------------------------
// Stripe Terminal — Server-Driven Payment Actions
// ---------------------------------------------------------------------------

import Stripe from 'stripe'

function getStripe(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
    return new Stripe(key, { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion })
}

/**
 * Create a PaymentIntent and process it on a Terminal reader.
 */
export async function createTerminalPaymentAction(input: {
    amount: number
    currency: string
    reader_id: string
    metadata?: Record<string, string>
}): Promise<{ success: boolean; payment_intent_id?: string; error?: string }> {
    try {
        await withPanelGuard()
        const stripe = getStripe()

        // 1. Create PaymentIntent for card_present
        const pi = await stripe.paymentIntents.create({
            amount: input.amount,
            currency: input.currency.toLowerCase(),
            payment_method_types: ['card_present'],
            capture_method: 'automatic',
            metadata: input.metadata || {},
        })

        // 2. Process on reader (server-driven)
        await stripe.terminal.readers.processPaymentIntent(input.reader_id, {
            payment_intent: pi.id,
        })

        return { success: true, payment_intent_id: pi.id }
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Terminal payment creation failed',
        }
    }
}

/**
 * Poll the Terminal reader to check payment status.
 */
export async function pollTerminalPaymentAction(
    readerId: string
): Promise<{ status: 'in_progress' | 'succeeded' | 'failed'; failure_message?: string; payment_intent_id?: string }> {
    try {
        await withPanelGuard()
        const stripe = getStripe()

        const reader = await stripe.terminal.readers.retrieve(readerId)

        // Type guard: deleted readers won't have actions
        if ('deleted' in reader && reader.deleted) {
            return { status: 'failed', failure_message: 'Reader has been deleted' }
        }

        const action = (reader as Stripe.Terminal.Reader).action

        if (!action) {
            return { status: 'in_progress' }
        }

        if (action.status === 'succeeded' && action.type === 'process_payment_intent') {
            const piId = typeof action.process_payment_intent?.payment_intent === 'string'
                ? action.process_payment_intent.payment_intent
                : action.process_payment_intent?.payment_intent?.id
            return { status: 'succeeded', payment_intent_id: piId || undefined }
        }

        if (action.status === 'failed') {
            return {
                status: 'failed',
                failure_message: action.failure_message || 'Payment failed on reader',
            }
        }

        return { status: 'in_progress' }
    } catch (err) {
        return {
            status: 'failed',
            failure_message: err instanceof Error ? err.message : 'Poll failed',
        }
    }
}

/**
 * Cancel an in-progress action on a Terminal reader.
 */
export async function cancelTerminalActionAction(
    readerId: string
): Promise<boolean> {
    try {
        await withPanelGuard()
        const stripe = getStripe()
        await stripe.terminal.readers.cancelAction(readerId)
        return true
    } catch {
        return false
    }
}

/**
 * List available Terminal readers.
 */
export async function listTerminalReadersAction(): Promise<
    { id: string; label: string; status: string; device_type: string }[]
> {
    try {
        await withPanelGuard()
        const stripe = getStripe()

        const readers = await stripe.terminal.readers.list({ limit: 20 })

        return readers.data.map(r => ({
            id: r.id,
            label: r.label || r.id,
            status: r.status || 'unknown',
            device_type: r.device_type || 'unknown',
        }))
    } catch {
        return []
    }
}

// ---------------------------------------------------------------------------
// Twint QR Payment Actions
// ---------------------------------------------------------------------------

/**
 * Create a PaymentIntent with Twint payment method.
 * Returns the QR code URL for customer to scan.
 */
export async function createTwintPaymentAction(input: {
    amount: number
    currency: string
    metadata?: Record<string, string>
}): Promise<{
    success: boolean
    payment_intent_id?: string
    qr_url?: string
    expires_at?: string
    error?: string
}> {
    try {
        await withPanelGuard()
        const stripe = getStripe()

        // Create and confirm PI with twint
        const pi = await stripe.paymentIntents.create({
            amount: input.amount,
            currency: input.currency.toLowerCase(),
            payment_method_types: ['twint'],
            metadata: input.metadata || {},
        })

        // Confirm the PI to trigger Twint redirect/QR
        const confirmed = await stripe.paymentIntents.confirm(pi.id, {
            return_url: `${process.env.NEXT_PUBLIC_STORE_URL || 'https://localhost:3000'}/panel/pos`,
        })

        // Extract QR URL from next_action
        // Twint uses redirect_to_url pattern — the URL can be rendered as QR
        const redirectUrl = confirmed.next_action?.redirect_to_url?.url
            || confirmed.next_action?.type === 'redirect_to_url'
                ? (confirmed.next_action as { redirect_to_url?: { url?: string } })?.redirect_to_url?.url
                : undefined

        if (!redirectUrl) {
            return {
                success: false,
                payment_intent_id: pi.id,
                error: 'Twint QR URL not available — payment method may not be configured',
            }
        }

        // QR expires in 5 minutes
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

        return {
            success: true,
            payment_intent_id: pi.id,
            qr_url: redirectUrl,
            expires_at: expiresAt,
        }
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Twint payment creation failed',
        }
    }
}

/**
 * Poll a Twint PaymentIntent for completion.
 */
export async function pollTwintPaymentAction(
    paymentIntentId: string
): Promise<{ status: 'requires_action' | 'processing' | 'succeeded' | 'canceled' | 'failed'; error?: string }> {
    try {
        await withPanelGuard()
        const stripe = getStripe()

        const pi = await stripe.paymentIntents.retrieve(paymentIntentId)

        switch (pi.status) {
            case 'succeeded':
                return { status: 'succeeded' }
            case 'canceled':
                return { status: 'canceled' }
            case 'requires_action':
                return { status: 'requires_action' }
            case 'processing':
                return { status: 'processing' }
            default:
                return { status: 'failed', error: `Unexpected status: ${pi.status}` }
        }
    } catch (err) {
        return {
            status: 'failed',
            error: err instanceof Error ? err.message : 'Poll failed',
        }
    }
}

/**
 * Cancel a Twint PaymentIntent.
 */
export async function cancelTwintPaymentAction(
    paymentIntentId: string
): Promise<boolean> {
    try {
        await withPanelGuard()
        const stripe = getStripe()
        await stripe.paymentIntents.cancel(paymentIntentId)
        return true
    } catch {
        return false
    }
}

// ---------------------------------------------------------------------------
// Quick Price — Add a currency price to an existing variant (POS multi-currency)
// ---------------------------------------------------------------------------

/**
 * Appends a price in a new currency to an existing variant.
 * Does NOT overwrite prices in other currencies.
 *
 * Used by the POS quick-price modal when a product is missing
 * a price in the tenant's configured default_currency.
 */
export async function addVariantCurrencyPrice(input: {
    productId: string
    variantId: string
    amount: number   // in major units (e.g., 25.00 → will be converted to 2500)
    currencyCode: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
        const scope = await getTenantMedusaScope(tenantId)
        if (!scope) {
            return { success: false, error: 'Medusa configuration not found' }
        }

        if (input.amount <= 0) {
            return { success: false, error: 'Price must be greater than 0' }
        }

        // Read current variant prices to avoid overwriting
        const { getAdminProduct } = await import('@/lib/medusa/admin')
        const product = await getAdminProduct(input.productId, scope)
        if (!product) {
            return { success: false, error: 'Product not found' }
        }

        const variant = product.variants?.find(v => v.id === input.variantId)
        if (!variant) {
            return { success: false, error: 'Variant not found' }
        }

        // Build merged prices: existing + new (replace if same currency exists)
        const existingPrices = (variant.prices ?? [])
            .filter(p => p.currency_code?.toLowerCase() !== input.currencyCode.toLowerCase())
            .map(p => ({ amount: p.amount, currency_code: p.currency_code }))

        const newPrices = [
            ...existingPrices,
            { amount: Math.round(input.amount * 100), currency_code: input.currencyCode.toLowerCase() },
        ]

        const { updateVariantPrices } = await import('@/lib/medusa/admin')
        const result = await updateVariantPrices(input.productId, input.variantId, newPrices, scope)
        if (result.error) {
            return { success: false, error: result.error }
        }

        revalidatePath('/[lang]/panel/pos', 'page')
        revalidatePath('/[lang]/panel/productos', 'page')
        logOwnerAction(tenantId, 'pos.add_currency_price', {
            productId: input.productId,
            variantId: input.variantId,
            currency: input.currencyCode,
            amount: input.amount,
        })

        return { success: true }
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Failed to add price',
        }
    }
}
