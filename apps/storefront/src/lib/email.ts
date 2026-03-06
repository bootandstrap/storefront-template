/**
 * Email Notification Service — Abstract Interface
 *
 * Provides a provider-agnostic email interface for transactional notifications.
 * Storefront code calls `sendEmail()` without knowing the underlying provider.
 *
 * Providers can be:
 *   - Resend (recommended for production)
 *   - SendGrid
 *   - Mailgun
 *   - Console (development — logs to stdout)
 *
 * Configuration:
 *   - `EMAIL_PROVIDER`: 'resend' | 'sendgrid' | 'mailgun' | 'console' (default: 'console')
 *   - `EMAIL_API_KEY`: API key for the selected provider
 *   - `EMAIL_FROM`: Default sender address (e.g. "Store <noreply@store.com>")
 *
 * This is a 🟡 EXTEND zone file — add providers freely, don't remove the interface.
 *
 * @module lib/email
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmailTemplate =
    | 'order_confirmation'
    | 'order_shipped'
    | 'order_delivered'
    | 'order_cancelled'
    | 'payment_failed'
    | 'refund_processed'
    | 'low_stock_alert'
    | 'welcome'
    | 'password_reset'
    | 'account_verification'
    | 'review_request'
    | 'abandoned_cart'

export interface EmailPayload {
    /** Recipient email address */
    to: string
    /** Email subject line */
    subject: string
    /** Email template to use */
    template: EmailTemplate
    /** Template variables (merged into the template) */
    data: Record<string, unknown>
    /** Optional reply-to address */
    replyTo?: string
    /** Optional locale for template rendering */
    locale?: string
}

export interface EmailResult {
    success: boolean
    messageId?: string
    error?: string
}

export interface EmailProvider {
    name: string
    send(payload: EmailPayload): Promise<EmailResult>
}

// ---------------------------------------------------------------------------
// Console Provider (Development)
// ---------------------------------------------------------------------------

const consoleProvider: EmailProvider = {
    name: 'console',
    async send(payload) {
        console.log(`[EMAIL] To: ${payload.to} | Subject: ${payload.subject} | Template: ${payload.template}`)
        console.log(`[EMAIL] Data:`, JSON.stringify(payload.data, null, 2))
        return { success: true, messageId: `console-${Date.now()}` }
    },
}

// ---------------------------------------------------------------------------
// Resend Provider
// ---------------------------------------------------------------------------

function createResendProvider(apiKey: string): EmailProvider {
    return {
        name: 'resend',
        async send(payload) {
            try {
                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: process.env.EMAIL_FROM || 'Store <noreply@example.com>',
                        to: payload.to,
                        subject: payload.subject,
                        html: buildHtml(payload),
                        reply_to: payload.replyTo,
                    }),
                })
                if (!res.ok) {
                    const err = await res.text()
                    return { success: false, error: `Resend error: ${err}` }
                }
                const data = await res.json() as { id: string }
                return { success: true, messageId: data.id }
            } catch (e) {
                return { success: false, error: `Resend send failed: ${e instanceof Error ? e.message : String(e)}` }
            }
        },
    }
}

// ---------------------------------------------------------------------------
// SendGrid Provider
// ---------------------------------------------------------------------------

function createSendGridProvider(apiKey: string): EmailProvider {
    return {
        name: 'sendgrid',
        async send(payload) {
            try {
                const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        personalizations: [{ to: [{ email: payload.to }] }],
                        from: { email: process.env.EMAIL_FROM || 'noreply@example.com' },
                        subject: payload.subject,
                        content: [{ type: 'text/html', value: buildHtml(payload) }],
                        reply_to: payload.replyTo ? { email: payload.replyTo } : undefined,
                    }),
                })
                if (!res.ok) {
                    const err = await res.text()
                    return { success: false, error: `SendGrid error: ${err}` }
                }
                const messageId = res.headers.get('x-message-id') || `sg-${Date.now()}`
                return { success: true, messageId }
            } catch (e) {
                return { success: false, error: `SendGrid send failed: ${e instanceof Error ? e.message : String(e)}` }
            }
        },
    }
}

// ---------------------------------------------------------------------------
// Template Builder (minimal — replace with proper templating in production)
// ---------------------------------------------------------------------------

