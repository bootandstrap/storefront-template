/**
 * POS Sales History — Server Actions
 *
 * Queries Medusa draft orders created by POS.
 * Gated by `enable_pos_history` (Pro tier).
 */
'use server'

import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import type { POSSaleRecord, POSSalesFilter } from '../pos-config'

// ---------------------------------------------------------------------------
// Get POS sales list
// ---------------------------------------------------------------------------

export async function getPOSSalesAction(
    filters: POSSalesFilter = {}
): Promise<{ sales: POSSaleRecord[]; total: number; error?: string }> {
    try {
        const { tenantId, appConfig } = await withPanelGuard()

        // Gate check: Pro+ required
        if (!appConfig?.featureFlags?.enable_pos_shifts) {
            return { sales: [], total: 0, error: 'Upgrade to Pro for sales history' }
        }

        const scope = await getTenantMedusaScope(tenantId)
        const { adminFetch } = await import('@/lib/medusa/admin-core')

        // Build query params
        const params = new URLSearchParams()
        params.set('limit', String(filters.limit || 50))
        params.set('offset', String(filters.offset || 0))
        params.set('order', '-created_at')

        // Date range filter
        if (filters.from) {
            params.set('created_at[gte]', filters.from)
        }
        if (filters.to) {
            params.set('created_at[lte]', filters.to)
        }

        // Search by order display ID or customer
        if (filters.search) {
            params.set('q', filters.search)
        }

        const res = await adminFetch<{
            draft_orders: DraftOrderRaw[]
            count: number
        }>(`/admin/draft-orders?${params.toString()}`, {}, scope)

        if (res.error || !res.data) {
            return { sales: [], total: 0, error: res.error || 'No data returned' }
        }

        // Map to POSSaleRecord + apply client-side filters
        let sales = (res.data.draft_orders || [])
            .filter((d: DraftOrderRaw) => d.metadata?.source === 'pos')
            .map(mapDraftOrderToSaleRecord)

        // Payment method filter (client-side since Medusa doesn't support it)
        if (filters.payment_method) {
            sales = sales.filter((s: POSSaleRecord) => s.payment_method === filters.payment_method)
        }

        return { sales, total: res.data.count || sales.length }
    } catch (err) {
        return {
            sales: [],
            total: 0,
            error: err instanceof Error ? err.message : 'Failed to fetch sales',
        }
    }
}

// ---------------------------------------------------------------------------
// Get single sale detail
// ---------------------------------------------------------------------------

export async function getPOSSaleDetailAction(
    orderId: string
): Promise<{ sale: POSSaleRecord | null; error?: string }> {
    try {
        const { tenantId, appConfig } = await withPanelGuard()

        if (!appConfig?.featureFlags?.enable_pos_shifts) {
            return { sale: null, error: 'Upgrade to Pro for sale details' }
        }

        const scope = await getTenantMedusaScope(tenantId)
        const { adminFetch } = await import('@/lib/medusa/admin-core')

        const res = await adminFetch<{ draft_order: DraftOrderRaw }>(
            `/admin/draft-orders/${orderId}`,
            {},
            scope
        )

        if (res.error || !res.data?.draft_order) return { sale: null }

        return { sale: mapDraftOrderToSaleRecord(res.data.draft_order) }
    } catch (err) {
        return {
            sale: null,
            error: err instanceof Error ? err.message : 'Failed to fetch sale',
        }
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface DraftOrderRaw {
    id: string
    display_id?: number
    status: string
    cart?: {
        items?: {
            title: string
            quantity: number
            unit_price: number
        }[]
        subtotal?: number
        discount_total?: number
        total?: number
        region?: {
            currency_code?: string
        }
    }
    metadata?: Record<string, string>
    created_at: string
}

function mapDraftOrderToSaleRecord(d: DraftOrderRaw): POSSaleRecord {
    const items = d.cart?.items || []
    const paymentMethod = (d.metadata?.payment_method || 'cash') as POSSaleRecord['payment_method']

    return {
        id: d.id,
        order_display_id: d.display_id ? `#${d.display_id}` : undefined,
        items: items.map(i => ({
            title: i.title,
            quantity: i.quantity,
            unit_price: i.unit_price,
        })),
        item_count: items.reduce((s, i) => s + i.quantity, 0),
        subtotal: d.cart?.subtotal || 0,
        discount_amount: d.cart?.discount_total || 0,
        total: d.cart?.total || 0,
        currency_code: d.cart?.region?.currency_code || 'eur',
        payment_method: paymentMethod,
        customer_name: d.metadata?.customer_name || null,
        created_at: d.created_at,
        status: d.status === 'completed' ? 'completed' : 'pending',
        shift_id: d.metadata?.shift_id,
    }
}
