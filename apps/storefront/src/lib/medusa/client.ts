const MEDUSA_BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''

// ---------------------------------------------------------------------------
// Core fetcher with retry + timeout
// ---------------------------------------------------------------------------

async function medusaFetch<T>(
    path: string,
    options?: RequestInit & { timeout?: number }
): Promise<T> {
    const { timeout = 3000, ...fetchOptions } = options ?? {}
    const url = `${MEDUSA_BACKEND_URL}${path}`
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(PUBLISHABLE_KEY && { 'x-publishable-api-key': PUBLISHABLE_KEY }),
        ...fetchOptions.headers,
    }

    const attempt = async (signal?: AbortSignal): Promise<T> => {
        const res = await fetch(url, { ...fetchOptions, headers, signal })
        if (!res.ok) throw new Error(`Medusa ${res.status}: ${path}`)
        return res.json()
    }

    // First attempt with timeout
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
        const data = await attempt(controller.signal)
        return data
    } catch {
        // Retry once with doubled timeout
        const retryController = new AbortController()
        const retryTimer = setTimeout(() => retryController.abort(), timeout * 2)
        try {
            return await attempt(retryController.signal)
        } catch (retryErr) {
            console.error(`[medusa] ${path} failed after retry`, retryErr)
            throw retryErr
        } finally {
            clearTimeout(retryTimer)
        }
    } finally {
        clearTimeout(timer)
    }
}

// ---------------------------------------------------------------------------
// Product types (lightweight — matches Medusa Store API)
// ---------------------------------------------------------------------------

export interface MedusaImage {
    id: string
    url: string
}

export interface MedusaVariant {
    id: string
    title: string
    sku: string | null
    calculated_price?: {
        calculated_amount: number
        currency_code: string
    }
    prices: { amount: number; currency_code: string }[]
    options: { value: string }[]
    inventory_quantity?: number
}

export interface MedusaProduct {
    id: string
    title: string
    handle: string
    description: string | null
    subtitle: string | null
    thumbnail: string | null
    images: MedusaImage[]
    variants: MedusaVariant[]
    categories?: { id: string; name: string; handle: string }[]
    collection?: { id: string; title: string; handle: string } | null
    metadata?: Record<string, unknown> | null
    status: string
    created_at: string
    updated_at: string
}

export interface MedusaCategory {
    id: string
    name: string
    handle: string
    description: string | null
    parent_category: MedusaCategory | null
    category_children: MedusaCategory[]
}

export interface MedusaCart {
    id: string
    items: MedusaLineItem[]
    total: number
    subtotal: number
    tax_total: number
    shipping_total: number
    discount_total: number
    region?: { currency_code: string }
}

export interface MedusaLineItem {
    id: string
    title: string
    thumbnail: string | null
    variant: MedusaVariant
    quantity: number
    unit_price: number
    total: number
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

interface ProductListResponse {
    products: MedusaProduct[]
    count: number
    offset: number
    limit: number
}

export async function getProducts(params?: {
    limit?: number
    offset?: number
    category_id?: string[]
    order?: string
    q?: string
}): Promise<ProductListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.offset) searchParams.set('offset', String(params.offset))
    if (params?.order) searchParams.set('order', params.order)
    if (params?.q) searchParams.set('q', params.q)
    params?.category_id?.forEach((id) => searchParams.append('category_id[]', id))
    searchParams.set('fields', '+categories,+images,+variants.prices,+variants.options,+variants.calculated_price,+variants.inventory_quantity')

    const qs = searchParams.toString()
    return medusaFetch<ProductListResponse>(`/store/products${qs ? `?${qs}` : ''}`)
}

