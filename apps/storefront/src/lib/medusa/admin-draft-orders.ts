/**
 * Medusa Admin API — Draft Orders Domain
 *
 * Used by the POS module to create in-store sales via draft orders.
 *
 * Medusa v2 (draft-order plugin, v2.4+):
 *   - `POST /admin/draft-orders` → creates draft + associated cart
 *   - `POST /admin/draft-orders/{id}/convert-to-order` → creates REAL pending
 *     order, visible in `/admin/orders`. Uses `convertDraftOrderWorkflow`.
 *   - The v1 `/pay` and v2-early `/admin/orders/{id}/complete` endpoints
 *     are DEPRECATED/BROKEN — completed drafts stay invisible in /admin/orders.
 *
 * @module lib/medusa/admin-draft-orders
 */
import { adminFetch, normalizeAdminListParams } from './admin-core'
import type { TenantMedusaScope, AdminListParams } from './admin-core'
import { logger } from '@/lib/logger'

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
    sales_channel_id?: string
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
// Convert Draft Order to Real Order (Medusa v2.4+)
// ---------------------------------------------------------------------------

/**
 * Convert a draft order to a real, pending order.
 *
 * Uses the official `convertDraftOrderWorkflow` via:
 *   `POST /admin/draft-orders/{id}/convert-to-order`
 *
 * The resulting order is a first-class Medusa Order:
 *   - Visible in `/admin/orders`
 *   - Inventory reservations are created automatically
 *   - Fulfillment workflows apply normally
 *   - Medusa events (order.created) fire normally
 *
 * For backward compatibility, the old `registerDraftPayment()` name is
 * preserved as an alias.
 */
export async function convertDraftToOrder(
    draftOrderId: string,
    scope?: TenantMedusaScope | null
): Promise<{ order_id: string | null; display_id: number | null; error: string | null }> {
    // Official v2.4+ endpoint: convert-to-order
    const res = await adminFetch<{ order: { id: string; display_id: number; status: string } }>(
        `/admin/draft-orders/${draftOrderId}/convert-to-order`,
        { method: 'POST' },
        scope
    )

    if (res.error) {
        logger.error('[pos] convertDraftToOrder failed', {
            error: res.error,
            draftOrderId,
        })
        return { order_id: null, display_id: null, error: res.error }
    }

    const order = res.data?.order
    if (!order?.id) {
        const errMsg = 'convert-to-order returned no order data'
        logger.error('[pos] ' + errMsg, { draftOrderId })
        return { order_id: null, display_id: null, error: errMsg }
    }

    logger.info('[pos] Draft order converted to real order', {
        draftOrderId,
        orderId: order.id,
        displayId: order.display_id,
        status: order.status,
    })

    return {
        order_id: order.id,
        display_id: order.display_id,
        error: null,
    }
}

/**
 * @deprecated Use `convertDraftToOrder()` which uses the correct
 * Medusa v2.4+ convert-to-order workflow. This alias exists for
 * backward compatibility during the transition.
 */
export async function registerDraftPayment(
    draftOrderId: string,
    scope?: TenantMedusaScope | null
): Promise<{ order_id: string | null; error: string | null }> {
    const result = await convertDraftToOrder(draftOrderId, scope)
    return { order_id: result.order_id, error: result.error }
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
