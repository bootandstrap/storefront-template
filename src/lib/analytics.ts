/**
 * Analytics event tracker — client-side
 *
 * Gated by enable_analytics feature flag.
 * Sends events to /api/analytics (server-side proxy) instead of direct
 * Supabase inserts. The server injects tenant_id and validates payloads.
 *
 * Usage (in Client Components):
 *   import { trackEvent } from '@/lib/analytics'
 *   trackEvent('product_view', { product_id: '...' })
 */

type AnalyticsEvent =
    | 'page_view'
    | 'product_view'
    | 'add_to_cart'
    | 'remove_from_cart'
    | 'checkout_start'
    | 'order_placed'
    | 'search'
    | 'category_view'
    | 'whatsapp_click'

let _analyticsEnabled: boolean | null = null

/**
 * Track an analytics event. No-op if analytics flag is disabled.
 * Fails silently to never block UI.
 */
export async function trackEvent(
    event: AnalyticsEvent,
    properties: Record<string, unknown> = {},
    analyticsEnabled?: boolean
) {
    // Allow explicit override, otherwise use cached value
    if (analyticsEnabled !== undefined) {
        _analyticsEnabled = analyticsEnabled
    }

    // Skip if analytics is disabled or we don't know yet
    if (_analyticsEnabled === false) return

    try {
        await fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_type: event,
                properties,
                page_url: typeof window !== 'undefined' ? window.location.pathname : null,
                referrer: typeof document !== 'undefined' ? document.referrer || null : null,
            }),
            // Fire-and-forget: don't wait for response
            keepalive: true,
        })
    } catch {
        // Silent fail — never block UI for analytics
    }
}

/**
 * Set whether analytics is enabled (called once from layout/provider).
 */
export function setAnalyticsEnabled(enabled: boolean) {
    _analyticsEnabled = enabled
}
