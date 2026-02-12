/**
 * Medusa Admin API helper
 *
 * Authenticates via `/auth/user/emailpass` to obtain a JWT,
 * then uses `Authorization: Bearer <token>` for all Admin API calls.
 *
 * Required env vars:
 *   MEDUSA_BACKEND_URL      — e.g. http://localhost:9000  (Docker: http://medusa-server:9000)
 *   MEDUSA_ADMIN_EMAIL      — admin user email (default: admin@medusajs.com)
 *   MEDUSA_ADMIN_PASSWORD   — admin user password
 */

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || 'admin@medusajs.com'
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD

if (!MEDUSA_ADMIN_PASSWORD) {
    console.error('[medusa-admin] CRITICAL: MEDUSA_ADMIN_PASSWORD env var is not set. Owner Panel will not work.')
}

// ---------------------------------------------------------------------------
// JWT token cache (globalThis — survives Turbopack module re-evaluation)
// Tokens expire at 24 h, we cache for ~23 h.
// ---------------------------------------------------------------------------

const TOKEN_TTL_MS = 23 * 60 * 60 * 1000 // 23 hours

const gMedusa = globalThis as unknown as {
    __medusaAdminToken?: string | null
    __medusaTokenExpiry?: number
}

async function getAdminToken(): Promise<string> {
    const now = Date.now()
    if (gMedusa.__medusaAdminToken && now < (gMedusa.__medusaTokenExpiry ?? 0)) {
        return gMedusa.__medusaAdminToken
    }

    try {
        const res = await fetch(`${MEDUSA_BACKEND_URL}/auth/user/emailpass`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: MEDUSA_ADMIN_EMAIL,
                password: MEDUSA_ADMIN_PASSWORD,
            }),
            cache: 'no-store',
        })

        if (!res.ok) {
            const body = await res.text()
            console.error('[medusa-admin] Auth failed:', res.status, body)
            throw new Error(`Medusa auth failed: ${res.status}`)
        }

        const { token } = await res.json()
        gMedusa.__medusaAdminToken = token
        gMedusa.__medusaTokenExpiry = now + TOKEN_TTL_MS
        return token
    } catch (err) {
        console.error('[medusa-admin] Auth error:', err)
        throw new Error('Failed to authenticate with Medusa Admin API')
    }
}

// ---------------------------------------------------------------------------
// Base fetcher with JWT auth
// ---------------------------------------------------------------------------

interface MedusaAdminResponse<T> {
    data: T | null
    error: string | null
}

async function adminFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<MedusaAdminResponse<T>> {
    try {
        const token = await getAdminToken()
        const res = await fetch(`${MEDUSA_BACKEND_URL}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            },
            cache: 'no-store',
        })

        if (res.status === 401) {
            // Token expired — clear cache and retry once
            gMedusa.__medusaAdminToken = null
            gMedusa.__medusaTokenExpiry = 0
            const freshToken = await getAdminToken()
            const retryRes = await fetch(`${MEDUSA_BACKEND_URL}${path}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${freshToken}`,
                    ...options.headers,
                },
                cache: 'no-store',
            })
            if (!retryRes.ok) {
                const errBody = await retryRes.text()
                console.error('[medusa-admin] Retry failed:', retryRes.status, errBody)
                return { data: null, error: `Medusa Admin API error: ${retryRes.status} — ${errBody}` }
            }
            const json = await retryRes.json()
            return { data: json, error: null }
        }

        if (!res.ok) {
            const errBody = await res.text()
            console.error('[medusa-admin] Request failed:', res.status, errBody)
            return { data: null, error: `Medusa Admin API error: ${res.status} — ${errBody}` }
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
    metadata: Record<string, unknown> | null
}

export async function getRecentOrders(limit = 5): Promise<AdminOrder[]> {
    const res = await adminFetch<{ orders: AdminOrder[] }>(
        `/admin/orders?limit=${limit}&order=-created_at&fields=*customer`
    )
    return res.data?.orders ?? []
}

export async function getAdminOrders(params?: {
    limit?: number
    offset?: number
    status?: string
    q?: string
}): Promise<{ orders: AdminOrderFull[]; count: number }> {
    const searchParams = new URLSearchParams()
    searchParams.set('limit', String(params?.limit ?? 20))
    searchParams.set('offset', String(params?.offset ?? 0))
    searchParams.set('order', '-created_at')
    searchParams.set('fields', '*customer,*items,*shipping_address,*fulfillments,*payments')
    if (params?.status && params.status !== 'all') {
        searchParams.set('status', params.status)
    }
    if (params?.q) {
        searchParams.set('q', params.q)
    }

    const res = await adminFetch<{ orders: AdminOrderFull[]; count: number }>(
        `/admin/orders?${searchParams.toString()}`
    )
    return { orders: res.data?.orders ?? [], count: res.data?.count ?? 0 }
}

export async function getAdminOrderDetail(id: string): Promise<AdminOrderFull | null> {
    const res = await adminFetch<{ order: AdminOrderFull }>(
        `/admin/orders/${id}?fields=*customer,*items,*shipping_address,*fulfillments,*payments`
    )
    return res.data?.order ?? null
}

export async function createOrderFulfillment(
    orderId: string,
    itemIds?: string[]
): Promise<{ error: string | null }> {
    const body: Record<string, unknown> = {}
    if (itemIds?.length) {
        body.items = itemIds.map(id => ({ id, quantity: 1 }))
    }
    const res = await adminFetch(`/admin/orders/${orderId}/fulfillments`, {
        method: 'POST',
        body: JSON.stringify(body),
    })
    return { error: res.error }
}

export async function cancelAdminOrder(
    orderId: string
): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/orders/${orderId}/cancel`, {
        method: 'POST',
    })
    return { error: res.error }
}

// ---------------------------------------------------------------------------
// Admin Customers (read-only)
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
}): Promise<{ customers: AdminCustomer[]; count: number }> {
    const searchParams = new URLSearchParams()
    searchParams.set('limit', String(params?.limit ?? 20))
    searchParams.set('offset', String(params?.offset ?? 0))
    searchParams.set('order', '-created_at')
    if (params?.q) {
        searchParams.set('q', params.q)
    }

    const res = await adminFetch<{ customers: AdminCustomer[]; count: number }>(
        `/admin/customers?${searchParams.toString()}`
    )
    return { customers: res.data?.customers ?? [], count: res.data?.count ?? 0 }
}

