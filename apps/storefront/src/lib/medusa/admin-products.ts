/**
 * Medusa Admin API — Products Domain
 */
import { adminFetch, normalizeAdminListParams } from './admin-core'
import type { TenantMedusaScope } from './admin-core'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminProductSummary {
    id: string
    title: string
    handle: string
    thumbnail: string | null
    status: string
    metadata: Record<string, unknown> | null
}

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

export interface CreateProductInput {
    title: string
    description?: string
    status?: 'draft' | 'published'
    categories?: { id: string }[]
    variants?: {
        title: string
        prices: { amount: number; currency_code: string }[]
        manage_inventory?: boolean
        inventory_quantity?: number
    }[]
}

// ---------------------------------------------------------------------------
// Metadata update (badges)
// ---------------------------------------------------------------------------

export async function updateProductMetadata(
    productId: string,
    metadata: Record<string, unknown>,
    scope?: TenantMedusaScope | null
): Promise<boolean> {
    const res = await adminFetch(`/admin/products/${productId}`, {
        method: 'POST',
        body: JSON.stringify({ metadata }),
    }, scope)
    return res.error === null
}

// ---------------------------------------------------------------------------
// Product list (lightweight — badges page)
// ---------------------------------------------------------------------------

export async function getAdminProducts(params?: {
    limit?: number
    offset?: number
}, scope?: TenantMedusaScope | null): Promise<{ products: AdminProductSummary[]; count: number }> {
    const normalized = normalizeAdminListParams({
        limit: params?.limit ?? 50,
        offset: params?.offset,
    })
    const res = await adminFetch<{
        products: AdminProductSummary[]
        count: number
    }>(`/admin/products?limit=${normalized.limit}&offset=${normalized.offset}&fields=id,title,handle,thumbnail,status,metadata&order=title`, {}, scope)

    return {
        products: res.data?.products ?? [],
        count: res.data?.count ?? 0,
    }
}

// ---------------------------------------------------------------------------
// Product CRUD (full — Owner Panel)
// ---------------------------------------------------------------------------

export async function getAdminProductsFull(params?: {
    limit?: number
    offset?: number
    status?: string
    q?: string
}, scope?: TenantMedusaScope | null): Promise<{ products: AdminProductFull[]; count: number }> {
    const normalized = normalizeAdminListParams({
        limit: params?.limit,
        offset: params?.offset,
        status: params?.status,
        q: params?.q,
    })
    const searchParams = new URLSearchParams({
        limit: String(normalized.limit),
        offset: String(normalized.offset),
        order: '-created_at',
    })
    if (normalized.status && normalized.status !== 'all') {
        searchParams.set('status', normalized.status)
    }
    if (normalized.q) {
        searchParams.set('q', normalized.q)
    }
    searchParams.set('fields', 'id,title,handle,description,subtitle,thumbnail,status,created_at,updated_at,metadata,*categories,*variants,*variants.prices,*images')

    const res = await adminFetch<{ products: AdminProductFull[]; count: number }>(
        `/admin/products?${searchParams.toString()}`,
        {},
        scope
    )
    return {
        products: res.data?.products ?? [],
        count: res.data?.count ?? 0,
    }
}

export async function getAdminProduct(id: string, scope?: TenantMedusaScope | null): Promise<AdminProductFull | null> {
    const res = await adminFetch<{ product: AdminProductFull }>(
        `/admin/products/${id}?fields=id,title,handle,description,subtitle,thumbnail,status,created_at,updated_at,metadata,*categories,*variants,*variants.prices,*images`,
        {},
        scope
    )
    return res.data?.product ?? null
}

export async function createAdminProduct(
    data: CreateProductInput,
    scope?: TenantMedusaScope | null
): Promise<{ product: AdminProductFull | null; error: string | null }> {
    const res = await adminFetch<{ product: AdminProductFull }>('/admin/products', {
        method: 'POST',
        body: JSON.stringify(data),
    }, scope)
    return { product: res.data?.product ?? null, error: res.error }
}

export async function updateAdminProduct(
    id: string,
    data: Partial<CreateProductInput>,
    scope?: TenantMedusaScope | null
): Promise<{ product: AdminProductFull | null; error: string | null }> {
    const res = await adminFetch<{ product: AdminProductFull }>(`/admin/products/${id}`, {
        method: 'POST',
        body: JSON.stringify(data),
    }, scope)
    return { product: res.data?.product ?? null, error: res.error }
}

export async function deleteAdminProduct(id: string, scope?: TenantMedusaScope | null): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/products/${id}`, { method: 'DELETE' }, scope)
    return { error: res.error }
}

// ---------------------------------------------------------------------------
// Product Images
// ---------------------------------------------------------------------------

export async function updateProductImages(
    productId: string,
    images: { url: string }[],
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/products/${productId}`, {
        method: 'POST',
        body: JSON.stringify({ images }),
    }, scope)
    return { error: res.error }
}

export async function deleteProductImage(
    productId: string,
    imageUrl: string,
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const product = await getAdminProduct(productId, scope)
    if (!product) return { error: 'Product not found' }

    const updatedImages = (product.images ?? [])
        .filter(img => img.url !== imageUrl)
        .map(img => ({ url: img.url }))

    return updateProductImages(productId, updatedImages, scope)
}

// ---------------------------------------------------------------------------
// Variant Prices
// ---------------------------------------------------------------------------

export async function updateVariantPrices(
    productId: string,
    variantId: string,
    prices: { amount: number; currency_code: string }[],
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/products/${productId}/variants/${variantId}`, {
        method: 'POST',
        body: JSON.stringify({ prices }),
    }, scope)
    return { error: res.error }
}

// ---------------------------------------------------------------------------
// Variant Inventory
// ---------------------------------------------------------------------------

export async function updateVariantInventory(
    productId: string,
    variantId: string,
    data: { manage_inventory?: boolean; inventory_quantity?: number },
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/products/${productId}/variants/${variantId}`, {
        method: 'POST',
        body: JSON.stringify(data),
    }, scope)
    return { error: res.error }
}
