/**
 * Medusa Admin API — Orders Domain
 */
import { adminFetch, normalizeAdminListParams, assertScope } from './admin-core'
import type { TenantMedusaScope, AdminListParams } from './admin-core'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminOrder {
    id: string
    display_id: number
    status: string
    total: number
    currency_code: string
    created_at: string
    customer?: {
        first_name?: string
        last_name?: string
        email?: string
    }
}

export interface AdminOrderItem {
    id: string
    title: string
    thumbnail: string | null
    variant_title: string | null
    quantity: number
    unit_price: number
    total: number
    product_id: string | null
}

export interface AdminOrderFull extends AdminOrder {
    email: string | null
    fulfillment_status: string
    payment_status: string
    subtotal: number
    tax_total: number
    shipping_total: number
    discount_total: number
    items: AdminOrderItem[]
    shipping_address: {
        first_name: string | null
        last_name: string | null
        address_1: string | null
        address_2: string | null
        city: string | null
        province: string | null
        postal_code: string | null
        country_code: string | null
        phone: string | null
    } | null
    fulfillments: {
        id: string
        tracking_numbers: string[]
        created_at: string
    }[]
    payments: {
        id: string
        provider_id: string
        amount: number
        currency_code: string
    }[]
    updated_at: string
    sales_channel_id?: string | null
    metadata: Record<string, unknown> | null
}

// ---------------------------------------------------------------------------
// Counts
// ---------------------------------------------------------------------------

export async function getProductCount(scope: TenantMedusaScope | null): Promise<number> {
    if (!scope) return 0
    const res = await adminFetch<{ count: number }>('/admin/products?limit=0&fields=id', {}, scope)
    return res.data?.count ?? 0
}

export async function getCategoryCount(scope: TenantMedusaScope | null): Promise<number> {
    if (!scope) return 0
    const res = await adminFetch<{ count: number }>('/admin/product-categories?limit=0&fields=id', {}, scope)
    return res.data?.count ?? 0
}

export async function getOrdersThisMonth(scope: TenantMedusaScope | null): Promise<number> {
    if (!scope) return 0
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    // Count both regular orders AND completed draft orders (POS creates draft orders in Medusa v2)
    // Note: Medusa v2 draft-orders API doesn't support status filter, so we fetch all and filter
    // Also: limit=0 returns count but empty array — we need the array for status filtering
    const [regularRes, draftRes] = await Promise.all([
        adminFetch<{ count: number }>(
            `/admin/orders?limit=0&fields=id&created_at[gte]=${startOfMonth}`,
            {},
            scope
        ),
        adminFetch<{ draft_orders: { id: string; status: string }[] }>(
            `/admin/draft-orders?limit=500&fields=id,status&created_at[gte]=${startOfMonth}`,
            {},
            scope
        ),
    ])
    const rawDrafts = draftRes.data?.draft_orders as Array<{ id: string; status: string }> | undefined
    const completedDraftCount = (rawDrafts || []).filter(d => d.status === 'completed').length
    return (regularRes.data?.count ?? 0) + completedDraftCount
}

export async function getCustomerCount(scope: TenantMedusaScope | null): Promise<number> {
    if (!scope) return 0
    const res = await adminFetch<{ count: number }>('/admin/customers?limit=0&fields=id', {}, scope)
    return res.data?.count ?? 0
}

// ---------------------------------------------------------------------------
// Order queries
// ---------------------------------------------------------------------------

