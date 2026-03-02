/**
 * Email Automations Engine (Server-only)
 *
 * Cron-triggered automations for email marketing module:
 * - Abandoned cart recovery
 * - Post-purchase review requests
 *
 * Each automation respects:
 * - Feature flags (enable_abandoned_cart_emails, etc.)
 * - Plan limits (max_email_sends_month)
 * - Tenant-specific config (email_automation_config table)
 *
 * Zone: 🟡 EXTEND — new functionality, uses locked lib/ APIs
 */

import { sendEmail } from './email'

// Re-export shared types and constants for backward compatibility
export {
    type AutomationConfig,
    type AbandonedCart,
    type DeliveredOrder,
    DEFAULT_AUTOMATION_CONFIG,
    ABANDONED_CART_DELAY_OPTIONS,
    REVIEW_REQUEST_DELAY_OPTIONS,
} from './email-automations-shared'

import type { AutomationConfig, AbandonedCart, DeliveredOrder } from './email-automations-shared'

// ---------------------------------------------------------------------------
// Abandoned Cart — Recovery Logic
// ---------------------------------------------------------------------------

/**
 * Check for abandoned carts and send recovery emails.
 * Called by cron job processor.
 *
 * @param tenantId - Tenant ID
 * @param config - Automation config from DB
 * @param carts - Carts abandoned longer than delay threshold
 * @param featureEnabled - Whether enable_abandoned_cart_emails flag is on
 * @param monthlyCount - Emails already sent this month
 * @param monthlyLimit - max_email_sends_month plan limit
 */
export async function processAbandonedCarts(
    tenantId: string,
    config: AutomationConfig,
    carts: AbandonedCart[],
    featureEnabled: boolean,
    monthlyCount: number,
    monthlyLimit: number,
): Promise<{ sent: number; skipped: number; errors: string[] }> {
    if (!featureEnabled || !config.abandoned_cart_enabled) {
        return { sent: 0, skipped: carts.length, errors: [] }
    }

    const remaining = monthlyLimit - monthlyCount
    if (remaining <= 0) {
        return { sent: 0, skipped: carts.length, errors: ['Monthly email limit reached'] }
    }

    let sent = 0
    let skipped = 0
    const errors: string[] = []
    const toProcess = carts.slice(0, remaining) // Respect limit

    for (const cart of toProcess) {
        const hoursSinceAbandonment = (Date.now() - cart.abandoned_at.getTime()) / (1000 * 60 * 60)
        if (hoursSinceAbandonment < config.abandoned_cart_delay_hours) {
            skipped++
            continue
        }

        try {
            await sendEmail({
                to: cart.customer_email,
                subject: `You left items in your cart`,
                template: 'abandoned_cart',
                data: {
                    customerName: cart.customer_name,
                    items: cart.items,
                    total: cart.total,
                    currency: cart.currency,
                    recoveryUrl: '#', // Will be injected by caller with tenant domain
                },
            })
            sent++
        } catch (err) {
            errors.push(`Cart ${cart.cart_id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
    }

    skipped += carts.length - toProcess.length // Count limit-exceeded carts
    return { sent, skipped, errors }
}

// ---------------------------------------------------------------------------
// Review Request — Post-Purchase
// ---------------------------------------------------------------------------

/**
 * Send review request emails for delivered orders.
 * Called by cron job processor.
 */
export async function processReviewRequests(
    tenantId: string,
    config: AutomationConfig,
    orders: DeliveredOrder[],
    featureEnabled: boolean,
    monthlyCount: number,
    monthlyLimit: number,
): Promise<{ sent: number; skipped: number; errors: string[] }> {
    if (!featureEnabled || !config.review_request_enabled) {
        return { sent: 0, skipped: orders.length, errors: [] }
    }

    const remaining = monthlyLimit - monthlyCount
    if (remaining <= 0) {
        return { sent: 0, skipped: orders.length, errors: ['Monthly email limit reached'] }
    }

    let sent = 0
    let skipped = 0
    const errors: string[] = []
    const toProcess = orders.slice(0, remaining)

    for (const order of toProcess) {
        const daysSinceDelivery = (Date.now() - order.delivered_at.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceDelivery < config.review_request_delay_days) {
            skipped++
            continue
        }

        try {
            await sendEmail({
                to: order.customer_email,
                subject: `How was your order #${order.display_id}?`,
                template: 'review_request',
                data: {
                    customerName: order.customer_name,
                    orderId: order.display_id,
                    products: order.items.map(i => i.title),
                    reviewUrl: '#', // Will be injected by caller
                },
            })
            sent++
        } catch (err) {
            errors.push(`Order ${order.order_id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
    }

    skipped += orders.length - toProcess.length
    return { sent, skipped, errors }
}
