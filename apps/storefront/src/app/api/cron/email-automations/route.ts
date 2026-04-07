/**
 * Email Automations Cron Endpoint
 *
 * Triggered periodically by BSWEB job queue (job type: email_automations).
 * Processes abandoned cart recovery emails and post-purchase review requests.
 *
 * Security: Protected by CRON_SECRET bearer token.
 * Respects: Feature flags (enable_abandoned_cart_emails, enable_email_campaigns)
 *           + Plan limits (max_email_sends_month)
 *
 * Zone: 🔴 LOCKED — Platform infrastructure
 */

import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { processAbandonedCarts, processReviewRequests, DEFAULT_AUTOMATION_CONFIG } from '@/lib/email-automations'
import type { AutomationConfig, AbandonedCart, DeliveredOrder } from '@/lib/email-automations-shared'

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function isAuthorized(request: Request): boolean {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return false
    const token = authHeader.slice(7)
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) return false
    return token === cronSecret
}

// ---------------------------------------------------------------------------
// Data fetchers (Medusa Store/Admin API)
// ---------------------------------------------------------------------------

const MEDUSA_URL = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const MEDUSA_API_KEY = process.env.MEDUSA_ADMIN_API_KEY || ''

/**
 * Fetch carts abandoned for longer than the configured delay.
 * Uses Medusa Admin API to get carts without completed_at.
 */