function buildHtml(payload: EmailPayload): string {
    const { template, data } = payload

    // Minimal responsive email wrapper
    const wrap = (content: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; padding: 32px 16px; }
        .card { background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { font-size: 24px; color: #111; margin: 0; }
        .content { color: #333; line-height: 1.6; font-size: 15px; }
        .footer { text-align: center; margin-top: 32px; color: #999; font-size: 13px; }
        .btn { display: inline-block; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">${content}</div>
        <div class="footer">${data.storeName || 'Store'} — ${data.storeUrl || ''}</div>
    </div>
</body>
</html>`

    switch (template) {
        case 'order_confirmation':
            return wrap(`
                <div class="header"><h1>🎉 ${data.heading || 'Order Confirmed!'}</h1></div>
                <div class="content">
                    <p>${data.greeting || `Hi ${data.customerName},`}</p>
                    <p>${data.message || 'Thank you for your order. We\'re preparing it now.'}</p>
                    <p><strong>Order #${data.orderId || ''}</strong></p>
                    ${data.orderUrl ? `<p><a href="${data.orderUrl}" class="btn">View Order</a></p>` : ''}
                </div>
            `)

        case 'order_shipped':
            return wrap(`
                <div class="header"><h1>📦 ${data.heading || 'Your Order Has Shipped!'}</h1></div>
                <div class="content">
                    <p>${data.greeting || `Hi ${data.customerName},`}</p>
                    <p>${data.message || 'Your order is on its way.'}</p>
                    ${data.trackingUrl ? `<p><a href="${data.trackingUrl}" class="btn">Track Package</a></p>` : ''}
                </div>
            `)

        case 'payment_failed':
            return wrap(`
                <div class="header"><h1>⚠️ ${data.heading || 'Payment Not Processed'}</h1></div>
                <div class="content">
                    <p>${data.greeting || `Hi ${data.customerName || 'there'},`}</p>
                    <p>We weren't able to process your payment${data.orderId ? ` for order #${data.orderId}` : ''}.</p>
                    ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
                    <p>Please try again or use a different payment method.</p>
                    ${data.retryUrl ? `<p><a href="${data.retryUrl}" class="btn">Try Again</a></p>` : ''}
                </div>
            `)

        case 'refund_processed':
            return wrap(`
                <div class="header"><h1>💰 ${data.heading || 'Refund Processed'}</h1></div>
                <div class="content">
                    <p>${data.greeting || `Hi ${data.customerName || 'there'},`}</p>
                    <p>Your refund of <strong>${data.currency || ''}${data.amount || ''}</strong> has been processed${data.orderId ? ` for order #${data.orderId}` : ''}.</p>
                    <p>Please allow 5-10 business days for the refund to appear on your statement.</p>
                </div>
            `)

        case 'low_stock_alert':
            return wrap(`
                <div class="header"><h1>📉 ${data.heading || 'Low Stock Alert'}</h1></div>
                <div class="content">
                    <p>The following product is ${data.outOfStock ? '<strong>OUT OF STOCK</strong>' : 'running low'}:</p>
                    <div class="detail-row"><span>Product</span><span>${data.title || 'Unknown'}</span></div>
                    ${data.sku ? `<div class="detail-row"><span>SKU</span><span>${data.sku}</span></div>` : ''}
                    <div class="detail-row"><span>Available Stock</span><span><strong>${data.availableStock ?? 0}</strong></span></div>
                    <p>Consider restocking this item to avoid missed sales.</p>
                </div>
            `)

        case 'order_cancelled':
            return wrap(`
                <div class="header"><h1>❌ ${data.heading || 'Order Cancelled'}</h1></div>
                <div class="content">
                    <p>${data.greeting || `Hi ${data.customerName || 'there'},`}</p>
                    <p>Your order #${data.orderId || ''} has been cancelled.</p>
                    ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
                    <p>If you have any questions, please contact us.</p>
                </div>
            `)

        case 'welcome':
            return wrap(`
                <div class="header"><h1>👋 ${data.heading || 'Welcome!'}</h1></div>
                <div class="content">
                    <p>${data.message || `Welcome to ${data.storeName || 'our store'}!`}</p>
                    ${data.storeUrl ? `<p><a href="${data.storeUrl}" class="btn">Start Shopping</a></p>` : ''}
                </div>
            `)

        default:
            return wrap(`
                <div class="header"><h1>${payload.subject}</h1></div>
                <div class="content"><p>${JSON.stringify(data)}</p></div>
            `)
    }
}

// ---------------------------------------------------------------------------
// Provider Factory
// ---------------------------------------------------------------------------

let _defaultProvider: EmailProvider | null = null
const _tenantProviders = new Map<string, { provider: EmailProvider; from: string; expiresAt: number }>()

/** TTL for cached tenant providers (5 minutes) */
const TENANT_PROVIDER_TTL_MS = 5 * 60 * 1000

function getDefaultProvider(): EmailProvider {
    if (_defaultProvider) return _defaultProvider

    const providerName = process.env.EMAIL_PROVIDER || 'console'
    const apiKey = process.env.EMAIL_API_KEY || ''

    switch (providerName) {
        case 'resend':
            if (!apiKey) throw new Error('EMAIL_API_KEY required for Resend provider')
            _defaultProvider = createResendProvider(apiKey)
            break
        case 'sendgrid':
            if (!apiKey) throw new Error('EMAIL_API_KEY required for SendGrid provider')
            _defaultProvider = createSendGridProvider(apiKey)
            break
        case 'console':
        default:
            _defaultProvider = consoleProvider
            break
    }

    return _defaultProvider
}

function createProviderFromConfig(provider: string, apiKey: string): EmailProvider {
    switch (provider) {
        case 'resend':
            return createResendProvider(apiKey)
        case 'sendgrid':
            return createSendGridProvider(apiKey)
        case 'console':
        default:
            return consoleProvider
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a transactional email using default env-based config.
 * For tenant-specific emails, use `sendEmailForTenant()` instead.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
    try {
        const provider = getDefaultProvider()
        return await provider.send(payload)
    } catch (e) {
        console.error('[EMAIL] Failed to send:', e)
        return { success: false, error: e instanceof Error ? e.message : 'Unknown email error' }
    }
}

/**
 * Send a transactional email using per-tenant config from the DB.
 *
 * Reads `email_provider`, `email_api_key`, `email_from` from the tenant's
 * config table. Falls back to console provider if not configured.
 *
 * Provider instances are cached per-tenant with a 5-minute TTL.
 */
export async function sendEmailForTenant(
    tenantId: string,
    payload: EmailPayload
): Promise<EmailResult> {
    try {
        // Check cache
        const cached = _tenantProviders.get(tenantId)
        if (cached && Date.now() < cached.expiresAt) {
            // Use cached provider, inject tenant's from address
            return await cached.provider.send(payload)
        }

        // Load tenant config from DB (dynamic import to avoid circular deps)
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()

        // NOTE: email_ columns added by migration 20260301_email_marketing_module.sql
        // Type assertion needed until supabase:types is regenerated
        const { data: rawConfig } = await supabase
            .from('config')
            .select('*')
            .eq('tenant_id', tenantId)
            .single()

        const config = rawConfig as { email_provider?: string; email_api_key?: string; email_from?: string } | null

        if (!config?.email_provider || !config?.email_api_key) {
            console.log(`[EMAIL] Tenant ${tenantId}: no provider configured, using console`)
            return await consoleProvider.send(payload)
        }

        // Create provider and cache it
        const provider = createProviderFromConfig(config.email_provider, config.email_api_key)
        const from = config.email_from || 'Store <noreply@example.com>'

        _tenantProviders.set(tenantId, {
            provider,
            from,
            expiresAt: Date.now() + TENANT_PROVIDER_TTL_MS,
        })

        return await provider.send(payload)
    } catch (e) {
        console.error(`[EMAIL] Tenant ${tenantId} send failed:`, e)
        return { success: false, error: e instanceof Error ? e.message : 'Unknown email error' }
    }
}

/**
 * Get the current email provider name.
 * Useful for health checks and diagnostics.
 */
export function getEmailProviderName(): string {
    return getDefaultProvider().name
}

/**
 * Clear cached provider for a tenant (call after config change).
 */
export function invalidateTenantEmailProvider(tenantId: string): void {
    _tenantProviders.delete(tenantId)
}

