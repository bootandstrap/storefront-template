import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Stripe webhook handler
// ---------------------------------------------------------------------------

const MEDUSA_BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'

/**
 * Stripe webhook endpoint.
 * Validates signature, processes payment events, updates Medusa order.
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

    // Process events
    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent
                console.log(
                    `[stripe-webhook] PaymentIntent ${paymentIntent.id} succeeded`,
                    { amount: paymentIntent.amount, metadata: paymentIntent.metadata }
                )

                // If there's a cart_id in metadata, complete the cart in Medusa
                const cartId = paymentIntent.metadata?.cart_id
                if (cartId) {
                    await completeCartInMedusa(cartId)
                }

                // Send order confirmation email
                await triggerEmail({
                    to: paymentIntent.receipt_email || paymentIntent.metadata?.email || '',
                    subject: '🎉 ¡Pedido Confirmado! — Campifrut',
                    template: 'order_confirmation',
                    data: {
                        customer_name: paymentIntent.metadata?.customer_name,
                        order_id: paymentIntent.metadata?.cart_id,
                        total: (paymentIntent.amount / 100).toFixed(2),
                        store_url: process.env.NEXT_PUBLIC_STORE_URL || 'https://campifrut.com',
                    },
                })

                // Log analytics event
                await logAnalyticsEvent('checkout_complete', {
                    payment_intent_id: paymentIntent.id,
                    amount: paymentIntent.amount,
                    cart_id: cartId,
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
                await triggerEmail({
                    to: paymentIntent.receipt_email || paymentIntent.metadata?.email || '',
                    subject: '⚠️ Pago No Procesado — Campifrut',
                    template: 'payment_failed',
                    data: {
                        customer_name: paymentIntent.metadata?.customer_name,
                        order_id: paymentIntent.metadata?.cart_id,
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
                await triggerEmail({
                    to: charge.billing_details?.email || '',
                    subject: '💰 Reembolso Procesado — Campifrut',
                    template: 'refund_processed',
                    data: {
                        customer_name: charge.billing_details?.name || undefined,
                        order_id: charge.metadata?.cart_id,
                        amount: (charge.amount_refunded / 100).toFixed(2),
                    },
                })

                break
            }

            default:
                console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
        }

        return NextResponse.json({ received: true })
    } catch (err) {
        console.error('[stripe-webhook] Error processing event:', err)
        // Return 200 anyway to prevent Stripe from retrying
        // (we log the error and handle it async)
        return NextResponse.json({ received: true, error: 'Processing error logged' })
    }
}

// ---------------------------------------------------------------------------
// Helper: Complete cart in Medusa
// ---------------------------------------------------------------------------

async function completeCartInMedusa(cartId: string): Promise<void> {
    try {
        const res = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${cartId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        })

        if (!res.ok) {
            const text = await res.text()
            console.error(`[stripe-webhook] Failed to complete cart ${cartId}:`, text)
            return
        }

        const data = await res.json()
        console.log(`[stripe-webhook] Cart ${cartId} completed → Order ${data.order?.id}`)
    } catch (err) {
        console.error(`[stripe-webhook] Error completing cart ${cartId}:`, err)
    }
}

// ---------------------------------------------------------------------------
// Helper: Trigger transactional email via Supabase Edge Function
// ---------------------------------------------------------------------------

interface EmailPayload {
    to: string
    subject: string
    template: 'order_confirmation' | 'payment_failed' | 'refund_processed'
    data: Record<string, string | number | undefined>
}

async function triggerEmail(payload: EmailPayload): Promise<void> {
    try {
        if (!payload.to) {
            console.warn('[stripe-webhook] No email recipient — skipping email')
            return
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseKey) {
            console.warn('[stripe-webhook] Supabase not configured — skipping email')
            return
        }

        const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify(payload),
        })

        const result = await res.json()
        console.log('[stripe-webhook] Email result:', result)
    } catch (err) {
        // Non-blocking — don't fail the webhook for email issues
        console.error('[stripe-webhook] Email trigger error:', err)
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

        const tenantId = process.env.TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID || null

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

