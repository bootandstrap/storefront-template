/**
 * Authenticated Medusa API fetcher.
 *
 * Reads the Supabase session from cookies (server-side),
 * extracts the access_token, and passes it as a Bearer token
 * to the Medusa Store API for customer-scoped endpoints.
 *
 * Flow:
 * 1. Server component calls `authenticatedMedusaFetch(path)`
 * 2. This helper reads the Supabase session via `createClient()`
 * 3. Extracts `access_token` from Supabase session
 * 4. Sends it as `Authorization: Bearer <token>` to Medusa
 * 5. Medusa's supabase-auth module validates the JWT
 */

import { createClient } from '@/lib/supabase/server'

const MEDUSA_BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''

// ---------------------------------------------------------------------------
// Get Supabase access token from server-side session
// ---------------------------------------------------------------------------

async function getSupabaseAccessToken(): Promise<string | null> {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()
        return session?.access_token ?? null
    } catch {
        return null
    }
}

// ---------------------------------------------------------------------------
// Authenticated fetch with retry
// ---------------------------------------------------------------------------

export async function authenticatedMedusaFetch<T>(
    path: string,
    options?: RequestInit & { timeout?: number }
): Promise<T> {
    const { timeout = 5000, ...fetchOptions } = options ?? {}
    const url = `${MEDUSA_BACKEND_URL}${path}`

    // Get Supabase JWT for auth
    const token = await getSupabaseAccessToken()

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(PUBLISHABLE_KEY && { 'x-publishable-api-key': PUBLISHABLE_KEY }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...fetchOptions.headers,
    }

    const attempt = async (signal?: AbortSignal): Promise<T> => {
        const res = await fetch(url, { ...fetchOptions, headers, signal })
        if (!res.ok) {
            const err = new Error(`Medusa ${res.status}: ${path}`)
                ; (err as Error & { status: number }).status = res.status
            throw err
        }
        return res.json()
    }

    // First attempt with timeout
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
        return await attempt(controller.signal)
    } catch (firstErr) {
        // Don't retry auth errors — 401 means no Medusa customer, retrying won't help
        if ((firstErr as Error & { status?: number }).status === 401) {
            throw firstErr
        }
        // Retry once with doubled timeout for transient errors
        const retryController = new AbortController()
        const retryTimer = setTimeout(() => retryController.abort(), timeout * 2)
        try {
            return await attempt(retryController.signal)
        } catch (retryErr) {
            console.error(`[medusa:auth] ${path} failed after retry`, retryErr)
            throw retryErr
        } finally {
            clearTimeout(retryTimer)
        }
    } finally {
        clearTimeout(timer)
    }
}

// ---------------------------------------------------------------------------
// Authenticated order fetchers
// ---------------------------------------------------------------------------

import type { MedusaOrder, MedusaAddress } from './client'

interface AuthOrderListResponse {
    orders: MedusaOrder[]
    count: number
    offset: number
    limit: number
}

export async function getAuthCustomerOrders(params?: {
    limit?: number
    offset?: number
}): Promise<AuthOrderListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.offset) searchParams.set('offset', String(params.offset))
    searchParams.set('order', '-created_at')
    // v2: Use *payment_collections.payments for payment data (matches official Medusa starter)
    searchParams.set('fields', '*payment_collections.payments,*items,*items.variant,*items.product,+shipping_address,+fulfillments')

    const qs = searchParams.toString()
    try {
        return await authenticatedMedusaFetch<AuthOrderListResponse>(
            `/store/orders${qs ? `?${qs}` : ''}`
        )
    } catch {
        return { orders: [], count: 0, offset: 0, limit: params?.limit ?? 10 }
    }
}

export async function getAuthOrder(id: string): Promise<MedusaOrder | null> {
    try {
        // v2: Use *payment_collections.payments (matches official Medusa starter)
        const res = await authenticatedMedusaFetch<{ order: MedusaOrder }>(
            `/store/orders/${id}?fields=*payment_collections.payments,*items,*items.variant,*items.product,+shipping_address,+billing_address,+fulfillments`
        )
        // Flatten payment_collections into payments for backward compat
        const order = res.order
        if (order?.payment_collections?.length && (!order.payments || order.payments.length === 0)) {
            order.payments = order.payment_collections.flatMap(pc => (pc as any).payments ?? [])
        }
        return order
    } catch {
        return null
    }
}

// ---------------------------------------------------------------------------
// Authenticated address fetchers
// ---------------------------------------------------------------------------

export async function getAuthCustomerAddresses(): Promise<MedusaAddress[]> {
    try {
        const res = await authenticatedMedusaFetch<{ addresses: MedusaAddress[] }>(
            '/store/customers/me/addresses'
        )
        return res.addresses
    } catch {
        return []
    }
}

export async function createAuthAddress(
    data: Omit<MedusaAddress, 'id' | 'metadata' | 'is_default_shipping' | 'is_default_billing'>
): Promise<MedusaAddress> {
    const res = await authenticatedMedusaFetch<{ customer: { addresses: MedusaAddress[] } }>(
        '/store/customers/me/addresses',
        {
            method: 'POST',
            body: JSON.stringify(data),
        }
    )
    const addrs = res.customer?.addresses ?? []
    return addrs[addrs.length - 1]
}

export async function updateAuthAddress(
    addressId: string,
    data: Partial<Omit<MedusaAddress, 'id' | 'metadata'>>
): Promise<MedusaAddress> {
    const res = await authenticatedMedusaFetch<{ customer: { addresses: MedusaAddress[] } }>(
        `/store/customers/me/addresses/${addressId}`,
        {
            method: 'POST',
            body: JSON.stringify(data),
        }
    )
    const addrs = res.customer?.addresses ?? []
    return addrs.find((a) => a.id === addressId) ?? addrs[0]
}

export async function deleteAuthAddress(addressId: string): Promise<void> {
    await authenticatedMedusaFetch<unknown>(
        `/store/customers/me/addresses/${addressId}`,
        { method: 'DELETE' }
    )
}
