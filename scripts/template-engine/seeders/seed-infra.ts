/**
 * Seeder: Infrastructure
 *
 * Creates the foundational Medusa entities:
 * - Store config
 * - Region with tax rates
 * - Shipping profile + options
 * - Publishable API key
 * - Sales channel association
 */

import { MedusaClient } from '../medusa-client'
import type { IndustryTemplate, LogFn } from '../types'

interface InfraResult {
    regionId: string
    salesChannelId: string
    publishableApiKey: string
    shippingProfileId: string
}

export async function seedInfra(
    client: MedusaClient,
    template: IndustryTemplate,
    log: LogFn
): Promise<InfraResult> {
    log('🏗️', '═══ INFRA SEED START ═══')

    // ── 1) Store ──
    const stores = await client.getStores()
    let storeId = stores[0]?.id
    if (storeId) {
        try {
            await client.request(`/admin/stores/${storeId}`, {
                method: 'POST',
                body: {
                    name: template.governance.storeConfig.business_name,
                    supported_currencies: [
                        { currency_code: template.currency, is_default: true },
                        ...(template.additionalCurrencies ?? []).map(c => ({ currency_code: c, is_default: false })),
                    ],
                },
            })
            log('✅', `Store updated: ${template.governance.storeConfig.business_name}`)
        } catch (err) {
            log('⚠️', `Store update issue: ${err instanceof Error ? err.message : err}`)
        }
    }

    // ── 2) Region ──
    const existingRegions = await client.getRegions()
    let regionId: string

    // Check if region for our currency exists
    const existingRegion = existingRegions.find(r => r.currency_code === template.currency)
    if (existingRegion) {
        regionId = existingRegion.id
        log('✅', `Region exists: ${existingRegion.name} (${template.currency})`)
    } else {
        const regionRes = await client.request<{ region: { id: string } }>('/admin/regions', {
            body: {
                name: template.regionName,
                currency_code: template.currency,
                countries: [template.country],
                automatic_taxes: true,
                payment_providers: ['pp_system_default'],
            },
        })
        regionId = regionRes.region.id
        log('✅', `Region created: ${template.regionName} (${template.currency})`)
    }

    // ── 3) Tax region ──
    try {
        await client.request('/admin/tax-regions', {
            body: {
                country_code: template.country,
                default_tax_rate: {
                    name: 'IVA',
                    rate: 21,
                    code: 'iva',
                },
            },
        })
        log('✅', 'Tax region configured')
    } catch (err) {
        // Tax region may already exist
        log('⏭️', 'Tax region already exists, skipping')
    }

    // ── 4) Sales Channel ──
    const channels = await client.getSalesChannels()
    let salesChannelId = channels[0]?.id ?? ''

    if (!salesChannelId) {
        const scRes = await client.request<{ sales_channel: { id: string } }>('/admin/sales-channels', {
            body: { name: 'Default Sales Channel', description: 'Main storefront' },
        })
        salesChannelId = scRes.sales_channel.id
        log('✅', 'Sales channel created')
    } else {
        log('✅', `Sales channel exists: ${channels[0].name}`)
    }

    // ── 5) Stock Location ──
    const stockLocations = await client.getStockLocations()
    let stockLocationId = stockLocations[0]?.id

    if (!stockLocationId) {
        const slRes = await client.request<{ stock_location: { id: string } }>('/admin/stock-locations', {
            body: {
                name: 'Default Warehouse',
                address: {
                    address_1: 'Warehouse 1',
                    country_code: template.country,
                },
            },
        })
        stockLocationId = slRes.stock_location.id
        log('✅', 'Stock location created')
    } else {
        log('✅', 'Stock location exists')
    }

    // Associate stock location with sales channel + fulfillment set
    try {
        await client.request(`/admin/stock-locations/${stockLocationId}/sales-channels`, {
            body: { add: [salesChannelId] },
        })
    } catch { /* may already be associated */ }

    // ── 6) Fulfillment ──
    // Create fulfillment set + service zone + shipping options
    let shippingProfileId: string = ''

    try {
        // Check if we already have shipping options
        const existingOptions = await client.getShippingOptions()

        if (existingOptions.length === 0) {
            // Create fulfillment set
            const fulfillmentRes = await client.request<{ fulfillment_set: { id: string } }>(
                `/admin/stock-locations/${stockLocationId}/fulfillment-sets`,
                { body: { name: 'Default Set', type: 'shipping' } }
            )

            const fulfillmentSetId = fulfillmentRes.fulfillment_set.id

            // Create service zone
            const zoneRes = await client.request<{ service_zone: { id: string } }>(
                `/admin/fulfillment-sets/${fulfillmentSetId}/service-zones`,
                {
                    body: {
                        name: 'Default Zone',
                        geo_zones: [{ type: 'country', country_code: template.country }],
                    },
                }
            )

            const serviceZoneId = zoneRes.service_zone.id

            // Shipping profiles
            const profileRes = await client.request<{ shipping_profiles: Array<{ id: string }> }>('/admin/shipping-profiles')
            shippingProfileId = profileRes.shipping_profiles?.[0]?.id ?? ''

            if (!shippingProfileId) {
                const pRes = await client.request<{ shipping_profile: { id: string } }>('/admin/shipping-profiles', {
                    body: { name: 'Default', type: 'default' },
                })
                shippingProfileId = pRes.shipping_profile.id
            }

            const shippingLabels = template.shipping ?? {
                standardLabel: 'Standard Shipping',
                standardPrice: 500,
                expressLabel: 'Express Shipping',
                expressPrice: 1200,
            }

            // Standard
            await client.request('/admin/shipping-options', {
                body: {
                    name: shippingLabels.standardLabel,
                    service_zone_id: serviceZoneId,
                    shipping_profile_id: shippingProfileId,
                    provider_id: 'manual_manual',
                    price_type: 'flat',
                    type: { label: 'Standard', description: 'Standard shipping', code: 'standard' },
                    prices: [{ amount: shippingLabels.standardPrice, currency_code: template.currency, region_id: regionId }],
                    rules: [{ attribute: 'enabled_in_store', operator: 'eq', value: '"true"' }],
                },
            })

            // Express
            await client.request('/admin/shipping-options', {
                body: {
                    name: shippingLabels.expressLabel,
                    service_zone_id: serviceZoneId,
                    shipping_profile_id: shippingProfileId,
                    provider_id: 'manual_manual',
                    price_type: 'flat',
                    type: { label: 'Express', description: 'Express shipping', code: 'express' },
                    prices: [{ amount: shippingLabels.expressPrice, currency_code: template.currency, region_id: regionId }],
                    rules: [{ attribute: 'enabled_in_store', operator: 'eq', value: '"true"' }],
                },
            })

            log('✅', 'Shipping options created')
        } else {
            log('✅', `Shipping options exist (${existingOptions.length})`)
            // Still need profile ID
            const profileRes = await client.request<{ shipping_profiles: Array<{ id: string }> }>('/admin/shipping-profiles')
            shippingProfileId = profileRes.shipping_profiles?.[0]?.id ?? ''
        }
    } catch (err) {
        log('⚠️', `Shipping setup issue: ${err instanceof Error ? err.message : err}`)
    }

    // ── 7) Publishable API Key ──
    let publishableApiKey = ''
    try {
        const apiRes = await client.request<{ api_keys: { id: string; token: string; title: string; type: string }[] }>('/admin/api-keys?type=publishable')
        const existing = apiRes.api_keys?.find(k => k.type === 'publishable')
        if (existing) {
            publishableApiKey = existing.token
            // Associate with sales channel
            try {
                await client.request(`/admin/api-keys/${existing.id}/sales-channels`, {
                    body: { add: [salesChannelId] },
                })
            } catch { /* already associated */ }
            log('✅', `Publishable API key exists: ${publishableApiKey.slice(0, 12)}...`)
        } else {
            const keyRes = await client.request<{ api_key: { id: string; token: string } }>('/admin/api-keys', {
                body: { title: 'Storefront Key', type: 'publishable' },
            })
            publishableApiKey = keyRes.api_key.token
            await client.request(`/admin/api-keys/${keyRes.api_key.id}/sales-channels`, {
                body: { add: [salesChannelId] },
            })
            log('✅', `Publishable API key created: ${publishableApiKey.slice(0, 12)}...`)
        }
    } catch (err) {
        log('⚠️', `API key setup issue: ${err instanceof Error ? err.message : err}`)
    }

    log('🏗️', '═══ INFRA SEED COMPLETE ═══')

    return {
        regionId,
        salesChannelId,
        publishableApiKey,
        shippingProfileId,
    }
}