export async function getCustomerCount(): Promise<number> {
    const res = await adminFetch<{ count: number }>('/admin/customers?limit=0&fields=id')
    return res.data?.count ?? 0
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
// Product list (for badges page — lightweight)
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

// ---------------------------------------------------------------------------
// Product CRUD (for Owner Panel product management)
// ---------------------------------------------------------------------------

export interface AdminProductFull {
    id: string
    title: string
    handle: string
    description: string | null
    subtitle: string | null
    thumbnail: string | null
    status: string
    images: { id: string; url: string }[]
    variants: {
        id: string
        title: string
        prices: { amount: number; currency_code: string }[]
        manage_inventory: boolean
        inventory_quantity?: number
    }[]
    categories: { id: string; name: string; handle: string }[]
    metadata: Record<string, unknown> | null
    created_at: string
    updated_at: string
}

export async function getAdminProductsFull(params?: {
    limit?: number
    offset?: number
    status?: string
    q?: string
}): Promise<{ products: AdminProductFull[]; count: number }> {
    const limit = params?.limit ?? 20
    const offset = params?.offset ?? 0
    const searchParams = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        order: '-created_at',
    })
    if (params?.status && params.status !== 'all') {
        searchParams.set('status', params.status)
    }
    if (params?.q) {
        searchParams.set('q', params.q)
    }
    searchParams.set('fields', 'id,title,handle,description,subtitle,thumbnail,status,created_at,updated_at,metadata,*categories,*variants,*variants.prices,*images')

    const res = await adminFetch<{ products: AdminProductFull[]; count: number }>(
        `/admin/products?${searchParams.toString()}`
    )
    return {
        products: res.data?.products ?? [],
        count: res.data?.count ?? 0,
    }
}

export async function getAdminProduct(id: string): Promise<AdminProductFull | null> {
    const res = await adminFetch<{ product: AdminProductFull }>(
        `/admin/products/${id}?fields=id,title,handle,description,subtitle,thumbnail,status,created_at,updated_at,metadata,*categories,*variants,*variants.prices,*images`
    )
    return res.data?.product ?? null
}

export interface CreateProductInput {
    title: string
    description?: string
    status?: 'draft' | 'published'
    categories?: { id: string }[]
    variants?: {
        title: string
        prices: { amount: number; currency_code: string }[]
        manage_inventory?: boolean
    }[]
}

export async function createAdminProduct(
    data: CreateProductInput
): Promise<{ product: AdminProductFull | null; error: string | null }> {
    const res = await adminFetch<{ product: AdminProductFull }>('/admin/products', {
        method: 'POST',
        body: JSON.stringify(data),
    })
    return { product: res.data?.product ?? null, error: res.error }
}

export async function updateAdminProduct(
    id: string,
    data: Partial<CreateProductInput>
): Promise<{ product: AdminProductFull | null; error: string | null }> {
    const res = await adminFetch<{ product: AdminProductFull }>(`/admin/products/${id}`, {
        method: 'POST',
        body: JSON.stringify(data),
    })
    return { product: res.data?.product ?? null, error: res.error }
}

