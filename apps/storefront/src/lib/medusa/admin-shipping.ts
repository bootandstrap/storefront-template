/**
 * Medusa Admin API — Shipping Domain
 *
 * Functions for shipping option management, shipping profiles,
 * and fulfillment provider configuration.
 * Used by the owner panel shipping settings page.
 */
import { adminFetch, normalizeAdminListParams } from './admin-core'
import type { TenantMedusaScope } from './admin-core'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShippingOption {
    id: string
    name: string
    region_id: string
    profile_id: string
    provider_id: string
    price_type: 'flat_rate' | 'calculated'
    amount: number | null
    is_return: boolean
    data: Record<string, unknown>
    metadata: Record<string, unknown> | null
    created_at: string
    updated_at: string
}

export interface ShippingProfile {
    id: string
    name: string
    type: 'default' | 'gift_card' | 'custom'
    created_at: string
}

export interface FulfillmentProvider {
    id: string
    is_installed: boolean
}

export interface Region {
    id: string
    name: string
    currency_code: string
    tax_rate: number
    countries: { iso_2: string; display_name: string }[]
}

export interface CreateShippingOptionInput {
    name: string
    region_id: string
    profile_id: string
    provider_id: string
    price_type: 'flat_rate' | 'calculated'
    amount?: number
    data?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Shipping Options CRUD
// ---------------------------------------------------------------------------

export async function getShippingOptions(params?: {
    region_id?: string
    limit?: number
}, scope?: TenantMedusaScope | null): Promise<{ shipping_options: ShippingOption[]; count: number }> {
    const normalized = normalizeAdminListParams({ limit: params?.limit ?? 50 })
    const searchParams = new URLSearchParams({
        limit: String(normalized.limit),
    })
    if (params?.region_id) searchParams.set('region_id', params.region_id)

    const res = await adminFetch<{ shipping_options: ShippingOption[]; count: number }>(
        `/admin/shipping-options?${searchParams.toString()}`,
        {},
        scope
    )
    return {
        shipping_options: res.data?.shipping_options ?? [],
        count: res.data?.count ?? 0,
    }
}

export async function createShippingOption(
    data: CreateShippingOptionInput,
    scope?: TenantMedusaScope | null
): Promise<{ shipping_option: ShippingOption | null; error: string | null }> {
    const res = await adminFetch<{ shipping_option: ShippingOption }>(
        '/admin/shipping-options',
        { method: 'POST', body: JSON.stringify(data) },
        scope
    )
    return { shipping_option: res.data?.shipping_option ?? null, error: res.error }
}

export async function updateShippingOption(
    id: string,
    data: Partial<CreateShippingOptionInput>,
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(
        `/admin/shipping-options/${id}`,
        { method: 'POST', body: JSON.stringify(data) },
        scope
    )
    return { error: res.error }
}

export async function deleteShippingOption(
    id: string,
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(
        `/admin/shipping-options/${id}`,
        { method: 'DELETE' },
        scope
    )
    return { error: res.error }
}

// ---------------------------------------------------------------------------
// Shipping Profiles
// ---------------------------------------------------------------------------

export async function getShippingProfiles(
    scope?: TenantMedusaScope | null
): Promise<ShippingProfile[]> {
    const res = await adminFetch<{ shipping_profiles: ShippingProfile[] }>(
        '/admin/shipping-profiles?limit=20',
        {},
        scope
    )
    return res.data?.shipping_profiles ?? []
}

// ---------------------------------------------------------------------------
// Fulfillment Providers
// ---------------------------------------------------------------------------

export async function getFulfillmentProviders(
    scope?: TenantMedusaScope | null
): Promise<FulfillmentProvider[]> {
    const res = await adminFetch<{ fulfillment_providers: FulfillmentProvider[] }>(
        '/admin/fulfillment-providers',
        {},
        scope
    )
    return res.data?.fulfillment_providers ?? []
}

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

export async function getRegions(
    scope?: TenantMedusaScope | null
): Promise<Region[]> {
    const res = await adminFetch<{ regions: Region[] }>(
        '/admin/regions?limit=50&fields=*countries',
        {},
        scope
    )
    return res.data?.regions ?? []
}

export async function updateRegion(
    regionId: string,
    data: {
        name?: string
        currency_code?: string
        tax_rate?: number
        countries?: string[]
    },
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(
        `/admin/regions/${regionId}`,
        { method: 'POST', body: JSON.stringify(data) },
        scope
    )
    return { error: res.error }
}

// ---------------------------------------------------------------------------
// Tax Configuration
// ---------------------------------------------------------------------------

export async function getTaxRatesForRegion(
    regionId: string,
    scope?: TenantMedusaScope | null
): Promise<{ id: string; name: string; rate: number }[]> {
    const res = await adminFetch<{ tax_rates: { id: string; name: string; rate: number }[] }>(
        `/admin/tax-rates?region_id=${regionId}`,
        {},
        scope
    )
    return res.data?.tax_rates ?? []
}

// ---------------------------------------------------------------------------
// Store Settings
// ---------------------------------------------------------------------------

/**
 * Medusa v2: `/admin/stores` (plural). Returns `{stores: [...]}`.
 */
export async function getStoreSettings(
    scope?: TenantMedusaScope | null
): Promise<{
    id: string
    name: string
    default_currency_code: string
    currencies: string[]
    metadata: Record<string, unknown> | null
} | null> {
    const res = await adminFetch<{
        stores: {
            id: string
            name: string
            default_currency_code: string
            supported_currencies?: { currency_code: string }[]
            currencies?: string[]
            metadata: Record<string, unknown> | null
        }[]
    }>('/admin/stores', {}, scope)

    const store = res.data?.stores?.[0]
    if (!store) return null

    // v2 uses `supported_currencies` array of objects; normalize to string[]
    const currencies = store.currencies
        ?? store.supported_currencies?.map(c => c.currency_code)
        ?? []

    return {
        id: store.id,
        name: store.name,
        default_currency_code: store.default_currency_code,
        currencies,
        metadata: store.metadata,
    }
}

/**
 * Medusa v2: `/admin/stores/{id}` (requires store ID).
 * Fetches store ID first, then applies update.
 */
export async function updateStoreSettings(
    data: {
        name?: string
        default_currency_code?: string
        currencies?: string[]
        metadata?: Record<string, unknown>
    },
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    // First, get the store ID
    const store = await getStoreSettings(scope)
    if (!store) return { error: 'Store not found' }

    const res = await adminFetch(`/admin/stores/${store.id}`, {
        method: 'POST',
        body: JSON.stringify(data),
    }, scope)
    return { error: res.error }
}
