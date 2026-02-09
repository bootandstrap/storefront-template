/**
 * Medusa Admin API helper
 *
 * Uses MEDUSA_ADMIN_API_KEY (from .env) to authenticate requests
 * to the Medusa Admin API for server-side operations like fetching
 * product counts, order counts, etc.
 */

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const MEDUSA_ADMIN_API_KEY = process.env.MEDUSA_ADMIN_API_KEY || ''

interface MedusaAdminResponse<T> {
    data: T | null
    error: string | null
}

async function adminFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<MedusaAdminResponse<T>> {
    try {
        const res = await fetch(`${MEDUSA_BACKEND_URL}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'x-medusa-access-token': MEDUSA_ADMIN_API_KEY,
                ...options.headers,
            },
            cache: 'no-store',
        })

        if (!res.ok) {
            return { data: null, error: `Medusa Admin API error: ${res.status}` }
        }

        const json = await res.json()
        return { data: json, error: null }
    } catch (err) {
        console.error('[medusa-admin]', err)
        return { data: null, error: 'Failed to connect to Medusa Admin API' }
    }
}

// ---------------------------------------------------------------------------
// Product count
// ---------------------------------------------------------------------------

export async function getProductCount(): Promise<number> {
    const res = await adminFetch<{ count: number }>('/admin/products?limit=0&fields=id')
    return res.data?.count ?? 0
}

// ---------------------------------------------------------------------------
// Category count
// ---------------------------------------------------------------------------

export async function getCategoryCount(): Promise<number> {
    const res = await adminFetch<{ count: number }>('/admin/product-categories?limit=0&fields=id')
    return res.data?.count ?? 0
}

// ---------------------------------------------------------------------------
// Orders count (current month)
// ---------------------------------------------------------------------------

export async function getOrdersThisMonth(): Promise<number> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const res = await adminFetch<{ count: number }>(
        `/admin/orders?limit=0&fields=id&created_at[gte]=${startOfMonth}`
    )
    return res.data?.count ?? 0
}

// ---------------------------------------------------------------------------
// Recent orders (for dashboard)
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

export async function getRecentOrders(limit = 5): Promise<AdminOrder[]> {
    const res = await adminFetch<{ orders: AdminOrder[] }>(
        `/admin/orders?limit=${limit}&order=-created_at&expand=customer`
    )
    return res.data?.orders ?? []
}

// ---------------------------------------------------------------------------
// Product metadata update (for badges)
// ---------------------------------------------------------------------------

export async function updateProductMetadata(
    productId: string,
    metadata: Record<string, unknown>
): Promise<boolean> {
    const res = await adminFetch(`/admin/products/${productId}`, {
        method: 'POST',
        body: JSON.stringify({ metadata }),
    })
    return res.error === null
}

// ---------------------------------------------------------------------------
// Product list (for badges page)
// ---------------------------------------------------------------------------

export interface AdminProductSummary {
    id: string
    title: string
    handle: string
    thumbnail: string | null
    status: string
    metadata: Record<string, unknown> | null
}

export async function getAdminProducts(params?: {
    limit?: number
    offset?: number
}): Promise<{ products: AdminProductSummary[]; count: number }> {
    const limit = params?.limit ?? 50
    const offset = params?.offset ?? 0
    const res = await adminFetch<{
        products: AdminProductSummary[]
        count: number
    }>(`/admin/products?limit=${limit}&offset=${offset}&fields=id,title,handle,thumbnail,status,metadata&order=title`)

    return {
        products: res.data?.products ?? [],
        count: res.data?.count ?? 0,
    }
}

