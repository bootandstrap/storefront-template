/**
 * Analytics event tracker — client-side
 *
 * Gated by enable_analytics feature flag.
 * Inserts events to analytics_events table via Supabase anon client.
 *
 * Usage (in Client Components):
 *   import { trackEvent } from '@/lib/analytics'
 *   trackEvent('product_view', { product_id: '...' })
 */

import { createBrowserClient } from '@supabase/ssr'

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
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        await supabase.from('analytics_events').insert({
            event_type: event,
            properties,
            page_url: typeof window !== 'undefined' ? window.location.pathname : null,
            referrer: typeof document !== 'undefined' ? document.referrer || null : null,
            tenant_id: process.env.NEXT_PUBLIC_TENANT_ID || null,
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
