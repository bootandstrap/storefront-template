/**
 * Medusa Admin API — Promotions Domain
 *
 * Functions for managing discounts, coupons, and promotions.
 * Used by the owner panel promotion management page.
 */
import { adminFetch, normalizeAdminListParams } from './admin-core'
import type { TenantMedusaScope } from './admin-core'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminPromotion {
    id: string
    code: string
    is_dynamic: boolean
    is_disabled: boolean
    type: 'percentage' | 'fixed' | 'free_shipping'
    value: number
    starts_at: string | null
    ends_at: string | null
    usage_limit: number | null
    usage_count: number
    created_at: string
    updated_at: string
    metadata: Record<string, unknown> | null
}

export interface CreatePromotionInput {
    code: string
    type: 'percentage' | 'fixed' | 'free_shipping'
    value: number
    starts_at?: string
    ends_at?: string
    usage_limit?: number
    is_dynamic?: boolean
    metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Promotion CRUD
// ---------------------------------------------------------------------------

export async function getPromotions(params?: {
    limit?: number
    offset?: number
    q?: string
    is_disabled?: boolean
}, scope?: TenantMedusaScope | null): Promise<{ promotions: AdminPromotion[]; count: number }> {
    const normalized = normalizeAdminListParams({
        limit: params?.limit ?? 50,
        offset: params?.offset,
    })
    const searchParams = new URLSearchParams({
        limit: String(normalized.limit),
        offset: String(normalized.offset),
        order: '-created_at',
    })
    if (params?.q) searchParams.set('q', params.q)

    const res = await adminFetch<{ promotions: AdminPromotion[]; count: number }>(
        `/admin/promotions?${searchParams.toString()}`,
        {},
        scope
    )
    return {
        promotions: res.data?.promotions ?? [],
        count: res.data?.count ?? 0,
    }
}

export async function getPromotion(
    id: string,
    scope?: TenantMedusaScope | null
): Promise<AdminPromotion | null> {
    const res = await adminFetch<{ promotion: AdminPromotion }>(
        `/admin/promotions/${id}`,
        {},
        scope
    )
    return res.data?.promotion ?? null
}

export async function createPromotion(
    data: CreatePromotionInput,
    scope?: TenantMedusaScope | null
): Promise<{ promotion: AdminPromotion | null; error: string | null }> {
    const res = await adminFetch<{ promotion: AdminPromotion }>(
        '/admin/promotions',
        { method: 'POST', body: JSON.stringify(data) },
        scope
    )
    return { promotion: res.data?.promotion ?? null, error: res.error }
}

export async function updatePromotion(
    id: string,
    data: Partial<CreatePromotionInput> & { is_disabled?: boolean },
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(
        `/admin/promotions/${id}`,
        { method: 'POST', body: JSON.stringify(data) },
        scope
    )
    return { error: res.error }
}

export async function deletePromotion(
    id: string,
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(
        `/admin/promotions/${id}`,
        { method: 'DELETE' },
        scope
    )
    return { error: res.error }
}
