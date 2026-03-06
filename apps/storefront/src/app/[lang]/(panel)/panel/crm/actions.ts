'use server'

/**
 * CRM Server Actions — Owner Panel
 *
 * B3 fix: Export CSV was showing "Coming Soon" even when flag enabled.
 * Now implements functional CSV export with proper panel guard.
 *
 * Zone: 🟡 EXTEND
 */

import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getAdminCustomers } from '@/lib/medusa/admin'

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

export async function exportCrmCsv(): Promise<{ csv: string; filename: string; error?: string }> {
    const { tenantId, appConfig } = await withPanelGuard({
        requiredFlag: 'enable_crm_export',
    })

    const scope = await getTenantMedusaScope(tenantId)

    // Fetch all customers (batch in pages of 100)
    const allCustomers: {
        email: string
        first_name: string
        last_name: string
        order_count: number
        created_at: string
    }[] = []

    let offset = 0
    const batchSize = 100
    let hasMore = true

    while (hasMore) {
        const { customers, count } = await getAdminCustomers(
            { limit: batchSize, offset },
            scope
        )
        for (const c of customers) {
            allCustomers.push({
                email: c.email,
                first_name: c.first_name ?? '',
                last_name: c.last_name ?? '',
                order_count: c.orders?.length ?? 0,
                created_at: c.created_at ?? '',
            })
        }
        offset += batchSize
        hasMore = offset < count
    }

    // Generate CSV
    const header = 'email,first_name,last_name,order_count,created_at'
    const rows = allCustomers.map(c =>
        [c.email, c.first_name, c.last_name, c.order_count, c.created_at]
            .map(v => `"${String(v).replace(/"/g, '""')}"`)
            .join(',')
    )
    const csv = [header, ...rows].join('\n')

    const storeName = appConfig.config.business_name || 'store'
    const date = new Date().toISOString().split('T')[0]
    const filename = `crm-export-${storeName.toLowerCase().replace(/\s+/g, '-')}-${date}.csv`

    return { csv, filename }
}
