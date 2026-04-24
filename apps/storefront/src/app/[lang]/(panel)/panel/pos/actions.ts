/**
 * POS Server Actions
 *
 * Server-side actions for the POS module. Uses Medusa draft orders
 * converted via the `convertDraftOrderWorkflow` to create REAL orders
 * visible in `/admin/orders`. POS-specific data (payment method, receipt,
 * shift) is persisted via the custom POS Medusa module.
 *
 * Flow:
 *   1. POST /admin/draft-orders         → create draft
 *   2. POST /admin/draft-orders/{id}/convert-to-order → real order
 *   3. POST /admin/pos/transactions     → POS metadata
 *   4. POST /admin/pos/shifts/{id}      → update shift aggregates
 */
'use server'

import { revalidatePath } from 'next/cache'
import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { logOwnerAction } from '@/lib/panel/log-owner-action'
import { createDraftOrder, convertDraftToOrder } from '@/lib/medusa/admin-draft-orders'
import { recordPOSTransaction, updateShiftAggregates } from '@/lib/pos/medusa-pos-module'
import { getAdminProductsFull, getAdminCustomers } from '@/lib/medusa/admin'
import type { AdminProductFull, AdminCustomer } from '@/lib/medusa/admin'
import type { PaymentMethod } from '@/lib/pos/pos-config'
import { logger } from '@/lib/logger'

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
    customer_name?: string
    discount_amount?: number
    note?: string
    /** Active shift ID — transaction will be linked and shift aggregates updated */
    shift_id?: string
    /** Terminal identifier for multi-device tracking */
    terminal_id?: string
    /** Cash tendered (for change calculation on cash payments) */
    cash_tendered?: number
}

interface POSSaleResult {
    success: boolean
    order_id?: string
    display_id?: number
    draft_order_id?: string
    transaction_id?: string
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

        // ─── Step 1: Create draft order ───────────────────────────────
        const { draft_order, error: createError } = await createDraftOrder({
            region_id: regionId,
            items: input.items.map(i => ({
                variant_id: i.variant_id,
                quantity: i.quantity,
                unit_price: i.unit_price,
            })),
            customer_id: input.customer_id,
            email: input.customer_id ? undefined : 'pos-venta@tienda.local',
            sales_channel_id: scope?.medusaSalesChannelId,
            no_notification_order: true,
            metadata: {
                source: 'pos',
                payment_method: input.payment_method,
                discount_amount: input.discount_amount || 0,
                note: input.note || '',
                shift_id: input.shift_id || null,
                terminal_id: input.terminal_id || null,
            },
        }, scope)

        if (createError || !draft_order) {
            const errStr = createError || 'Failed to create draft order'
            // Detect stale variant errors from Medusa
            if (errStr.includes('do not exist') || errStr.includes('not published')) {
                return { success: false, error: 'STALE_CART: Some items in cart no longer exist.' }
            }
            return { success: false, error: errStr }
        }

        // ─── Step 2: Convert draft to REAL order ──────────────────────
        const { order_id, display_id, error: convertError } = await convertDraftToOrder(
            draft_order.id,
            scope
        )

        if (convertError) {
            logger.error('[pos] Sale draft created but conversion failed', {
                draftOrderId: draft_order.id,
                error: convertError,
            })
            return {
                success: false,
                draft_order_id: draft_order.id,
                error: convertError,
            }
        }

        // ─── Step 3: Record POS transaction in POS module ────────────
        // Calculate total from items
        const totalAmount = input.items.reduce(
            (sum, item) => sum + (item.unit_price * item.quantity),
            0
        )

        const receiptNumber = `POS-${display_id ?? Date.now()}`
        const paymentMethodMap: Record<string, 'cash' | 'card' | 'mixed' | 'voucher' | 'other'> = {
            cash: 'cash',
            card: 'card',
            mixed: 'mixed',
            twint: 'other',
        }

        let transactionId: string | undefined

        // Only record if we have a session context (shift implies session)
        if (input.shift_id) {
            const { transaction, error: txError } = await recordPOSTransaction({
                session_id: input.shift_id, // Using shift_id as session context
                order_id: order_id || undefined,
                amount: totalAmount,
                currency_code: draft_order.currency_code || 'eur',
                payment_method: paymentMethodMap[input.payment_method] || 'other',
                cash_tendered: input.cash_tendered,
                receipt_number: receiptNumber,
                customer_name: input.customer_name,
                line_items_snapshot: input.items.map(i => ({
                    variant_id: i.variant_id,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                })),
                discount_percent: input.discount_amount ? undefined : undefined,
                notes: input.note,
            }, scope)

            if (txError) {
                // Non-fatal: order was created, just POS metadata failed
                logger.warn('[pos] Transaction record failed (order still created)', {
                    orderId: order_id,
                    error: txError,
                })
            } else {
                transactionId = transaction?.id
            }

            // ─── Step 4: Update shift aggregates ─────────────────────
            const { error: shiftError } = await updateShiftAggregates(
                input.shift_id,
                totalAmount,
                input.payment_method,
                scope
            )
            if (shiftError) {
                logger.warn('[pos] Shift aggregate update failed', {
                    shiftId: input.shift_id,
                    error: shiftError,
                })
            }
        }

        // ─── Revalidate & Audit ──────────────────────────────────────
        revalidatePath('/[lang]/panel/pedidos', 'page')
        revalidatePath('/[lang]/panel', 'page')

