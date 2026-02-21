/**
 * Supabase Governance Client — Server-Only
 *
 * Connects to the CENTRAL BootandStrap Supabase (governance hub).
 * Reads config, feature_flags, plan_limits, and tenants from the hub.
 *
 * This is separate from admin.ts which connects to the per-tenant Supabase.
 * If GOVERNANCE_SUPABASE_URL is not set, falls back to the tenant's own
 * Supabase connection (backward-compatible for development / single-tenant).
 *
 * Uses service_role to bypass RLS. NEVER import in client components.
 *
 * Uses globalThis singleton to survive Turbopack module re-evaluation.
 */
import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const globalForGovernance = globalThis as unknown as {
    __supabaseGovernanceClient?: ReturnType<typeof createSupabaseClient>
}

/**
 * Returns a Supabase client connected to the central governance hub.
 * Falls back to the tenant's own Supabase if GOVERNANCE_SUPABASE_URL is not set.
 */
export function createGovernanceClient() {
    if (globalForGovernance.__supabaseGovernanceClient) {
        return globalForGovernance.__supabaseGovernanceClient
    }

    // Prefer dedicated governance env vars; fall back to tenant's own Supabase
    const url = process.env.GOVERNANCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.GOVERNANCE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        throw new Error(
            '[governance-client] GOVERNANCE_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and ' +
            'GOVERNANCE_SUPABASE_SERVICE_KEY/SUPABASE_SERVICE_ROLE_KEY are required'
        )
    }

    globalForGovernance.__supabaseGovernanceClient = createSupabaseClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    return globalForGovernance.__supabaseGovernanceClient
}
