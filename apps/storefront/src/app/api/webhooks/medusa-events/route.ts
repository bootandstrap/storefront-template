/**
 * Internal Medusa Events Webhook
 *
 * Receives event payloads from Medusa subscribers (order.placed, order.shipped,
 * low-stock-alert) and dispatches emails via the tenant's configured provider.
 *
 * Architecture: Medusa runs in a separate container and has no access to tenant
 * email config (stored in Supabase). This route bridges that gap — Medusa
 * subscribers POST here, and the storefront sends emails via `sendEmailForTenant()`.
 *
 * Security: Protected by `MEDUSA_EVENTS_SECRET` shared between Medusa and storefront.
 * Falls back to checking that the request comes from localhost (same Docker network).
 *
 * Zone: 🔴 LOCKED — platform infrastructure
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendEmailForTenant, sendEmail, type EmailTemplate } from '@/lib/email'
import { getConfig } from '@/lib/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MedusaEventPayload {
    event_type: 'order.placed' | 'order.shipped' | 'inventory.low_stock'
    data: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
    // ── Auth: shared secret (MANDATORY) ──
    const secret = process.env.MEDUSA_EVENTS_SECRET
    if (!secret) {
        console.error('[medusa-events] MEDUSA_EVENTS_SECRET is not configured — rejecting all requests')
        return NextResponse.json(
            { error: 'Webhook not configured. Set MEDUSA_EVENTS_SECRET.' },
            { status: 503 }
        )
    }

    const authHeader = request.headers.get('x-medusa-events-secret')
    if (authHeader !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let payload: MedusaEventPayload
    try {
        payload = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!payload.event_type || !payload.data) {
        return NextResponse.json({ error: 'Missing event_type or data' }, { status: 400 })
    }

    const tenantId = process.env.TENANT_ID
    const appConfig = await getConfig()

    try {
        switch (payload.event_type) {
            case 'order.placed': {
                const { customer_email, display_id, total, currency, customer_name } = payload.data as {
                    customer_email?: string
                    display_id?: number
                    total?: number
                    currency?: string
                    customer_name?: string
                }

                if (!customer_email) {
                    console.warn('[medusa-events] order.placed: no customer email')
                    break
                }

                const emailPayload = {
                    to: customer_email,
                    subject: `🎉 Order #${display_id || ''} Confirmed!`,
                    template: 'order_confirmation' as EmailTemplate,
                    data: {
                        customerName: customer_name || customer_email.split('@')[0],
                        orderId: String(display_id || ''),
                        total: typeof total === 'number' ? (total / 100).toFixed(2) : '0.00',
                        currency: currency?.toUpperCase() || appConfig.config.default_currency.toUpperCase(),
                        storeName: process.env.NEXT_PUBLIC_STORE_NAME || 'Store',
                        storeUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
                    },
                }

                if (tenantId) {
                    await sendEmailForTenant(tenantId, emailPayload)
                } else {
                    await sendEmail(emailPayload)
                }

                console.log(`[medusa-events] order.placed email sent to ${customer_email}`)
                break
            }

            case 'order.shipped': {
                const {
                    customer_email,
                    display_id,
                    tracking_numbers,
                    customer_name,
                } = payload.data as {
                    customer_email?: string
                    display_id?: number
                    tracking_numbers?: string[]
                    customer_name?: string
                }

                if (!customer_email) {
                    console.warn('[medusa-events] order.shipped: no customer email')
                    break
                }

                const emailPayload = {
                    to: customer_email,
                    subject: `📦 Order #${display_id || ''} Has Shipped!`,
                    template: 'order_shipped' as EmailTemplate,
                    data: {
                        customerName: customer_name || customer_email.split('@')[0],
                        orderId: String(display_id || ''),
                        trackingUrl: tracking_numbers?.[0]
                            ? `https://track.aftership.com/${tracking_numbers[0]}`
                            : undefined,
                        storeName: process.env.NEXT_PUBLIC_STORE_NAME || 'Store',
                        storeUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
                    },
                }

                if (tenantId) {
                    await sendEmailForTenant(tenantId, emailPayload)
                } else {
                    await sendEmail(emailPayload)
                }

                console.log(`[medusa-events] order.shipped email sent to ${customer_email}`)
                break
            }

            case 'inventory.low_stock': {
                const {
                    sku,
                    title,
                    available_stock,
                    out_of_stock,
                    owner_email,
                } = payload.data as {
                    sku?: string
                    title?: string
                    available_stock?: number
                    out_of_stock?: boolean
                    owner_email?: string
                }

                // Low stock alerts go to the store owner, not the customer
                const recipientEmail = owner_email || process.env.STORE_OWNER_EMAIL
                if (!recipientEmail) {
                    console.warn('[medusa-events] low_stock: no owner email configured')
                    break
                }

                const emailPayload = {
                    to: recipientEmail,
                    subject: `📉 ${out_of_stock ? 'OUT OF STOCK' : 'Low Stock'}: ${title || sku || 'Unknown product'}`,
                    template: 'low_stock_alert' as EmailTemplate,
                    data: {
                        title: title || 'Unknown',
                        sku: sku || '',
                        availableStock: available_stock ?? 0,
                        outOfStock: out_of_stock || false,
                        storeName: process.env.NEXT_PUBLIC_STORE_NAME || 'Store',
                    },
                }

                if (tenantId) {
                    await sendEmailForTenant(tenantId, emailPayload)
                } else {
                    await sendEmail(emailPayload)
                }

                console.log(`[medusa-events] low_stock alert sent to ${recipientEmail}`)
                break
            }

            default:
                console.log(`[medusa-events] Unhandled event type: ${payload.event_type}`)
        }

        return NextResponse.json({ received: true })
    } catch (err) {
        console.error('[medusa-events] Error processing event:', err)
        return NextResponse.json(
            { error: 'Processing error' },
            { status: 500 }
        )
    }
}