        // ─── CRM: Update customer metadata with POS purchase data ────
        if (input.customer_id && order_id) {
            try {
                await updateCustomerPOSMetadata(
                    input.customer_id,
                    totalAmount,
                    order_id,
                    scope
                )
            } catch {
                // Non-fatal: CRM metadata update should never block sale
                logger.warn('[pos] CRM metadata update failed', {
                    customerId: input.customer_id,
                    orderId: order_id,
                })
            }
        }

        // ─── Audit Log ───────────────────────────────────────────────
        logOwnerAction(tenantId, 'pos.create_sale', {
            itemCount: input.items.length,
            paymentMethod: input.payment_method,
            orderId: order_id,
            displayId: display_id,
            draftOrderId: draft_order.id,
            transactionId,
            shiftId: input.shift_id,
            totalAmount,
            customerId: input.customer_id || null,
            terminalId: input.terminal_id || null,
            description: `POS sale #${display_id ?? 'N/A'} — ${input.items.length} items — ${input.payment_method}`,
        })

        // ─── Email Receipt (non-blocking) ────────────────────────────
        // Send digital receipt to customer if they have an email
        if (input.customer_id && order_id) {
            sendPOSReceiptEmail(tenantId, input.customer_id, {
                order_id,
                display_id: display_id ?? undefined,
                items: input.items,
                total: totalAmount,
                payment_method: input.payment_method,
                currency_code: draft_order.currency_code || 'eur',
            }, scope).catch(err => {
                logger.warn('[pos] Email receipt failed (non-blocking)', {
                    customerId: input.customer_id,
                    orderId: order_id,
                    error: err instanceof Error ? err.message : String(err),
                })
            })
        }

        return {
            success: true,
            order_id: order_id || undefined,
            display_id: display_id ?? undefined,
            draft_order_id: draft_order.id,
            transaction_id: transactionId,
        }
    } catch (err) {
        logger.error('[pos] createPOSSale exception', {
            error: err instanceof Error ? err.message : 'Unknown error',
        })
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

// ---------------------------------------------------------------------------
// CRM Integration — Update customer POS metadata on each sale
// ---------------------------------------------------------------------------

/**
 * Update Medusa customer metadata with POS purchase stats.
 * Uses customer's `metadata` field — no schema changes needed.
 *
 * Tracked fields:
 * - `pos_total_purchases`: number of POS sales
 * - `pos_total_spent`: cumulative amount (minor units)
 * - `pos_last_purchase`: ISO date of last POS purchase
 * - `pos_last_order_id`: last POS order ID
 *
 * These tie directly into the loyalty engine and CRM module.
 */
async function updateCustomerPOSMetadata(
    customerId: string,
    saleAmount: number,
    orderId: string,
    scope: Awaited<ReturnType<typeof getTenantMedusaScope>>
): Promise<void> {
    const { adminFetch } = await import('@/lib/medusa/admin-core')

    // Fetch current customer metadata
    const customerRes = await adminFetch<{
        customer: { id: string; metadata: Record<string, unknown> | null }
    }>(`/admin/customers/${customerId}`, {}, scope)

    const currentMeta = customerRes.data?.customer?.metadata ?? {}
    const prevTotal = typeof currentMeta.pos_total_purchases === 'number'
        ? currentMeta.pos_total_purchases
        : 0
    const prevSpent = typeof currentMeta.pos_total_spent === 'number'
        ? currentMeta.pos_total_spent
        : 0

    // Update with incremented values
    await adminFetch(`/admin/customers/${customerId}`, {
        method: 'POST',
        body: JSON.stringify({
            metadata: {
                ...currentMeta,
                pos_total_purchases: prevTotal + 1,
                pos_total_spent: prevSpent + saleAmount,
                pos_last_purchase: new Date().toISOString(),
                pos_last_order_id: orderId,
            },
        }),
    }, scope)
}

// ---------------------------------------------------------------------------
// Email Receipt — Send digital receipt to customer via governance email engine
// ---------------------------------------------------------------------------

/**
 * Send POS receipt email to customer.
 * Looks up customer email from Medusa, then sends via `sendEmailForTenant`.
 * Gated by `enable_pos` flag and email governance (rate limits, toggles).
 */
async function sendPOSReceiptEmail(
    tenantId: string,
    customerId: string,
    saleData: {
        order_id: string
        display_id?: number
        items: { variant_id: string; quantity: number; unit_price: number }[]
        total: number
        payment_method: string
        currency_code: string
    },
    scope: Awaited<ReturnType<typeof getTenantMedusaScope>>
): Promise<void> {
    const { adminFetch } = await import('@/lib/medusa/admin-core')

    // Fetch customer email
    const customerRes = await adminFetch<{
        customer: { id: string; email?: string; first_name?: string; last_name?: string }
    }>(`/admin/customers/${customerId}`, {}, scope)

    const customer = customerRes.data?.customer
    if (!customer?.email || customer.email.endsWith('@tienda.local')) {
        return // No real email — skip
    }

    // Send via governance-aware email engine
    const { sendEmailForTenant } = await import('@/lib/email')
    await sendEmailForTenant(tenantId, {
        template: 'pos_receipt',
        to: customer.email,
        subject: `Recibo de compra #${saleData.display_id ?? saleData.order_id.slice(-6)}`,
        data: {
            customerName: [customer.first_name, customer.last_name].filter(Boolean).join(' ') || undefined,
            orderId: saleData.order_id,
            displayId: saleData.display_id,
            items: saleData.items,
            total: saleData.total,
            paymentMethod: saleData.payment_method,
            currencyCode: saleData.currency_code,
            date: new Date().toISOString(),
        },
    })
}
