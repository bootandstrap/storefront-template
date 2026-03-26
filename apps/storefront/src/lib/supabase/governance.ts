/**
 * Supabase Governance Client — Server-Only
 *
 * Connects to the CENTRAL BootandStrap Supabase (governance hub).
 * Reads config, feature_flags, plan_limits, and tenants from the hub.
 *
 * Phase 4.1 Credential Isolation:
 * - PRIMARY: Uses anon key + SECURITY DEFINER RPCs (no service_role needed)
 * - FALLBACK: Uses service_role key for direct table access (legacy path)
 *
 * This is separate from admin.ts which connects to the per-tenant Supabase.
 * Uses globalThis singleton to survive Turbopack module re-evaluation.
 *
 * NEVER import in client components.
 */
import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { GovernanceDatabase } from './governance-types'

const globalForGovernance = globalThis as unknown as {
    __supabaseGovernanceClient?: ReturnType<typeof createSupabaseClient<GovernanceDatabase>>
    __governanceMode?: 'rpc' | 'direct'
}

/**
 * Returns the governance client mode:
 * - 'rpc': Uses anon key + SECURITY DEFINER RPCs (preferred, no service_role needed)
 * - 'direct': Uses service_role key for direct table access (legacy fallback)
 */
export function getGovernanceMode(): 'rpc' | 'direct' {
    return globalForGovernance.__governanceMode ?? 'rpc'
}

/**
 * Returns a Supabase client connected to the central governance hub.
 *
 * Phase 4.1: Prefers anon key (RPC mode) over service_role key (direct mode).
 * If only anon key is available, client can only use RPCs (get_tenant_governance, log_tenant_error).
 * If service_role key is available, client has full table access (legacy).
 */
export function createGovernanceClient() {
    if (globalForGovernance.__supabaseGovernanceClient) {
        return globalForGovernance.__supabaseGovernanceClient
    }

    const url = process.env.GOVERNANCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL

    // Phase 4.1: Prefer governance-specific anon key, fall back to common anon key
    const anonKey = process.env.GOVERNANCE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!anonKey || !url) {
        throw new Error(
            '[governance-client] GOVERNANCE_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) ' +
            'and NEXT_PUBLIC_SUPABASE_URL are required. ' +
            'SUPABASE_SERVICE_ROLE_KEY is no longer accepted (removed 2026-03-26, see audit §C-1).'
        )
    }

    const key = anonKey
    globalForGovernance.__governanceMode = 'rpc'

    globalForGovernance.__supabaseGovernanceClient = createSupabaseClient<GovernanceDatabase>(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    return globalForGovernance.__supabaseGovernanceClient
}