export async function getRecentOrders(limit = 5, scope?: TenantMedusaScope | null): Promise<AdminOrder[]> {
    if (!scope) return []
    const normalizedLimit = Math.min(100, Math.max(1, Math.floor(limit)))
    // Fetch both regular orders AND completed draft orders (POS creates draft orders in Medusa v2)
    // Note: Medusa v2 draft-orders API doesn't support status filter
    const [regularRes, draftRes] = await Promise.all([
        adminFetch<{ orders: AdminOrder[] }>(
            `/admin/orders?limit=${normalizedLimit}&order=-created_at&fields=*customer`,
            {},
            scope
        ),
        adminFetch<{ draft_orders: (AdminOrder & { region?: { currency_code?: string } })[] }>(
            `/admin/draft-orders?limit=${normalizedLimit * 2}&order=-created_at&fields=*region`,
            {},
            scope
        ),
    ])
    // Merge, filter completed drafts, sort by created_at desc, and take the top N
    const regularOrders = regularRes.data?.orders ?? []
    
    // Cleanly map Medusa v2 Draft Orders
    const rawDrafts = draftRes.data?.draft_orders as Array<AdminOrder & { region?: { currency_code?: string }; summary?: { current_order_total?: number } }> | undefined
    const draftOrders = (rawDrafts || [])
        .filter(d => d.status === 'completed')
        .map(d => ({
            ...d,
            total: d.total ?? d.summary?.current_order_total ?? 0,
            currency_code: d.currency_code || d.region?.currency_code || 'eur',
        }))

    const merged = [...regularOrders, ...draftOrders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, normalizedLimit)
    
    return merged
}

export async function getAdminOrders(params?: {
    limit?: number
    offset?: number
    status?: string
    q?: string
}, scope?: TenantMedusaScope | null): Promise<{ orders: AdminOrderFull[]; count: number }> {
    const normalized = normalizeAdminListParams({
        limit: params?.limit,
        offset: params?.offset,
        status: params?.status,
        q: params?.q,
    })

    const searchParams = new URLSearchParams()
    searchParams.set('limit', String(normalized.limit))
    searchParams.set('offset', String(normalized.offset))
    searchParams.set('order', '-created_at')
    searchParams.set('fields', '*customer,*items,*shipping_address,sales_channel_id,metadata,*payment_collections,*payment_collections.payments,*summary')
    if (normalized.status && normalized.status !== 'all') {
        searchParams.append('status[]', normalized.status)
    }
    if (normalized.q) {
        searchParams.set('q', normalized.q)
    }

    // Fetch both regular orders AND completed draft orders (POS creates draft orders in Medusa v2)
    // Note: Medusa v2 draft-orders API doesn't support status filter
    const draftSearchParams = new URLSearchParams()
    draftSearchParams.set('limit', String(normalized.limit * 2))
    draftSearchParams.set('order', '-created_at')

    type V2OrderResponse = AdminOrderFull & { 
        payment_collections?: { payments?: { id: string; provider_id: string; amount: number; currency_code: string }[] }[] 
        summary?: { current_order_total?: number }
    }
    type V2DraftResponse = AdminOrderFull & { 
        region?: { currency_code?: string }
        summary?: { current_order_total?: number }
    }

    const [regularRes, draftRes] = await Promise.all([
        adminFetch<{ orders: V2OrderResponse[]; count: number }>(
            `/admin/orders?${searchParams.toString()}`,
            {},
            scope
        ),
        adminFetch<{ draft_orders: V2DraftResponse[] }>(
            `/admin/draft-orders?${draftSearchParams.toString()}&fields=*region,*items,*summary`,
            {},
            scope
        ),
    ])

    const regularOrders: AdminOrderFull[] = (regularRes.data?.orders ?? []).map(o => {
        // Map Medusa v2 payment_collections to flat array if needed
        const payments = o.payments ?? o.payment_collections?.flatMap(pc => pc.payments ?? []) ?? []
        return { 
            ...o, 
            payments,
            total: o.total ?? o.summary?.current_order_total ?? 0,
        }
    })
    
    const regularCount = regularRes.data?.count ?? 0
    
    // Cleanly map Medusa v2 Draft Orders
    const rawDrafts = draftRes.data?.draft_orders ?? []
    const draftOrders: AdminOrderFull[] = rawDrafts
        .filter(d => d.status === 'completed')
        .map(d => ({
            ...d,
            total: d.total ?? d.summary?.current_order_total ?? 0,
            currency_code: d.currency_code || d.region?.currency_code || 'eur',
            fulfillment_status: d.fulfillment_status || 'not_fulfilled',
            payment_status: d.payment_status || 'not_paid',
            metadata: { ...(d.metadata || {}), source: 'pos' },
            payments: [], // Drafts don't conventionally return captured payments natively the same way
        }))
    
    const draftCount = draftOrders.length

    // Merge, sort by created_at desc
    const merged = [...regularOrders, ...draftOrders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, normalized.limit)

    return { orders: merged, count: regularCount + draftCount }
}

    export async function getAdminOrderDetail(
    id: string,
    scope?: TenantMedusaScope | null
): Promise<AdminOrderFull | null> {
    type V2OrderResponse = AdminOrderFull & { 
        payment_collections?: { payments?: { id: string; provider_id: string; amount: number; currency_code: string }[] }[] 
        summary?: { current_order_total?: number }
    }

    const res = await adminFetch<{ order: V2OrderResponse }>(
        `/admin/orders/${id}?fields=*customer,*items,*shipping_address,sales_channel_id,metadata,*payment_collections,*payment_collections.payments,*summary`,
        {},
        scope
    )
    
    if (!res.data?.order) return null;
    
    const order = res.data.order;
    const payments = order.payments ?? order.payment_collections?.flatMap(pc => pc.payments ?? []) ?? [];
    
    return { 
        ...order, 
        payments,
        total: order.total ?? order.summary?.current_order_total ?? 0,
    }
}

