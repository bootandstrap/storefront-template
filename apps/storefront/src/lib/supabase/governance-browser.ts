/**
 * Governance Browser Client — Client-Side Supabase for Realtime Only
 *
 * Creates a lightweight Supabase client in the browser to subscribe
 * to governance Realtime broadcast channels. This client is ONLY used
 * for Realtime subscriptions — all data fetching still goes through
 * the server-side governance client via RPCs.
 *
 * Safe to expose: uses anon key (public), all governance data is
 * protected by SECURITY DEFINER RPCs and RLS.
 *
 * The governance Supabase is the same project as the main Supabase
 * (odvzsqossriyyscduzfg), so we reuse NEXT_PUBLIC_SUPABASE_* env vars.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

let governanceBrowserClient: SupabaseClient | null = null

/**
 * Returns a browser-side Supabase client for governance Realtime subscriptions.
 * Returns null if env vars are not configured (graceful degradation).
 */
export function getGovernanceBrowserClient(): SupabaseClient | null {
    if (governanceBrowserClient) return governanceBrowserClient

    // Prefer dedicated governance vars, fall back to main Supabase vars
    const url =
        process.env.NEXT_PUBLIC_GOVERNANCE_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL
    const key =
        process.env.NEXT_PUBLIC_GOVERNANCE_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        logger.warn('[governance-browser] Missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY — realtime disabled')
        return null
    }

    governanceBrowserClient = createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        realtime: {
            params: {
                eventsPerSecond: 2, // Rate limit to prevent flooding
            },
        },
    })

    return governanceBrowserClient
}
