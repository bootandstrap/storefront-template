/**
 * Shared utilities for Medusa subscribers.
 *
 * DRY extraction of duplicated patterns across:
 * - order-placed.ts
 * - order-shipped.ts
 * - low-stock-alert.ts
 *
 * These functions bridge Medusa → Storefront communication
 * and analytics event logging.
 */

// ---------------------------------------------------------------------------
// Storefront Bridge
// ---------------------------------------------------------------------------

const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:3000"
const MEDUSA_EVENTS_SECRET = process.env.MEDUSA_EVENTS_SECRET || ""

/**
 * POST event data to the storefront's internal webhook endpoint.
 * The storefront has access to tenant email config (Resend/SendGrid/Console)
 * and dispatches emails accordingly.
 *
 * Non-blocking — errors are logged but never thrown.
 */
export async function notifyStorefront(
    eventType: string,
    data: Record<string, unknown>,
    callerTag = "subscriber"
): Promise<boolean> {
    try {
        const res = await fetch(`${STOREFRONT_URL}/api/webhooks/medusa-events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(MEDUSA_EVENTS_SECRET && {
                    "x-medusa-events-secret": MEDUSA_EVENTS_SECRET,
                }),
            },
            body: JSON.stringify({ event_type: eventType, data }),
            signal: AbortSignal.timeout(10000),
        })

        if (!res.ok) {
            console.warn(
                `[${callerTag}] Storefront notification failed: HTTP ${res.status}`
            )
            return false
        }
        return true
    } catch (err) {
        console.warn(
            `[${callerTag}] Storefront notification error: ${err instanceof Error ? err.message : String(err)
            }`
        )
        return false
    }
}

// ---------------------------------------------------------------------------
// Analytics Event Logger
// ---------------------------------------------------------------------------

/**
 * Fire-and-forget analytics event to Supabase.
 * Uses raw REST API to avoid dependency on generated Supabase types.
 *
 * Non-blocking — errors are silently swallowed.
 */
export async function logAnalyticsEvent(
    eventType: string,
    properties: Record<string, unknown>
): Promise<void> {
    try {
        const supabaseUrl =
            process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseKey) return

        await fetch(`${supabaseUrl}/rest/v1/analytics_events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                Prefer: "return=minimal",
            },
            body: JSON.stringify({
                event_type: eventType,
                properties: { ...properties, source: "medusa_subscriber" },
                tenant_id: process.env.TENANT_ID || null,
            }),
            signal: AbortSignal.timeout(5000),
        })
    } catch {
        // Silent fail — analytics must never block business logic
    }
}
