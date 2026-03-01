/**
 * Medusa Admin Setup — Shipping & Tax Configuration
 *
 * Provides helpers to configure shipping options and tax regions
 * via the Medusa Admin API. Used during tenant provisioning to set up
 * the commerce foundation after deploying a new Medusa instance.
 *
 * Uses adminFetch() from admin-core for authenticated requests.
 *
 * @module lib/medusa/admin-setup
 */

import { adminFetch } from './admin-core'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShippingOptionConfig {
    name: string
    amount: number
    /** e.g. 'manual' for manual fulfillment */
    provider_id?: string
    price_type?: string
    metadata?: Record<string, string>
}

interface TaxRegionConfig {
    country_code: string
    /** Default tax rate as percentage (e.g. 21 for 21%) */
    default_tax_rate: number
    rate_name?: string
}

// ---------------------------------------------------------------------------
// Shipping Setup
// ---------------------------------------------------------------------------

/**
 * Creates a default shipping profile and options for a region.
 */
export async function setupShippingOptions(
    regionId: string,
    options: ShippingOptionConfig[] = defaultShippingOptions
): Promise<{ success: boolean; optionIds: string[]; error?: string }> {
    const optionIds: string[] = []

    try {
        // 1. Get or create default shipping profile
        const profileRes = await adminFetch<{ shipping_profiles: { id: string; type: string }[] }>(
            '/admin/shipping-profiles'
        )
        let profileId = profileRes.data?.shipping_profiles?.find(p => p.type === 'default')?.id

        if (!profileId) {
            const createRes = await adminFetch<{ shipping_profile: { id: string } }>(
                '/admin/shipping-profiles',
                {
                    method: 'POST',
                    body: JSON.stringify({ name: 'Default Shipping', type: 'default' }),
                }
            )
            profileId = createRes.data?.shipping_profile?.id
        }

        if (!profileId) {
            return { success: false, optionIds: [], error: 'Failed to get/create shipping profile' }
        }

        // 2. Create shipping options
        for (const opt of options) {
            const res = await adminFetch<{ shipping_option: { id: string } }>(
                '/admin/shipping-options',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        name: opt.name,
                        region_id: regionId,
                        profile_id: profileId,
                        provider_id: opt.provider_id || 'manual',
                        price_type: opt.price_type || 'flat_rate',
                        amount: opt.amount,
                        data: {},
                        metadata: opt.metadata || {},
                    }),
                }
            )
            if (res.data?.shipping_option?.id) {
                optionIds.push(res.data.shipping_option.id)
            } else {
                console.warn(`[SHIPPING] Failed to create option "${opt.name}": ${res.error}`)
            }
        }

        return { success: true, optionIds }
    } catch (e) {
        return { success: false, optionIds, error: e instanceof Error ? e.message : String(e) }
    }
}

// ---------------------------------------------------------------------------
// Tax Setup
// ---------------------------------------------------------------------------

/**
 * Configures tax regions for a Medusa instance.
 */
export async function setupTaxRegions(
    regions: TaxRegionConfig[] = defaultTaxRegions
): Promise<{ success: boolean; error?: string }> {
    try {
        for (const region of regions) {
            const res = await adminFetch<unknown>(
                '/admin/tax-regions',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        country_code: region.country_code,
                        default_tax_rate: {
                            rate: region.default_tax_rate,
                            name: region.rate_name || 'Tax',
                            code: region.country_code.toUpperCase(),
                        },
                    }),
                }
            )
            if (res.error && !res.error.includes('already exists') && !res.error.includes('duplicate')) {
                console.warn(`[TAX] Failed to create region ${region.country_code}: ${res.error}`)
            }
        }
        return { success: true }
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
}

// ---------------------------------------------------------------------------
// Default Configs (European SME focus)
// ---------------------------------------------------------------------------

const defaultShippingOptions: ShippingOptionConfig[] = [
    { name: 'Standard Shipping', amount: 599, metadata: { estimate: '3-5 business days' } },
    { name: 'Express Shipping', amount: 1299, metadata: { estimate: '1-2 business days' } },
]

const defaultTaxRegions: TaxRegionConfig[] = [
    { country_code: 'ch', default_tax_rate: 8.1, rate_name: 'MWST' },
    { country_code: 'es', default_tax_rate: 21, rate_name: 'IVA' },
    { country_code: 'de', default_tax_rate: 19, rate_name: 'MwSt' },
    { country_code: 'fr', default_tax_rate: 20, rate_name: 'TVA' },
    { country_code: 'it', default_tax_rate: 22, rate_name: 'IVA' },
]

/**
 * Full commerce setup — shipping + tax in one call.
 * Call from setupMedusaInstance() in job-queue.ts after Medusa boots.
 */
export async function setupCommerceDefaults(
    regionId: string,
    config?: {
        shipping?: ShippingOptionConfig[]
        tax?: TaxRegionConfig[]
    }
): Promise<{ success: boolean; shippingOptionIds: string[]; errors: string[] }> {
    const errors: string[] = []

    const shippingResult = await setupShippingOptions(regionId, config?.shipping)
    if (!shippingResult.success) errors.push(`Shipping: ${shippingResult.error}`)

    const taxResult = await setupTaxRegions(config?.tax)
    if (!taxResult.success) errors.push(`Tax: ${taxResult.error}`)

    return { success: errors.length === 0, shippingOptionIds: shippingResult.optionIds, errors }
}
