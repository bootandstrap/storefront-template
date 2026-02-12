/**
 * Supabase Admin Client — Server-Only
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS for governance table reads
 * (config, feature_flags, plan_limits). This client is stateless — no cookies,
 * no user session. For user-authenticated operations, use `server.ts` instead.
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
 * Returns a Supabase client with service_role privileges.
 * Singleton — reused across requests in the same process.
 */
export function createAdminClient() {
    if (globalForAdmin.__supabaseAdminClient) return globalForAdmin.__supabaseAdminClient

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        throw new Error(
            '[admin-client] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
        )
    }

    globalForAdmin.__supabaseAdminClient = createSupabaseClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    return globalForAdmin.__supabaseAdminClient
}
