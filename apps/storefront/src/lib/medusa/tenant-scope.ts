/**
 * Tenant → Medusa Scope Mapping
 *
 * Resolves a tenant's Medusa sales channel ID from the `tenant_medusa_scope`
 * table in the governance Supabase. This table has strict RLS (USING false for
 * anon/authenticated), so we use the GOVERNANCE_SUPABASE_SERVICE_KEY to bypass
 * RLS. This is server-only (import 'server-only' enforced).
 *
 * Why service_role here (but not elsewhere)?
 * The March 2026 audit removed service_role from general storefront use. However,
 * `tenant_medusa_scope` was created with `USING (false)` RLS intentionally (it's
 * infra-level data). The GOVERNANCE_SUPABASE_SERVICE_KEY is the correct credential
 * for this specific, server-only, read-only infra query.
 */
import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export interface TenantMedusaScope {
    tenantId: string
    medusaSalesChannelId: string
}

interface TenantMedusaScopeRow {
    tenant_id: string | null
    medusa_sales_channel_id: string | null
}

export function assertTenantMedusaScopeRow(
    tenantId: string,
    row: TenantMedusaScopeRow | null
): TenantMedusaScope {
    if (!row) {
        throw new Error(`Missing Medusa tenant scope mapping for tenant ${tenantId}`)
    }

    if (row.tenant_id !== tenantId) {
        throw new Error('Tenant scope mismatch')
    }

    const medusaSalesChannelId = row.medusa_sales_channel_id?.trim() ?? ''
    if (!medusaSalesChannelId) {
        throw new Error('Invalid Medusa sales channel mapping')
    }

    return {
        tenantId,
        medusaSalesChannelId,
    }
}

// ---------------------------------------------------------------------------
// Service-role client — singleton for this specific infra query
// ---------------------------------------------------------------------------

const gScope = globalThis as unknown as {
    __scopeClient?: ReturnType<typeof createSupabaseClient>
}

function getScopeClient() {
    if (gScope.__scopeClient) return gScope.__scopeClient

    const url = process.env.GOVERNANCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.GOVERNANCE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        console.error(
            '[tenant-scope] GOVERNANCE_SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) is required for tenant_medusa_scope access. ' +
            'This table has RLS USING(false) — anon key cannot read it.'
        )
        return null
    }

    gScope.__scopeClient = createSupabaseClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })

    return gScope.__scopeClient
}

/**
 * Resolves Medusa scope for a tenant.
 * Returns null if the table doesn't exist or no mapping is found
 * — callers should degrade gracefully (show empty state, not crash).
 */
export async function getTenantMedusaScope(tenantId: string): Promise<TenantMedusaScope | null> {
    try {
        const client = getScopeClient()
        if (!client) {
            console.warn(`[tenant-scope] No service-role client available — cannot resolve scope for tenant ${tenantId}`)
            return null
        }

        const { data, error } = await client
            .from('tenant_medusa_scope')
            .select('tenant_id, medusa_sales_channel_id')
            .eq('tenant_id', tenantId)
            .maybeSingle()

        if (error) {
            console.warn(`[tenant-scope] Failed to resolve Medusa scope for tenant ${tenantId}: ${error.message}`)
            return null
        }

        if (!data) {
            console.warn(`[tenant-scope] No scope mapping found for tenant ${tenantId}`)
            return null
        }

        return assertTenantMedusaScopeRow(tenantId, data as TenantMedusaScopeRow)
    } catch (e) {
        console.warn(`[tenant-scope] Error resolving scope:`, e)
        return null
    }
}