async function fetchAbandonedCarts(delayHours: number, defaultCurrency: string): Promise<AbandonedCart[]> {
    try {
        const cutoff = new Date(Date.now() - delayHours * 60 * 60 * 1000).toISOString()
        const res = await fetch(
            `${MEDUSA_URL}/admin/carts?created_at[lt]=${cutoff}&limit=50`,
            {
                headers: {
                    'x-medusa-access-token': MEDUSA_API_KEY,
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(15000),
            }
        )

        if (!res.ok) {
            // Medusa v2 removed /admin/carts — 404 is expected
            if (res.status === 404) {
                console.warn('[email-automations] /admin/carts not available in Medusa v2. Abandoned cart emails skipped.')
            } else {
                console.warn(`[email-automations] Failed to fetch abandoned carts: HTTP ${res.status}`)
            }
            return []
        }

        const data = await res.json()
        const carts = data.carts || []

        // Filter: must have email, must NOT have completed_at
        return carts
            .filter((c: Record<string, unknown>) => c.email && !c.completed_at)
            .map((c: Record<string, unknown>) => ({
                cart_id: c.id as string,
                customer_email: c.email as string,
                customer_name: (c.customer as Record<string, unknown>)?.first_name as string || 'Customer',
                items: ((c.items as Array<Record<string, unknown>>) || []).map(i => ({
                    title: i.title as string || 'Item',
                    quantity: i.quantity as number || 1,
                    price: String(((i.unit_price as number) || 0) / 100),
                })),
                total: String(((c.total as number) || 0) / 100),
                currency: (c.region as Record<string, unknown>)?.currency_code as string || defaultCurrency,
                abandoned_at: new Date(c.created_at as string),
            }))
    } catch (err) {
        console.error('[email-automations] Error fetching abandoned carts:', err)
        return []
    }
}

/**
 * Fetch orders that were delivered but haven't received a review request yet.
 * Uses Medusa Admin API.
 */
async function fetchDeliveredOrders(delayDays: number): Promise<DeliveredOrder[]> {
    try {
        const cutoff = new Date(Date.now() - delayDays * 24 * 60 * 60 * 1000).toISOString()
        const res = await fetch(
            `${MEDUSA_URL}/admin/orders?fulfillment_status=shipped&created_at[lt]=${cutoff}&limit=50`,
            {
                headers: {
                    'x-medusa-access-token': MEDUSA_API_KEY,
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(15000),
            }
        )

        if (!res.ok) {
            console.warn(`[email-automations] Failed to fetch delivered orders: HTTP ${res.status}`)
            return []
        }

        const data = await res.json()
        const orders = data.orders || []

        return orders
            .filter((o: Record<string, unknown>) => o.email)
            .map((o: Record<string, unknown>) => ({
                order_id: o.id as string,
                display_id: String(o.display_id),
                customer_email: o.email as string,
                customer_name: (o.customer as Record<string, unknown>)?.first_name as string || 'Customer',
                delivered_at: new Date(o.updated_at as string),
                items: ((o.items as Array<Record<string, unknown>>) || []).map(i => ({
                    title: i.title as string || 'Item',
                })),
            }))
    } catch (err) {
        console.error('[email-automations] Error fetching delivered orders:', err)
        return []
    }
}

/**
 * Get current month's email send count from Supabase analytics.
 */
async function getMonthlyEmailCount(): Promise<number> {
    try {
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { count } = await supabase
            .from('analytics_events')
            .select('*', { count: 'exact', head: true })
            .eq('event_type', 'email_sent')
            .gte('created_at', startOfMonth.toISOString())

        return count ?? 0
    } catch {
        return 0
    }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // 1. Load tenant config (includes feature flags + limits)
        const appConfig = await getConfig()

        if (!appConfig) {
            return NextResponse.json({ error: 'Config unavailable' }, { status: 503 })
        }

        // 2. Check if email automations are enabled at all
        const abandonedCartEnabled = appConfig.featureFlags.enable_abandoned_cart_emails === true
        const reviewRequestEnabled = appConfig.featureFlags.enable_email_campaigns === true

        if (!abandonedCartEnabled && !reviewRequestEnabled) {
            return NextResponse.json({
                status: 'skipped',
                reason: 'No email automations enabled',
                abandoned_carts: { sent: 0, skipped: 0, errors: [] },
                review_requests: { sent: 0, skipped: 0, errors: [] },
            })
        }

        // 3. Get automation config (from config or defaults)
        const automationConfig: AutomationConfig = {
            abandoned_cart_enabled: abandonedCartEnabled,
            abandoned_cart_delay_hours: DEFAULT_AUTOMATION_CONFIG.abandoned_cart_delay_hours,
            review_request_enabled: reviewRequestEnabled,
            review_request_delay_days: DEFAULT_AUTOMATION_CONFIG.review_request_delay_days,
        }

        // 4. Get monthly email count for limit enforcement
        const monthlyCount = await getMonthlyEmailCount()
        const monthlyLimit = appConfig.planLimits.max_email_sends_month ?? 1000

        // 5. Fetch data and process
        const tenantId = appConfig.config.tenant_id || ''
        const [abandonedCarts, deliveredOrders] = await Promise.all([
            abandonedCartEnabled
                ? fetchAbandonedCarts(automationConfig.abandoned_cart_delay_hours, appConfig.config.default_currency)
                : Promise.resolve([]),
            reviewRequestEnabled
                ? fetchDeliveredOrders(automationConfig.review_request_delay_days)
                : Promise.resolve([]),
        ])

        const [cartResult, reviewResult] = await Promise.all([
            processAbandonedCarts(
                tenantId,
                automationConfig,
                abandonedCarts,
                abandonedCartEnabled,
                monthlyCount,
                monthlyLimit
            ),
            processReviewRequests(
                tenantId,
                automationConfig,
                deliveredOrders,
                reviewRequestEnabled,
                monthlyCount + (abandonedCarts.length), // Account for carts processed first
                monthlyLimit
            ),
        ])

        return NextResponse.json({
            status: 'processed',
            abandoned_carts: cartResult,
            review_requests: reviewResult,
            monthly_email_count: monthlyCount,
            monthly_email_limit: monthlyLimit,
        })
    } catch (err) {
        console.error('[email-automations] Cron endpoint error:', err)
        return NextResponse.json(
            { error: 'Internal error', details: err instanceof Error ? err.message : 'Unknown' },
            { status: 500 }
        )
    }
}
