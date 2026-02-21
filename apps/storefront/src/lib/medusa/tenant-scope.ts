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

export async function getTenantMedusaScope(tenantId: string): Promise<TenantMedusaScope> {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('tenant_medusa_scope')
        .select('tenant_id, medusa_sales_channel_id')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (error) {
        throw new Error(`TENANT_SCOPE_UNRESOLVED: Failed to resolve Medusa scope for tenant ${tenantId}: ${error.message}`)
    }

    if (!data) {
        throw new Error(`TENANT_SCOPE_UNRESOLVED: No scope mapping found for tenant ${tenantId}. Create a row in tenant_medusa_scope.`)
    }

    return assertTenantMedusaScopeRow(tenantId, data as TenantMedusaScopeRow)
}
