import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { logTenantError } from '@/lib/log-tenant-error'
import { sendEmailForTenant, type EmailTemplate } from '@/lib/email'

// ---------------------------------------------------------------------------
// Stripe webhook handler — transactional inbox pattern
//
// Events go through: received → processing → processed | failed
// Failed and stale processing events can be retried by Stripe.
// ---------------------------------------------------------------------------

const MEDUSA_BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'

// Stale processing timeout — events stuck in 'processing' for longer than this
// are considered crashed and can be re-claimed by Stripe retries.
const STALE_PROCESSING_MINUTES = 5

type ClaimResult = 'claimed' | 'duplicate' | 'unavailable'

/**
 * Transactional inbox: claim a Stripe event for processing.
 * 
 * 1. Try INSERT with status='processing' (ON CONFLICT DO NOTHING)
 * 2. If duplicate, check if retryable (failed / stale processing)
 * 3. Only 'processed' events are truly skipped
 */
async function claimEvent(eventId: string, eventType: string): Promise<ClaimResult> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
        console.warn('[stripe-webhook] Dedup config missing — returning unavailable for Stripe retry')
        return 'unavailable'
    }

    const tenantId = process.env.TENANT_ID || null
    const headers = {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
    }

    try {
        // Step 1: Try to INSERT (new event) in 'processing' state
        const res = await fetch(`${supabaseUrl}/rest/v1/stripe_webhook_events`, {
            method: 'POST',
            headers: {
                ...headers,
                Prefer: 'resolution=ignore-duplicates,return=representation',
            },
            body: JSON.stringify({
                event_id: eventId,
                event_type: eventType,
                tenant_id: tenantId,
                status: 'processing',
                attempts: 1,
            }),
        })
        const rows = await res.json()

        if (Array.isArray(rows) && rows.length > 0) {
            return 'claimed'
        }

        // Step 2: Row exists — check if retryable
        const checkRes = await fetch(
            `${supabaseUrl}/rest/v1/stripe_webhook_events?event_id=eq.${encodeURIComponent(eventId)}&select=status,created_at,attempts`,
            { headers }
        )
        const existing = await checkRes.json()

        if (!Array.isArray(existing) || existing.length === 0) {
            return 'unavailable'
        }

        const event = existing[0]

        // Already processed — skip
        if (event.status === 'processed') return 'duplicate'

        // Failed — allow retry
        if (event.status === 'failed') {
            const updateRes = await fetch(
                `${supabaseUrl}/rest/v1/stripe_webhook_events?event_id=eq.${encodeURIComponent(eventId)}`,
                {
                    method: 'PATCH',
                    headers: { ...headers, Prefer: 'return=representation' },
                    body: JSON.stringify({
                        status: 'processing',
                        attempts: (event.attempts || 0) + 1,
                        error: null,
                    }),
                }
            )
            const updated = await updateRes.json()
            return (Array.isArray(updated) && updated.length > 0) ? 'claimed' : 'duplicate'
        }

        // Stale processing — crashed handler, allow re-claim
        if (event.status === 'processing') {
            const createdAt = new Date(event.created_at)
            const staleThreshold = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60 * 1000)
            if (createdAt < staleThreshold) {
                const updateRes = await fetch(
                    `${supabaseUrl}/rest/v1/stripe_webhook_events?event_id=eq.${encodeURIComponent(eventId)}&status=eq.processing`,
                    {
                        method: 'PATCH',
                        headers: { ...headers, Prefer: 'return=representation' },
                        body: JSON.stringify({ attempts: (event.attempts || 0) + 1, error: null }),
                    }
                )
                const updated = await updateRes.json()
                return (Array.isArray(updated) && updated.length > 0) ? 'claimed' : 'duplicate'
            }
            return 'duplicate'
        }

        return 'duplicate'
    } catch (err) {
        console.error('[stripe-webhook] claimEvent error:', err)
        return 'unavailable'
    }
}

/** Mark a webhook event as successfully processed. */
async function markEventProcessed(eventId: string): Promise<void> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) return
    try {
        await fetch(
            `${supabaseUrl}/rest/v1/stripe_webhook_events?event_id=eq.${encodeURIComponent(eventId)}`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: serviceKey,
                    Authorization: `Bearer ${serviceKey}`,
                    Prefer: 'return=minimal',
                },
                body: JSON.stringify({ status: 'processed', processed_at: new Date().toISOString(), error: null }),
            }
        )
    } catch (err) {
        console.error('[stripe-webhook] markEventProcessed error:', err)
    }
}

