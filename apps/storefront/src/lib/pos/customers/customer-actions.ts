/**
 * POS Customer Actions
 *
 * Server actions for customer management at the POS terminal.
 * Pro tier feature (gated by enable_pos_history).
 */
'use server'

import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getAdminCustomers } from '@/lib/medusa/admin-orders'
import type { POSCustomerResult } from '@/lib/pos/pos-config'

// ---------------------------------------------------------------------------
// Search customers
// ---------------------------------------------------------------------------

export async function searchPOSCustomersAction(
    query: string
): Promise<{ customers: POSCustomerResult[]; error?: string }> {
    try {
        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_pos_shifts' })

        if (!query || query.trim().length < 2) {
            return { customers: [], error: 'Query too short (min 2 chars)' }
        }

        const scope = await getTenantMedusaScope(tenantId)
        const { customers } = await getAdminCustomers({
            limit: 10,
            q: query.trim(),
        }, scope)

        const mapped: POSCustomerResult[] = customers.map(c => ({
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email,
            phone: c.phone,
            orders_count: c.orders?.length ?? 0,
        }))

        return { customers: mapped }
    } catch (err) {
        return {
            customers: [],
            error: err instanceof Error ? err.message : 'Search failed',
        }
    }
}

// ---------------------------------------------------------------------------
// Quick create customer from POS
// ---------------------------------------------------------------------------

export async function createPOSCustomerAction(input: {
    first_name: string
    last_name: string
    email: string
    phone?: string
}): Promise<{ customer: POSCustomerResult | null; error?: string }> {
    try {
        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_pos_shifts' })

        // Validate
        if (!input.email || !input.first_name) {
            return { customer: null, error: 'Name and email are required' }
        }

        const scope = await getTenantMedusaScope(tenantId)
        const { adminFetch } = await import('@/lib/medusa/admin-core')

        const res = await adminFetch<{ customer: {
            id: string
            first_name: string | null
            last_name: string | null
            email: string
            phone: string | null
        } }>('/admin/customers', {
            method: 'POST',
            body: JSON.stringify({
                first_name: input.first_name.trim(),
                last_name: input.last_name.trim(),
                email: input.email.trim().toLowerCase(),
                phone: input.phone?.trim() || undefined,
            }),
        }, scope)

        if (res.error || !res.data?.customer) {
            return { customer: null, error: res.error || 'Failed to create customer' }
        }

        const c = res.data.customer
        return {
            customer: {
                id: c.id,
                first_name: c.first_name,
                last_name: c.last_name,
                email: c.email,
                phone: c.phone,
                orders_count: 0,
            },
        }
    } catch (err) {
        return {
            customer: null,
            error: err instanceof Error ? err.message : 'Create failed',
        }
    }
}
