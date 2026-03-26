/**
 * Medusa Admin API — Operations (Returns, Shipping, Refunds)
 */
import { adminFetch, normalizeAdminListParams } from './admin-core'
import type { TenantMedusaScope, AdminListParams } from './admin-core'

// ---------------------------------------------------------------------------
// Returns
// ---------------------------------------------------------------------------

export interface AdminReturn {
    id: string
    order_id: string
    status: string
    refund_amount: number
    created_at: string
    received_at: string | null
    items: {
        id: string
        item_id: string
        quantity: number
        reason_id: string | null
        note: string | null
    }[]
    order?: {
        id: string
        display_id: number
        email: string | null
        currency_code: string
    }
}

export async function getAdminReturns(
    params?: AdminListParams,
    scope?: TenantMedusaScope | null
): Promise<{ returns: AdminReturn[]; count: number }> {
    const { limit, offset } = normalizeAdminListParams(params)
    const res = await adminFetch<{ returns: AdminReturn[]; count: number }>(
        `/admin/returns?limit=${limit}&offset=${offset}&order=-created_at&fields=*order`,
        {},
        scope
    )
    return {
        returns: res.data?.returns ?? [],
        count: res.data?.count ?? 0,
    }
}

export async function receiveAdminReturn(
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

/**
 * Cancel a return request.
 *
 * Note: `/admin/returns/{id}/cancel` may not be available in all Medusa v2 versions.
 * When 404, returns a descriptive error instead of a generic one.
 */
export async function cancelAdminReturn(
    returnId: string,
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/returns/${returnId}/cancel`, {
        method: 'POST',
    }, scope)

    // Provide a user-friendly message when the endpoint doesn't exist in v2
    if (res.error?.includes('404') || res.error?.includes('Cannot POST')) {
        return {
            error: 'Return cancellation is not supported in this version of Medusa. Please manage this return manually.',
        }
    }

    return { error: res.error }
}

// ---------------------------------------------------------------------------
// Shipping Options
// ---------------------------------------------------------------------------

export interface AdminShippingOption {
    id: string
    name: string
    price_type: 'flat' | 'calculated'
    amount: number | null
    provider_id: string
    is_return: boolean
    data: Record<string, unknown> | null
    metadata: Record<string, unknown> | null
    prices: { id: string; amount: number; currency_code: string; region_id?: string }[]
    rules: { attribute: string; value: string; operator: string }[]
    type: { label: string; description: string; code: string } | null
    service_zone?: { id: string; name: string } | null
}

export async function getAdminShippingOptions(
    scope?: TenantMedusaScope | null
): Promise<{ shipping_options: AdminShippingOption[] }> {
    const res = await adminFetch<{ shipping_options: AdminShippingOption[] }>(
        '/admin/shipping-options?fields=*prices,*rules,*type,*service_zone&limit=50',
        {},
        scope
    )
    const options = (res.data?.shipping_options ?? []).filter(o => !o.is_return)
    return { shipping_options: options }
}

export async function updateAdminShippingOption(
    optionId: string,
    data: {
        name?: string
        prices?: { amount: number; currency_code: string; region_id?: string }[]
        rules?: { attribute: string; value: string; operator: string }[]
        metadata?: Record<string, unknown>
    },
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/shipping-options/${optionId}`, {
        method: 'POST',
        body: JSON.stringify(data),
    }, scope)
    return { error: res.error }
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

export async function createAdminRefund(
    paymentId: string,
    amount: number,
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(`/admin/payments/${paymentId}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
    }, scope)
    return { error: res.error }
}