/** Mark a webhook event as failed — allows Stripe retry. */
async function markEventFailed(eventId: string, error: string): Promise<void> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) return
    try {
        await fetch(
            `${supabaseUrl}/rest/v1/stripe_webhook_events?event_id=eq.${encodeURIComponent(eventId)}`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: serviceKey,
                    Authorization: `Bearer ${serviceKey}`,
                    Prefer: 'return=minimal',
                },
                body: JSON.stringify({ status: 'failed', error: error.slice(0, 500) }),
            }
        )
    } catch (err) {
        console.error('[stripe-webhook] markEventFailed error:', err)
    }
}

/**
 * Stripe webhook endpoint.
 * Validates signature, deduplicates events, processes payment events, updates Medusa.
 */
export async function POST(request: NextRequest) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    // If webhook secret is not configured or is PLACEHOLDER, reject
    if (!webhookSecret || webhookSecret.includes('PLACEHOLDER')) {
        console.warn('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured')
        return NextResponse.json(
            { error: 'Webhook not configured' },
            { status: 503 }
        )
    }

    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey || secretKey.includes('PLACEHOLDER')) {
        return NextResponse.json(
            { error: 'Stripe not configured' },
            { status: 503 }
        )
    }

    const stripe = new Stripe(secretKey)

    // Read raw body for signature validation
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
        return NextResponse.json(
            { error: 'Missing stripe-signature header' },
            { status: 400 }
        )
    }

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
        console.error('[stripe-webhook] Signature verification failed:', err)
        return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 400 }
        )
    }

    // ── Atomic idempotency: claim-or-skip ──
    const claimResult = await claimEvent(event.id, event.type)
    if (claimResult === 'duplicate') {
        console.log(`[stripe-webhook] Event ${event.id} is a duplicate — skipping`)
        return NextResponse.json({ received: true, duplicate: true })
    }
    if (claimResult === 'unavailable') {
        console.warn(`[stripe-webhook] Idempotency backend unavailable for event ${event.id} — requesting Stripe retry`)
        return NextResponse.json(
            { error: 'Idempotency backend unavailable' },
            { status: 503 }
        )
    }

    // ── Transactional inbox: process events ──
    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent
                console.log(
                    `[stripe-webhook] PaymentIntent ${paymentIntent.id} succeeded`,
                    { amount: paymentIntent.amount, metadata: paymentIntent.metadata }
                )

                // ── CRITICAL PATH: cart completion ──
                // If this fails, Stripe MUST retry (500) — we cannot lose orders.
                const cartId = paymentIntent.metadata?.cart_id
                if (cartId) {
                    const completed = await completeCartInMedusa(cartId)
                    if (!completed) {
                        console.error(`[stripe-webhook] CRITICAL: Cart ${cartId} completion failed — requesting Stripe retry`)
                        await logTenantError({
                            source: 'webhook',
                            severity: 'critical',
                            message: `Cart completion failed for cart ${cartId}`,
                            details: { cart_id: cartId, payment_intent: paymentIntent.id },
                        })
                        await markEventFailed(event.id, `Cart ${cartId} completion failed`)
                        return NextResponse.json(
                            { error: 'Cart completion failed' },
                            { status: 500 }
                        )
                    }
                }

                // ── NON-CRITICAL: email + analytics ──
                // Failures here are logged but don't warrant Stripe retry.
                await sendTenantEmail({
                    to: paymentIntent.receipt_email || paymentIntent.metadata?.email || '',
                    subject: '🎉 ¡Pedido Confirmado!',
                    template: 'order_confirmation',
                    data: {
                        customerName: paymentIntent.metadata?.customer_name,
                        orderId: paymentIntent.metadata?.cart_id,
                        total: (paymentIntent.amount / 100).toFixed(2),
                        storeUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
                    },
                })

                await logAnalyticsEvent('checkout_complete', {
                    payment_intent_id: paymentIntent.id,
                    amount: paymentIntent.amount,
                    cart_id: cartId,
                })

                // Emit order_placed for consistent funnel tracking
                await logAnalyticsEvent('order_placed', {
                    payment_intent_id: paymentIntent.id,
                    amount: paymentIntent.amount,
                    cart_id: cartId,
                    payment_method: 'stripe',
                })

                break
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent
                console.error(
                    `[stripe-webhook] PaymentIntent ${paymentIntent.id} failed`,
                    {
                        error: paymentIntent.last_payment_error?.message,
                        metadata: paymentIntent.metadata,
                    }
                )

                // Send payment failed email
                await sendTenantEmail({
                    to: paymentIntent.receipt_email || paymentIntent.metadata?.email || '',
                    subject: '⚠️ Pago No Procesado',
                    template: 'payment_failed',
                    data: {
                        customerName: paymentIntent.metadata?.customer_name,
                        orderId: paymentIntent.metadata?.cart_id,
                        reason: paymentIntent.last_payment_error?.message,
                    },
                })

                break
            }

            case 'charge.refunded': {
                const charge = event.data.object as Stripe.Charge
                console.log(
                    `[stripe-webhook] Charge ${charge.id} refunded`,
                    { amount_refunded: charge.amount_refunded }
                )

                // Send refund email
                await sendTenantEmail({
                    to: charge.billing_details?.email || '',
                    subject: '💰 Reembolso Procesado',
                    template: 'refund_processed',
                    data: {
                        customerName: charge.billing_details?.name || undefined,
                        orderId: charge.metadata?.cart_id,
                        amount: (charge.amount_refunded / 100).toFixed(2),
                    },
                })

                break
            }

            case 'checkout.session.expired': {
                const session = event.data.object as Stripe.Checkout.Session
                console.log(
                    `[stripe-webhook] Checkout session ${session.id} expired`,
                    { metadata: session.metadata }
                )

                await logAnalyticsEvent('checkout_abandoned', {
                    session_id: session.id,
                    cart_id: session.metadata?.cart_id,
                    reason: 'session_expired',
                })

                break
            }

            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                console.log(
                    `[stripe-webhook] Checkout session ${session.id} completed`,
                    { payment_status: session.payment_status, metadata: session.metadata }
                )

                // Safety net: if payment_intent.succeeded didn't fire yet, complete cart here
                if (session.payment_status === 'paid') {
                    const cartId = session.metadata?.cart_id
                    if (cartId) {
                        await completeCartInMedusa(cartId)
                    }
                }

                await logAnalyticsEvent('checkout_session_completed', {
                    session_id: session.id,
                    payment_status: session.payment_status,
                    cart_id: session.metadata?.cart_id,
                })

                break
            }

            default:
                console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
        }

        // ── Mark event as successfully processed ──
        await markEventProcessed(event.id)
        return NextResponse.json({ received: true })
    } catch (err) {
        console.error('[stripe-webhook] Unhandled error processing event:', err)
        // ── Mark event as failed — allows Stripe retry ──
        const errMsg = err instanceof Error ? err.message : 'Processing error'
        await markEventFailed(event.id, errMsg)
        return NextResponse.json(
            { error: 'Processing error' },
            { status: 500 }
        )
    }
}

