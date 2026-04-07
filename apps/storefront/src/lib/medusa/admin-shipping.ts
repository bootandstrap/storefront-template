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
// Types — Medusa v2 Fulfillment Module schema
// ---------------------------------------------------------------------------

export interface ShippingOptionPrice {
    currency_code: string
    amount: number
}

export interface ShippingOption {
    id: string
    name: string
    service_zone_id: string
    shipping_profile_id: string
    provider_id: string
    price_type: 'flat' | 'calculated'
    // v2: prices are an array (multi-currency support)
    prices: ShippingOptionPrice[]
    type: { label: string; code: string; description?: string }
    rules: { attribute: string; operator: string; value: string }[]
    is_return: boolean
    data: Record<string, unknown> | null
    metadata: Record<string, unknown> | null
    service_zone?: {
        id: string
        name: string
        fulfillment_set?: { type: string }
    }
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

// v2: Region no longer has `tax_rate` — taxes are decoupled into Tax Module
export interface Region {
    id: string
    name: string
    currency_code: string
    countries: { iso_2: string; display_name: string }[]
    automatic_taxes?: boolean
    payment_providers?: { id: string }[]
}

export interface TaxRegion {
    id: string
    country_code: string
    province_code?: string
    parent_id?: string
}

export interface TaxRate {
    id: string
    name: string | null
    rate: number
    code: string | null
    tax_region_id: string
    is_default: boolean
}

export interface CreateShippingOptionInput {
    name: string
    service_zone_id: string
    shipping_profile_id: string
    provider_id: string
    price_type: 'flat' | 'calculated'
    type: { label: string; code: string; description?: string }
    prices: ShippingOptionPrice[]
    rules?: { attribute: string; operator: string; value: string }[]
    data?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Shipping Options CRUD
// ---------------------------------------------------------------------------

export async function getShippingOptions(params?: {
    stock_location_id?: string
    limit?: number
}, scope?: TenantMedusaScope | null): Promise<{ shipping_options: ShippingOption[]; count: number }> {
    const normalized = normalizeAdminListParams({ limit: params?.limit ?? 50 })
    const searchParams = new URLSearchParams({
        limit: String(normalized.limit),
        // v2: expand service_zone and prices relations
        fields: '*service_zone,*prices',
    })
    if (params?.stock_location_id) searchParams.set('stock_location_id', params.stock_location_id)

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
        // v2: tax_rate removed — taxes managed via Tax Module
        countries?: string[]
        automatic_taxes?: boolean
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

/**
 * Get tax rates for a region.
 * v2: Tax rates are decoupled from regions. Uses Tax Module:
 *   1. Find tax regions matching the region's countries
 *   2. Get tax rates for those tax regions
 */
export async function getTaxRatesForRegion(
    regionId: string,
    scope?: TenantMedusaScope | null
): Promise<TaxRate[]> {
    // Step 1: Get the region to find its country codes
    const regionRes = await adminFetch<{ region: Region }>(
        `/admin/regions/${regionId}?fields=*countries`,
        {},
        scope
    )
    const countryCodes = regionRes.data?.region?.countries?.map(c => c.iso_2) ?? []
    if (countryCodes.length === 0) return []

    // Step 2: Find tax regions for the first country (primary)
    const taxRegionRes = await adminFetch<{ tax_regions: TaxRegion[] }>(
        `/admin/tax-regions?country_code=${countryCodes[0]}`,
        {},
        scope
    )
    const taxRegions = taxRegionRes.data?.tax_regions ?? []
    if (taxRegions.length === 0) return []

    // Step 3: Get tax rates for the tax region
    const taxRateRes = await adminFetch<{ tax_rates: TaxRate[] }>(
        `/admin/tax-rates?tax_region_id=${taxRegions[0].id}`,
        {},
        scope
    )
    return taxRateRes.data?.tax_rates ?? []
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
