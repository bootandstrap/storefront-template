import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, WEBHOOK_GUARD } from '@/lib/security/api-rate-guard'
import { logTenantError } from '@/lib/log-tenant-error'
import { sendEmailForTenant, type EmailTemplate } from '@/lib/email'
import { createGovernanceClient } from '@/lib/supabase/governance'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Stripe webhook handler — transactional inbox pattern
//
// Events go through: received → processing → processed | failed
// Failed and stale processing events can be retried by Stripe.
// ---------------------------------------------------------------------------

const MEDUSA_BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'

// Idempotency via SECURITY DEFINER RPCs — no service_role_key needed.
// RPCs: claim_webhook_event, mark_webhook_processed, mark_webhook_failed
// All use anon key via governance client. Stale timeout (5 min) is server-side in the RPC.

type ClaimResult = 'claimed' | 'duplicate' | 'retry' | 'unavailable'

/**
 * Transactional inbox: claim a Stripe event for processing via RPC.
 * Returns 'claimed' | 'retry' (re-claimed) | 'duplicate' | 'unavailable'.
 */
async function claimEvent(eventId: string, eventType: string): Promise<ClaimResult> {
    try {
        const supabase = createGovernanceClient()
        const tenantId = process.env.TENANT_ID || null
        const { data, error } = await supabase.rpc('claim_webhook_event', {
            p_event_id: eventId,
            p_event_type: eventType,
            p_tenant_id: tenantId,
        })
        if (error) {
            logger.error('[stripe-webhook] claim RPC error:', error.message)
            return 'unavailable'
        }
        return (data as ClaimResult) || 'unavailable'
    } catch (err) {
        logger.error('[stripe-webhook] claimEvent error:', err)
        return 'unavailable'
    }
}

/** Mark a webhook event as successfully processed via RPC. */
async function markEventProcessed(eventId: string): Promise<void> {
    try {
        const supabase = createGovernanceClient()
        await supabase.rpc('mark_webhook_processed', { p_event_id: eventId })
    } catch (err) {
        logger.error('[stripe-webhook] markEventProcessed error:', err)
    }
}

/** Mark a webhook event as failed — allows Stripe retry via RPC. */
async function markEventFailed(eventId: string, error: string): Promise<void> {
    try {
        const supabase = createGovernanceClient()
        await supabase.rpc('mark_webhook_failed', { p_event_id: eventId, p_error: error })
    } catch (err) {
        logger.error('[stripe-webhook] markEventFailed error:', err)
    }
}

/**
 * Stripe webhook endpoint.
 * Validates signature, deduplicates events, processes payment events, updates Medusa.
 */
