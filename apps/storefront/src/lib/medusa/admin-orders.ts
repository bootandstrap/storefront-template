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