// ---------------------------------------------------------------------------
// Helper: Complete cart in Medusa
// ---------------------------------------------------------------------------

async function completeCartInMedusa(cartId: string): Promise<boolean> {
    try {
        const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

        const res = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${cartId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(publishableKey && { 'x-publishable-api-key': publishableKey }),
            },
        })

        if (!res.ok) {
            const text = await res.text()
            console.error(`[stripe-webhook] Failed to complete cart ${cartId}:`, text)
            return false
        }

        const data = await res.json()
        console.log(`[stripe-webhook] Cart ${cartId} completed → Order ${data.order?.id}`)
        return true
    } catch (err) {
        console.error(`[stripe-webhook] Error completing cart ${cartId}:`, err)
        return false
    }
}

/**
 * Send email using per-tenant config from `sendEmailForTenant()`.
 * Non-blocking — errors are logged but don't propagate.
 */
async function sendTenantEmail(payload: {
    to: string
    subject: string
    template: EmailTemplate
    data: Record<string, unknown>
}): Promise<void> {
    try {
        if (!payload.to) {
            console.warn('[stripe-webhook] No email recipient — skipping email')
            return
        }

        const tenantId = process.env.TENANT_ID
        if (!tenantId) {
            console.warn('[stripe-webhook] No TENANT_ID configured — using default email provider')
            // Fall back to default provider (console in dev)
            const { sendEmail } = await import('@/lib/email')
            const result = await sendEmail(payload)
            console.log('[stripe-webhook] Email result:', result)
            return
        }

        const result = await sendEmailForTenant(tenantId, payload)
        console.log('[stripe-webhook] Email result:', result)
    } catch (err) {
        // Non-blocking — don't fail the webhook for email issues
        console.error('[stripe-webhook] Email send error:', err)
    }
}

// ---------------------------------------------------------------------------
// Helper: Log analytics event to Supabase
// ---------------------------------------------------------------------------

async function logAnalyticsEvent(
    eventType: string,
    properties: Record<string, unknown>
): Promise<void> {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseKey) return

        const tenantId = process.env.TENANT_ID || null

        await fetch(`${supabaseUrl}/rest/v1/analytics_events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                Prefer: 'return=minimal',
            },
            body: JSON.stringify({
                event_type: eventType,
                properties: {
                    ...properties,
                    source: 'stripe_webhook',
                },
                tenant_id: tenantId,
            }),
        })
    } catch (err) {
        console.error('[stripe-webhook] Analytics log error:', err)
    }
}
