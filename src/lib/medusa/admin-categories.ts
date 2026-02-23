/**
 * Medusa Admin API — Categories Domain
 */
import { adminFetch, normalizeAdminListParams } from './admin-core'
import type { TenantMedusaScope } from './admin-core'

// ---------------------------------------------------------------------------
// Types
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

export interface CreateCategoryInput {
    name: string
    handle?: string
    description?: string
    is_active?: boolean
    is_internal?: boolean
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function getAdminCategories(params?: {
    limit?: number
    offset?: number
}, scope?: TenantMedusaScope | null): Promise<{ product_categories: AdminCategory[]; count: number }> {
    const normalized = normalizeAdminListParams({
        limit: params?.limit ?? 50,
        offset: params?.offset,
    })
    const res = await adminFetch<{ product_categories: AdminCategory[]; count: number }>(
        `/admin/product-categories?limit=${normalized.limit}&offset=${normalized.offset}&fields=id,name,handle,description,is_active,is_internal,rank,parent_category,category_children,created_at,updated_at&order=name`,
        {},
        scope
    )
    return {
        product_categories: res.data?.product_categories ?? [],
        count: res.data?.count ?? 0,
    }
}

export async function createAdminCategory(
    data: CreateCategoryInput,
    scope?: TenantMedusaScope | null
): Promise<{ category: AdminCategory | null; error: string | null }> {
    const res = await adminFetch<{ product_category: AdminCategory }>('/admin/product-categories', {
        method: 'POST',
        body: JSON.stringify(data),
    }, scope)
    return { category: res.data?.product_category ?? null, error: res.error }
}

export async function updateAdminCategory(
    id: string,
    data: Partial<CreateCategoryInput>,
    scope?: TenantMedusaScope | null
): Promise<{ category: AdminCategory | null; error: string | null }> {
    const res = await adminFetch<{ product_category: AdminCategory }>(`/admin/product-categories/${id}`, {
        method: 'POST',
        body: JSON.stringify(data),
    }, scope)
    return { category: res.data?.product_category ?? null, error: res.error }
}

export async function deleteAdminCategory(id: string, scope?: TenantMedusaScope | null): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/product-categories/${id}`, { method: 'DELETE' }, scope)
    return { error: res.error }
}