export async function deleteAdminProduct(id: string): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/products/${id}`, { method: 'DELETE' })
    return { error: res.error }
}

// ---------------------------------------------------------------------------
// Product Image Upload / Delete
// ---------------------------------------------------------------------------

/**
 * Upload files to Medusa via `POST /admin/uploads`.
 * Returns an array of `{ id, url }` objects for each uploaded file.
 */
export async function uploadFiles(
    files: File[]
): Promise<{ files: { id: string; url: string }[]; error: string | null }> {
    try {
        const token = await getAdminToken()
        const formData = new FormData()
        for (const file of files) {
            formData.append('files', file)
        }

        const res = await fetch(`${MEDUSA_BACKEND_URL}/admin/uploads`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            // No Content-Type header — browser sets multipart boundary automatically
            body: formData,
            cache: 'no-store',
        })

        if (!res.ok) {
            const errBody = await res.text()
            console.error('[medusa-admin] Upload failed:', res.status, errBody)
            return { files: [], error: `Upload failed: ${res.status}` }
        }

        const json = await res.json()
        return { files: json.files ?? [], error: null }
    } catch (err) {
        console.error('[medusa-admin] Upload error:', err)
        return { files: [], error: 'Failed to upload files' }
    }
}

/**
 * Update a product's images array. Pass the full desired list of images.
 */
export async function updateProductImages(
    productId: string,
    images: { url: string }[]
): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/products/${productId}`, {
        method: 'POST',
        body: JSON.stringify({ images }),
    })
    return { error: res.error }
}

/**
 * Remove a specific image from a product by its URL.
 * Fetches current images, filters out the target, then updates.
 */
export async function deleteProductImage(
    productId: string,
    imageUrl: string
): Promise<{ error: string | null }> {
    const product = await getAdminProduct(productId)
    if (!product) return { error: 'Product not found' }

    const updatedImages = (product.images ?? [])
        .filter(img => img.url !== imageUrl)
        .map(img => ({ url: img.url }))

    return updateProductImages(productId, updatedImages)
}

// ---------------------------------------------------------------------------
// Update product variant prices
// ---------------------------------------------------------------------------

export async function updateVariantPrices(
    productId: string,
    variantId: string,
    prices: { amount: number; currency_code: string }[]
): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/products/${productId}/variants/${variantId}`, {
        method: 'POST',
        body: JSON.stringify({ prices }),
    })
    return { error: res.error }
}

// ---------------------------------------------------------------------------
// Category CRUD (for Owner Panel category management)
// ---------------------------------------------------------------------------

export interface AdminCategory {
    id: string
    name: string
    handle: string
    description: string | null
    is_active: boolean
    is_internal: boolean
    rank: number
    parent_category: { id: string; name: string } | null
    category_children: { id: string; name: string }[]
    created_at: string
    updated_at: string
}

export async function getAdminCategories(params?: {
    limit?: number
    offset?: number
}): Promise<{ product_categories: AdminCategory[]; count: number }> {
    const limit = params?.limit ?? 50
    const offset = params?.offset ?? 0
    const res = await adminFetch<{ product_categories: AdminCategory[]; count: number }>(
        `/admin/product-categories?limit=${limit}&offset=${offset}&fields=id,name,handle,description,is_active,is_internal,rank,parent_category,category_children,created_at,updated_at&order=name`
    )
    return {
        product_categories: res.data?.product_categories ?? [],
        count: res.data?.count ?? 0,
    }
}

export interface CreateCategoryInput {
    name: string
    handle?: string
    description?: string
    is_active?: boolean
    is_internal?: boolean
}

export async function createAdminCategory(
    data: CreateCategoryInput
): Promise<{ category: AdminCategory | null; error: string | null }> {
    const res = await adminFetch<{ product_category: AdminCategory }>('/admin/product-categories', {
        method: 'POST',
        body: JSON.stringify(data),
    })
    return { category: res.data?.product_category ?? null, error: res.error }
}

export async function updateAdminCategory(
    id: string,
    data: Partial<CreateCategoryInput>
): Promise<{ category: AdminCategory | null; error: string | null }> {
    const res = await adminFetch<{ product_category: AdminCategory }>(`/admin/product-categories/${id}`, {
        method: 'POST',
        body: JSON.stringify(data),
    })
    return { category: res.data?.product_category ?? null, error: res.error }
}

export async function deleteAdminCategory(id: string): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/product-categories/${id}`, { method: 'DELETE' })
    return { error: res.error }
}
