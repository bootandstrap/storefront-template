'use server'

/**
 * Sales Channels — Server Actions
 *
 * Fetches real data from Medusa Admin API:
 * 1. Sales channels list from Medusa v2 `/admin/sales-channels`
 * 2. Order metrics per channel (count + revenue) from `/admin/orders`
 *
 * Graceful degradation: if Medusa is unreachable, returns empty data.
 */

import { withPanelGuard } from '@/lib/panel-guard'
import { adminFetch } from '@/lib/medusa/admin-core'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChannelData {
    id: string
    name: string
    description: string
    is_disabled: boolean
    created_at: string
}

export interface ChannelMetrics {
    channelId: string
    orderCount: number
    revenue: number
    currencyCode: string
}

export interface SalesChannelsData {
    channels: ChannelData[]
    metrics: Record<string, ChannelMetrics>
    currentChannelId: string | null
}

// ---------------------------------------------------------------------------
// Fetch real sales channels + metrics
// ---------------------------------------------------------------------------

export async function getSalesChannelsAction(): Promise<SalesChannelsData> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)

        // 1) Fetch all sales channels from Medusa
        const channelsRes = await adminFetch<{
            sales_channels: {
                id: string
                name: string
                description: string | null
                is_disabled: boolean
                created_at: string
            }[]
        }>('/admin/sales-channels?limit=50&fields=id,name,description,is_disabled,created_at', {}, scope)

        const rawChannels = channelsRes.data?.sales_channels ?? []
        const channels: ChannelData[] = rawChannels.map((ch) => ({
            id: ch.id,
            name: ch.name,
            description: ch.description || '',
            is_disabled: ch.is_disabled ?? false,
            created_at: ch.created_at,
        }))

        // Current tenant sales channel
        const currentChannelId = scope?.medusaSalesChannelId ?? null

        // 2) Fetch order metrics for the current period (this month)
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const metrics: Record<string, ChannelMetrics> = {}

        // Fetch orders with sales_channel_id to compute per-channel metrics
        // We fetch a reasonable batch to compute stats
        const ordersRes = await adminFetch<{
            orders: {
                id: string
                total: number
                currency_code: string
                sales_channel_id: string | null
            }[]
        }>(
            `/admin/orders?limit=500&fields=id,total,currency_code,sales_channel_id&created_at[gte]=${startOfMonth}`,
            {},
            scope
        )

        const orders = ordersRes.data?.orders ?? []

        // Group by sales_channel_id
        for (const order of orders) {
            const chId = order.sales_channel_id || 'unknown'
            if (!metrics[chId]) {
                metrics[chId] = {
                    channelId: chId,
                    orderCount: 0,
                    revenue: 0,
                    currencyCode: order.currency_code || 'chf',
                }
            }
            metrics[chId].orderCount++
            // Medusa v2 stores amounts in cents
            metrics[chId].revenue += (order.total || 0)
        }

        return { channels, metrics, currentChannelId }
    } catch (err) {
        console.error('[canales/actions] Failed to fetch sales channels:', err)
        return { channels: [], metrics: {}, currentChannelId: null }
    }
}