export async function getProduct(handle: string): Promise<MedusaProduct | null> {
    try {
        const res = await medusaFetch<{ products: MedusaProduct[] }>(
            `/store/products?handle=${handle}&fields=+categories,+images,+variants.prices,+variants.options,+variants.calculated_price,+variants.inventory_quantity`
        )
        return res.products[0] ?? null
    } catch {
        return null
    }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<MedusaCategory[]> {
    try {
        const res = await medusaFetch<{ product_categories: MedusaCategory[] }>(
            '/store/product-categories?include_descendants_tree=true'
        )
        return res.product_categories
    } catch {
        return []
    }
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export async function createCart(): Promise<MedusaCart> {
    const res = await medusaFetch<{ cart: MedusaCart }>('/store/carts', {
        method: 'POST',
        body: JSON.stringify({}),
    })
    return res.cart
}

export async function getCart(cartId: string): Promise<MedusaCart | null> {
    try {
        const res = await medusaFetch<{ cart: MedusaCart }>(`/store/carts/${cartId}`)
        return res.cart
    } catch {
        return null
    }
}

export async function addToCart(
    cartId: string,
    variantId: string,
    quantity: number = 1
): Promise<MedusaCart> {
    const res = await medusaFetch<{ cart: MedusaCart }>(
        `/store/carts/${cartId}/line-items`,
        {
            method: 'POST',
            body: JSON.stringify({ variant_id: variantId, quantity }),
        }
    )
    return res.cart
}

export async function updateCartItem(
    cartId: string,
    lineItemId: string,
    quantity: number
): Promise<MedusaCart> {
    const res = await medusaFetch<{ cart: MedusaCart }>(
        `/store/carts/${cartId}/line-items/${lineItemId}`,
        {
            method: 'POST',
            body: JSON.stringify({ quantity }),
        }
    )
    return res.cart
}

export async function removeFromCart(
    cartId: string,
    lineItemId: string
): Promise<MedusaCart> {
    const res = await medusaFetch<{ cart: MedusaCart }>(
        `/store/carts/${cartId}/line-items/${lineItemId}`,
        { method: 'DELETE' }
    )
    return res.cart
}

// ---------------------------------------------------------------------------
// Address types
// ---------------------------------------------------------------------------

export interface MedusaAddress {
    id: string
    first_name: string | null
    last_name: string | null
    company: string | null
    address_1: string | null
    address_2: string | null
    city: string | null
    province: string | null
    postal_code: string | null
    country_code: string | null
    phone: string | null
    metadata: Record<string, unknown> | null
    is_default_shipping: boolean
    is_default_billing: boolean
}

// ---------------------------------------------------------------------------
// Order types
// ---------------------------------------------------------------------------

export interface MedusaOrderItem {
    id: string
    title: string
    thumbnail: string | null
    variant_title: string | null
    variant_sku: string | null
    quantity: number
    unit_price: number
    total: number
    product_id: string | null
}

export interface MedusaFulfillment {
    id: string
    tracking_numbers: string[]
    created_at: string
}

export interface MedusaPayment {
    id: string
    provider_id: string
    amount: number
    currency_code: string
}

export interface MedusaOrder {
    id: string
    display_id: number
    status: string
    fulfillment_status: string
    payment_status: string
    items: MedusaOrderItem[]
    shipping_address: MedusaAddress | null
    billing_address: MedusaAddress | null
    fulfillments: MedusaFulfillment[]
    payments: MedusaPayment[]
    total: number
    subtotal: number
    tax_total: number
    shipping_total: number
    discount_total: number
    currency_code: string
    email: string | null
    created_at: string
    updated_at: string
    metadata: Record<string, unknown> | null
}

// ---------------------------------------------------------------------------
// Orders (Store API — requires auth cookie)
// ---------------------------------------------------------------------------

interface OrderListResponse {
    orders: MedusaOrder[]
    count: number
    offset: number
    limit: number
}

export async function getCustomerOrders(params?: {
    limit?: number
    offset?: number
}): Promise<OrderListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.offset) searchParams.set('offset', String(params.offset))
    searchParams.set('order', '-created_at')
    searchParams.set('fields', '+items,+shipping_address,+fulfillments,+payments')

    const qs = searchParams.toString()
    try {
        return await medusaFetch<OrderListResponse>(
            `/store/orders${qs ? `?${qs}` : ''}`
        )
    } catch {
        return { orders: [], count: 0, offset: 0, limit: params?.limit ?? 10 }
    }
}

export async function getOrder(id: string): Promise<MedusaOrder | null> {
    try {
        const res = await medusaFetch<{ order: MedusaOrder }>(
            `/store/orders/${id}?fields=+items,+shipping_address,+billing_address,+fulfillments,+payments`
        )
        return res.order
    } catch {
        return null
    }
}

// ---------------------------------------------------------------------------
// Customer Addresses (Store API — requires auth cookie)
// ---------------------------------------------------------------------------

export async function getCustomerAddresses(): Promise<MedusaAddress[]> {
    try {
        const res = await medusaFetch<{ addresses: MedusaAddress[] }>(
            '/store/customers/me/addresses'
        )
        return res.addresses
    } catch {
        return []
    }
}

export async function createAddress(
    data: Omit<MedusaAddress, 'id' | 'metadata' | 'is_default_shipping' | 'is_default_billing'>
): Promise<MedusaAddress> {
    const res = await medusaFetch<{ customer: { addresses: MedusaAddress[] } }>(
        '/store/customers/me/addresses',
        {
            method: 'POST',
            body: JSON.stringify(data),
        }
    )
    // The last address in the array is typically the newly created one
    const addrs = res.customer?.addresses ?? []
    return addrs[addrs.length - 1]
}

export async function updateAddress(
    addressId: string,
    data: Partial<Omit<MedusaAddress, 'id' | 'metadata'>>
): Promise<MedusaAddress> {
    const res = await medusaFetch<{ customer: { addresses: MedusaAddress[] } }>(
        `/store/customers/me/addresses/${addressId}`,
        {
            method: 'POST',
            body: JSON.stringify(data),
        }
    )
    const addrs = res.customer?.addresses ?? []
    return addrs.find((a) => a.id === addressId) ?? addrs[0]
}

export async function deleteAddress(addressId: string): Promise<void> {
    await medusaFetch<unknown>(
        `/store/customers/me/addresses/${addressId}`,
        { method: 'DELETE' }
    )
}

// ---------------------------------------------------------------------------
// Returns (Medusa Store API)
// ---------------------------------------------------------------------------

export interface StoreReturn {
    id: string
    order_id: string
    status: string
    refund_amount: number
    created_at: string
    items: {
        id: string
        item_id: string
        quantity: number
        reason_id: string | null
        note: string | null
    }[]
}

export async function createStoreReturn(
    orderId: string,
    items: { item_id: string; quantity: number; reason_id?: string; note?: string }[]
): Promise<StoreReturn> {
    const res = await medusaFetch<{ return: StoreReturn }>('/store/returns', {
        method: 'POST',
        body: JSON.stringify({
            order_id: orderId,
            items,
        }),
    })
    return res.return
}

export async function getStoreReturns(orderId?: string): Promise<StoreReturn[]> {
    const query = orderId ? `?order_id=${orderId}` : ''
    const res = await medusaFetch<{ returns: StoreReturn[] }>(`/store/returns${query}`)
    return res.returns ?? []
}