export function orderBelongsToScope(
    order: Pick<AdminOrderFull, 'sales_channel_id' | 'metadata'> | null | undefined,
    scopeInput: TenantMedusaScope | null
): boolean {
    if (!order) return false
    const scope = assertScope(scopeInput)
    if (!scope) return false

    if (typeof order.sales_channel_id === 'string' && order.sales_channel_id.length > 0) {
        return order.sales_channel_id === scope.medusaSalesChannelId
    }

    const metadata = order.metadata as Record<string, unknown> | null
    const metadataTenantId = typeof metadata?.tenant_id === 'string'
        ? metadata.tenant_id.trim()
        : ''
    if (metadataTenantId.length > 0) {
        return metadataTenantId === scope.tenantId
    }

    return false
}

export async function createOrderFulfillment(
    orderId: string,
    itemIds?: string[],
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const body: Record<string, unknown> = {}
    if (itemIds?.length) {
        body.items = itemIds.map(id => ({ id, quantity: 1 }))
    }
    const res = await adminFetch(`/admin/orders/${orderId}/fulfillments`, {
        method: 'POST',
        body: JSON.stringify(body),
    }, scope)
    return { error: res.error }
}

export async function cancelAdminOrder(
    orderId: string,
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/orders/${orderId}/cancel`, {
        method: 'POST',
    }, scope)
    return { error: res.error }
}

// ---------------------------------------------------------------------------
// Fulfillment with tracking
// ---------------------------------------------------------------------------

export async function createFulfillmentWithTracking(
    orderId: string,
    data: {
        items?: { id: string; quantity: number }[]
        tracking_numbers?: string[]
        no_notification?: boolean
        metadata?: Record<string, unknown>
    },
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const body: Record<string, unknown> = {}
    if (data.items?.length) {
        body.items = data.items
    }
    if (data.tracking_numbers?.length) {
        body.labels = data.tracking_numbers.map(tn => ({
            tracking_number: tn,
        }))
    }
    if (data.no_notification) body.no_notification = true
    if (data.metadata) body.metadata = data.metadata

    const res = await adminFetch(`/admin/orders/${orderId}/fulfillments`, {
        method: 'POST',
        body: JSON.stringify(body),
    }, scope)
    return { error: res.error }
}

// ---------------------------------------------------------------------------
// Shipment tracking (add to existing fulfillment)
// ---------------------------------------------------------------------------

export async function addTrackingToFulfillment(
    orderId: string,
    fulfillmentId: string,
    trackingNumber: string,
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(
        `/admin/orders/${orderId}/fulfillments/${fulfillmentId}/shipments`,
        {
            method: 'POST',
            body: JSON.stringify({
                labels: [{ tracking_number: trackingNumber }],
            }),
        },
        scope
    )
    return { error: res.error }
}

// ---------------------------------------------------------------------------
// Refund processing (Stripe)
// ---------------------------------------------------------------------------

export async function createOrderRefund(
    orderId: string,
    data: {
        amount: number
        reason?: string
        note?: string
    },
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/orders/${orderId}/refunds`, {
        method: 'POST',
        body: JSON.stringify({
            amount: data.amount,
            reason: data.reason || 'other',
            note: data.note,
        }),
    }, scope)
    return { error: res.error }
}

