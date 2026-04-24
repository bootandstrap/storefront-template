/**
 * Server-side analytics event emitter
 *
 * Inserts analytics events directly via service-role client.
 * Used by server actions and webhooks where the client-side
 * trackEvent() is not available.
 *
 * Non-blocking: errors are logged but never thrown.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

type ServerAnalyticsEvent =
    | 'order_placed'
    | 'checkout_complete'
    | 'checkout_start'
    | 'add_to_cart'

export async function emitServerEvent(
    event: ServerAnalyticsEvent,
    properties: Record<string, unknown> = {}
): Promise<void> {
    try {
        const tenantId = process.env.TENANT_ID
        if (!tenantId) return

        const supabase = createAdminClient()
        await supabase.from('analytics_events').insert({
            event_type: event,
            properties: {
                ...properties,
                source: 'server',
            },
            tenant_id: tenantId,
        } as never)
    } catch (err) {
        // Non-blocking — never fail a business flow for analytics
        logger.error('[analytics-server] emit failed:', err)
    }
}
