import { createAdminClient } from '@/lib/supabase/admin'

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

/**
 * Resolves Medusa scope for a tenant.
 * Returns null if the table doesn't exist or no mapping is found
 * — callers should degrade gracefully (show empty state, not crash).
 */
export async function getTenantMedusaScope(tenantId: string): Promise<TenantMedusaScope | null> {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase
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