export async function POST(request: NextRequest) {
    // ── Rate limit: block IP floods before hitting crypto constructEvent() ─
    // WEBHOOK_GUARD allows 120 req/min. Stripe's own retry cadence is well
    // within this window. This protects against unsigned request DoS attacks.
    const rl = await withRateLimit(request, WEBHOOK_GUARD)
    if (rl.limited) return rl.response!

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    // If webhook secret is not configured or is PLACEHOLDER, reject
    if (!webhookSecret || webhookSecret.includes('PLACEHOLDER')) {
        logger.warn('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured')
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
        logger.error('[stripe-webhook] Signature verification failed:', err)
        return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 400 }
        )
    }

    // ── Atomic idempotency: claim-or-skip ──
    const claimResult = await claimEvent(event.id, event.type)
    if (claimResult === 'duplicate') {
        logger.info('[stripe-webhook] Duplicate event skipped', { eventId: event.id })
        return NextResponse.json({ received: true, duplicate: true })
    }
    if (claimResult === 'unavailable') {
        logger.warn(`[stripe-webhook] Idempotency backend unavailable for event ${event.id} — requesting Stripe retry`)
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
                logger.info(
                    '[stripe-webhook] PaymentIntent succeeded',
                    { paymentIntentId: paymentIntent.id, amount: paymentIntent.amount, metadata: paymentIntent.metadata }
                )

                // ── CRITICAL PATH: cart completion ──
                // If this fails, Stripe MUST retry (500) — we cannot lose orders.
                const cartId = paymentIntent.metadata?.cart_id
                if (cartId) {
                    const completed = await completeCartInMedusa(cartId)
                    if (!completed) {
                        logger.error(`[stripe-webhook] CRITICAL: Cart ${cartId} completion failed — requesting Stripe retry`)
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
                logger.error(
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
                logger.info(
                    '[stripe-webhook] Charge refunded',
                    { chargeId: charge.id, amount_refunded: charge.amount_refunded }
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
                logger.info(
                    '[stripe-webhook] Checkout session expired',
                    { sessionId: session.id, metadata: session.metadata }
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
                logger.info(
                    '[stripe-webhook] Checkout session completed',
                    { sessionId: session.id, payment_status: session.payment_status, metadata: session.metadata }
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
                logger.warn('[stripe-webhook] Unhandled event type', { event_type: event.type })
        }

        // ── Mark event as successfully processed ──
        await markEventProcessed(event.id)
        return NextResponse.json({ received: true })
    } catch (err) {
        logger.error('[stripe-webhook] Unhandled error processing event:', err)
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
// Helper: Complete cart in Medusa (with exponential backoff retry)
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = process.env.NODE_ENV === 'test' ? 10 : 1000

async function completeCartInMedusa(cartId: string): Promise<boolean> {
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${cartId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(publishableKey && { 'x-publishable-api-key': publishableKey }),
                },
            })

            if (res.ok) {
                const data = await res.json()
                logger.info('[stripe-webhook] Cart completed', { cartId, orderId: data.order?.id, attempt: attempt + 1 })
                return true
            }

            // 409 = already completed — treat as success
            if (res.status === 409) {
                logger.info('[stripe-webhook] Cart already completed (409)', { cartId })
                return true
            }

            const text = await res.text()
            logger.error(`[stripe-webhook] Cart ${cartId} completion attempt ${attempt + 1}/${MAX_RETRIES + 1} failed (${res.status}):`, text)

            // Don't retry on client errors (4xx except 409)
            if (res.status >= 400 && res.status < 500) {
                return false
            }
        } catch (err) {
            logger.error(`[stripe-webhook] Cart ${cartId} completion attempt ${attempt + 1}/${MAX_RETRIES + 1} error:`, err)
        }

        // Exponential backoff before retry
        if (attempt < MAX_RETRIES) {
            const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt)
            logger.debug('[stripe-webhook] Retrying cart completion', { cartId, backoff })
            await new Promise(resolve => setTimeout(resolve, backoff))
        }
    }

    logger.error(`[stripe-webhook] Cart ${cartId} completion exhausted all ${MAX_RETRIES + 1} attempts`)
    return false
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
            logger.warn('[stripe-webhook] No email recipient — skipping email')
            return
        }

        const tenantId = process.env.TENANT_ID
        if (!tenantId) {
            logger.warn('[stripe-webhook] No TENANT_ID configured — using default email provider')
            // Fall back to default provider (console in dev)
            const { sendEmail } = await import('@/lib/email')
            const result = await sendEmail(payload)
            logger.debug('[stripe-webhook] Email result (fallback)', { result })
            return
        }

        const result = await sendEmailForTenant(tenantId, payload)
        logger.debug('[stripe-webhook] Email result', { result })
    } catch (err) {
        // Non-blocking — don't fail the webhook for email issues
        logger.error('[stripe-webhook] Email send error:', err)
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
        const supabase = createGovernanceClient()
        const tenantId = process.env.TENANT_ID || null

        await supabase.from('analytics_events').insert({
            event_type: eventType,
            metadata: { ...properties, source: 'stripe_webhook' },
            tenant_id: tenantId,
            user_id: null, // RLS allows INSERT when user_id is NULL
        })
    } catch (err) {
        logger.error('[stripe-webhook] Analytics log error:', err)
    }
}