// ---------------------------------------------------------------------------
// Order Notes
// ---------------------------------------------------------------------------

export interface OrderNote {
    id: string
    value: string
    author_id?: string
    created_at: string
}

/**
 * @deprecated Medusa v2 removed the `/admin/notes` endpoint.
 * Returns empty array. Order notes are no longer supported.
 */
export async function getOrderNotes(
    _orderId: string,
    _scope?: TenantMedusaScope | null
): Promise<OrderNote[]> {
    logger.warn('[admin-orders] getOrderNotes: /admin/notes is removed in Medusa v2. Returning empty.')
    return []
}

/**
 * @deprecated Medusa v2 removed the `/admin/notes` endpoint.
 * Returns null note with error message.
 */
export async function createOrderNote(
    _orderId: string,
    _value: string,
    _scope?: TenantMedusaScope | null
): Promise<{ note: OrderNote | null; error: string | null }> {
    logger.warn('[admin-orders] createOrderNote: /admin/notes is removed in Medusa v2.')
    return { note: null, error: 'Order notes are not available in Medusa v2' }
}

/**
 * @deprecated Medusa v2 removed the `/admin/notes` endpoint.
 */
export async function deleteOrderNote(
    _noteId: string,
    _scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    logger.warn('[admin-orders] deleteOrderNote: /admin/notes is removed in Medusa v2.')
    return { error: 'Order notes are not available in Medusa v2' }
}

// ---------------------------------------------------------------------------
// Returns & Refund Requests
// ---------------------------------------------------------------------------

export async function createReturnRequest(
    orderId: string,
    items: { id: string; quantity: number; reason?: string }[],
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/orders/${orderId}/returns`, {
        method: 'POST',
        body: JSON.stringify({ items }),
    }, scope)
    return { error: res.error }
}

export async function receiveReturn(
    returnId: string,
    items: { id: string; quantity: number }[],
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/returns/${returnId}/receive`, {
        method: 'POST',
        body: JSON.stringify({ items }),
    }, scope)
    return { error: res.error }
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export interface AdminCustomer {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
    has_account: boolean
    created_at: string
    orders?: { id: string }[]
    metadata?: Record<string, unknown>
}

export async function getAdminCustomers(params?: {
    limit?: number
    offset?: number
    q?: string
}, scope?: TenantMedusaScope | null): Promise<{ customers: AdminCustomer[]; count: number }> {
    const normalized = normalizeAdminListParams({
        limit: params?.limit,
        offset: params?.offset,
        q: params?.q,
    })

    const searchParams = new URLSearchParams()
    searchParams.set('limit', String(normalized.limit))
    searchParams.set('offset', String(normalized.offset))
    searchParams.set('order', '-created_at')
    if (normalized.q) {
        searchParams.set('q', normalized.q)
    }

    const res = await adminFetch<{ customers: AdminCustomer[]; count: number }>(
        `/admin/customers?${searchParams.toString()}`,
        {},
        scope
    )
    return { customers: res.data?.customers ?? [], count: res.data?.count ?? 0 }
}

export async function getAdminCustomerDetail(
    id: string,
    scope?: TenantMedusaScope | null
): Promise<AdminCustomer | null> {
    const res = await adminFetch<{ customer: AdminCustomer }>(
        `/admin/customers/${id}?fields=*orders,metadata`,
        {},
        scope
    )
    return res.data?.customer ?? null
}

/**
 * Updates a customer's metadata in Medusa.
 * Used for persisting loyalty stamps, preferences, etc.
 */
export async function updateCustomerMetadata(
    customerId: string,
    metadata: Record<string, unknown>,
    scope?: TenantMedusaScope | null
): Promise<{ customer: AdminCustomer | null; error: string | null }> {
    const res = await adminFetch<{ customer: AdminCustomer }>(
        `/admin/customers/${customerId}`,
        {
            method: 'POST',
            body: JSON.stringify({ metadata }),
        },
        scope
    )
    return { customer: res.data?.customer ?? null, error: res.error }
}
