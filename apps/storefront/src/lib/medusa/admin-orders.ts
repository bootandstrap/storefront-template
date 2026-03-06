/**
 * Medusa Admin API — Orders Domain
 */
import { adminFetch, normalizeAdminListParams, assertScope } from './admin-core'
import type { TenantMedusaScope, AdminListParams } from './admin-core'

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
    const res = await adminFetch<{ count: number }>(
        `/admin/orders?limit=0&fields=id&created_at[gte]=${startOfMonth}`,
        {},
        scope
    )
    return res.data?.count ?? 0
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
    const res = await adminFetch<{ orders: AdminOrder[] }>(
        `/admin/orders?limit=${normalizedLimit}&order=-created_at&fields=*customer`,
        {},
        scope
    )
    return res.data?.orders ?? []
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
    searchParams.set('fields', '*customer,*items,*shipping_address,*fulfillments,*payments,sales_channel_id,metadata')
    if (normalized.status && normalized.status !== 'all') {
        searchParams.set('status', normalized.status)
    }
    if (normalized.q) {
        searchParams.set('q', normalized.q)
    }

    const res = await adminFetch<{ orders: AdminOrderFull[]; count: number }>(
        `/admin/orders?${searchParams.toString()}`,
        {},
        scope
    )
    return { orders: res.data?.orders ?? [], count: res.data?.count ?? 0 }
}

export async function getAdminOrderDetail(
    id: string,
    scope?: TenantMedusaScope | null
): Promise<AdminOrderFull | null> {
    const res = await adminFetch<{ order: AdminOrderFull }>(
        `/admin/orders/${id}?fields=*customer,*items,*shipping_address,*fulfillments,*payments,sales_channel_id,metadata`,
        {},
        scope
    )
    return res.data?.order ?? null
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

export async function getOrderNotes(
    orderId: string,
    scope?: TenantMedusaScope | null
): Promise<OrderNote[]> {
    const res = await adminFetch<{ notes: OrderNote[] }>(
        `/admin/notes?resource_type=order&resource_id=${orderId}`,
        {},
        scope
    )
    return res.data?.notes ?? []
}

export async function createOrderNote(
    orderId: string,
    value: string,
    scope?: TenantMedusaScope | null
): Promise<{ note: OrderNote | null; error: string | null }> {
    const res = await adminFetch<{ note: OrderNote }>(
        '/admin/notes',
        {
            method: 'POST',
            body: JSON.stringify({
                resource_type: 'order',
                resource_id: orderId,
                value,
            }),
        },
        scope
    )
    return { note: res.data?.note ?? null, error: res.error }
}

export async function deleteOrderNote(
    noteId: string,
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/notes/${noteId}`, { method: 'DELETE' }, scope)
    return { error: res.error }
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
// Customers (read-only)
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
        `/admin/customers/${id}?fields=*orders`,
        {},
        scope
    )
    return res.data?.customer ?? null
}
