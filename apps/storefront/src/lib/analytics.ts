import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Analytics event tracker — inserts into analytics_events table
// Gated by enable_analytics feature flag (checked at call site)
// ---------------------------------------------------------------------------

type EventType =
    | 'page_view'
    | 'product_view'
    | 'add_to_cart'
    | 'remove_from_cart'
    | 'checkout_start'
    | 'checkout_complete'
    | 'search'

interface EventMetadata {
    path?: string
    product_id?: string
    product_title?: string
    search_query?: string
    cart_value?: number
    [key: string]: unknown
}

/**
 * Track an analytics event.
 * Uses browser Supabase client — call from client components only.
 */
export async function trackEvent(
    eventType: EventType,
    metadata: EventMetadata = {}
): Promise<void> {
    try {
        const supabase = createClient()

        // Get current user (optional — anonymous events are allowed)
        const { data: { user } } = await supabase.auth.getUser()

        await supabase.from('analytics_events').insert({
            event_type: eventType,
            user_id: user?.id ?? null,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
                user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                referrer: typeof document !== 'undefined' ? document.referrer : null,
            },
        })
    } catch (err) {
        // Silent fail — analytics should never break UX
        console.warn('[analytics] Event tracking failed:', err)
    }
}
