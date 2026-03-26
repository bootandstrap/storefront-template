/**
 * Supabase Admin Client — Server-Only
 *
 * Uses anon key for governance table reads (config, feature_flags, plan_limits).
 * All governance tables are accessible via RLS policies or SECURITY DEFINER RPCs.
 *
 * ⚠️  Security (2026-03-26): SUPABASE_SERVICE_ROLE_KEY has been permanently
 *    removed from storefront environments. This client uses anon key only.
 *    See: system_audit_2026_03_26.md §C-1
 *
 * This client is stateless — no cookies, no user session.
 * For user-authenticated operations, use `server.ts` instead.
 *
 * NEVER import this file in client components.
 *
 * Uses globalThis singleton to survive Turbopack module re-evaluation in dev
 * mode (same pattern as config.ts, Prisma, etc.).
 */
import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const globalForAdmin = globalThis as unknown as {
    __supabaseAdminClient?: ReturnType<typeof createSupabaseClient>
}

/**
 * Returns a Supabase client with anon key privileges.
 * All governance reads go through RLS or SECURITY DEFINER RPCs.
 * Singleton — reused across requests in the same process.
 */
export function createAdminClient() {
    if (globalForAdmin.__supabaseAdminClient) return globalForAdmin.__supabaseAdminClient

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.GOVERNANCE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
        throw new Error(
            '[admin-client] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or GOVERNANCE_SUPABASE_ANON_KEY) are required'
        )
    }

    globalForAdmin.__supabaseAdminClient = createSupabaseClient(url, anonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    return globalForAdmin.__supabaseAdminClient
}
