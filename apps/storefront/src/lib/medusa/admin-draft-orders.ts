/**
 * Medusa Admin API — Draft Orders Domain
 *
 * Used by the POS module to create in-store sales via draft orders.
 * Draft orders are converted to regular orders via /admin/orders/{id}/complete.
 *
 * Medusa v2 notes:
 * - Draft orders return IDs with `order_` prefix
 * - The legacy `/pay` endpoint does NOT exist in v2
 * - Use `/admin/orders/{id}/complete` to finalize a draft order
 */
import { adminFetch, normalizeAdminListParams } from './admin-core'
import type { TenantMedusaScope, AdminListParams } from './admin-core'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DraftOrderItem {
    variant_id: string
    quantity: number
    unit_price?: number
    metadata?: Record<string, unknown>
}

export interface DraftOrder {
    id: string
    display_id: number
    status: 'draft' | 'completed' | 'open'
    email: string | null
    region_id: string | null
    created_at: string
    updated_at: string
    metadata: Record<string, unknown> | null
    // v2 fields
    summary?: {
        paid_total: number
        difference_sum: number
        current_order_total: number
    }
    total?: number
    currency_code?: string
    payment_status?: string
    fulfillment_status?: string
    items?: {
        id: string
        title: string
        thumbnail: string | null
        quantity: number
        unit_price: number
        total: number
        variant_id: string | null
    }[]
}

export interface CreateDraftOrderInput {
    items: DraftOrderItem[]
    region_id: string
    customer_id?: string
    email?: string
    shipping_methods?: { option_id: string; price?: number }[]
    no_notification_order?: boolean
    metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Create Draft Order
// ---------------------------------------------------------------------------

export async function createDraftOrder(
    data: CreateDraftOrderInput,
    scope?: TenantMedusaScope | null
): Promise<{ draft_order: DraftOrder | null; error: string | null }> {
    const body: Record<string, unknown> = {
        ...data,
        metadata: {
            ...data.metadata,
            source: 'pos',
            pos_created_at: new Date().toISOString(),
        },
    }

    const res = await adminFetch<{ draft_order: DraftOrder }>(
        '/admin/draft-orders',
        {
            method: 'POST',
            body: JSON.stringify(body),
        },
        scope
    )
    return { draft_order: res.data?.draft_order ?? null, error: res.error }
}

// ---------------------------------------------------------------------------
// Complete Draft Order (Medusa v2: /admin/orders/{id}/complete)
// ---------------------------------------------------------------------------

/**
 * Finalize a draft order, converting it to a completed order.
 *
 * In Medusa v2, draft orders use `order_` prefix IDs and are completed
 * via `/admin/orders/{id}/complete`. The order stays in the draft-orders
 * collection but with status=completed. It does NOT appear in /admin/orders.
 *
 * Dashboard queries have been updated to include completed draft orders
 * in KPI calculations.
 */
export async function registerDraftPayment(
    draftOrderId: string,
    scope?: TenantMedusaScope | null
): Promise<{ order_id: string | null; error: string | null }> {
    // First, complete the draft order
    const res = await adminFetch<{ order: { id: string; status: string; total?: number } }>(
        `/admin/orders/${draftOrderId}/complete`,
        { method: 'POST' },
        scope
    )

    if (res.error) {
        console.error('[pos] registerDraftPayment failed:', res.error, 'draftOrderId:', draftOrderId)
        return { order_id: null, error: res.error }
    }

    const completedOrder = res.data?.order
    if (!completedOrder || completedOrder.status !== 'completed') {
        const errMsg = `Draft order completion returned unexpected status: ${completedOrder?.status ?? 'null'}`
        console.error('[pos]', errMsg)
        return { order_id: completedOrder?.id ?? draftOrderId, error: errMsg }
    }

    return {
        order_id: completedOrder.id,
        error: null,
    }
}

// ---------------------------------------------------------------------------
// List Draft Orders
// ---------------------------------------------------------------------------

export async function listDraftOrders(
    params?: AdminListParams & { status?: string },
    scope?: TenantMedusaScope | null
): Promise<{ draft_orders: DraftOrder[]; count: number }> {
    const normalized = normalizeAdminListParams(params)

    const searchParams = new URLSearchParams()
    searchParams.set('limit', String(normalized.limit))
    searchParams.set('offset', String(normalized.offset))
    searchParams.set('order', '-created_at')
    if (params?.status) {
        searchParams.set('status', params.status)
    }

    const res = await adminFetch<{ draft_orders: DraftOrder[]; count: number }>(
        `/admin/draft-orders?${searchParams.toString()}`,
        {},
        scope
    )
    return {
        draft_orders: res.data?.draft_orders ?? [],
        count: res.data?.count ?? 0,
    }
}

// ---------------------------------------------------------------------------
// Get Draft Order by ID
// ---------------------------------------------------------------------------

export async function getDraftOrder(
    draftOrderId: string,
    scope?: TenantMedusaScope | null
): Promise<DraftOrder | null> {
    const res = await adminFetch<{ draft_order: DraftOrder }>(
        `/admin/draft-orders/${draftOrderId}`,
        {},
        scope
    )
    return res.data?.draft_order ?? null
}
