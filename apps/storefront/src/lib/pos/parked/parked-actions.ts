'use server'

/**
 * POS Parked Sales — Server Actions
 *
 * Hybrid persistence for parked sales:
 * - Always persists in localStorage (client-side, immediate)
 * - Also syncs to Medusa draft orders with `pos_parked: true` metadata
 *   when multi-device is enabled (Enterprise tier)
 *
 * This allows parked sales to survive browser restarts and be visible
 * across terminals in multi-device mode.
 *
 * @module lib/pos/parked/parked-actions
 */

import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { createDraftOrder } from '@/lib/medusa/admin-draft-orders'
import { logger } from '@/lib/logger'

interface ParkedSaleItem {
    variant_id: string
    quantity: number
    unit_price: number
    title: string
}

interface ParkSaleInput {
    items: ParkedSaleItem[]
    customer_name?: string
    note?: string
}

/**
 * Park a sale to the server as a draft order with `pos_parked` metadata.
 * This is only called when multi-device mode is active (Enterprise).
 */
export async function parkSaleAction(input: ParkSaleInput): Promise<{
    draft_order_id?: string
    error?: string
}> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)

        // Get region for draft order
        const { adminFetch } = await import('@/lib/medusa/admin-core')
        const regionsRes = await adminFetch<{ regions: { id: string }[] }>(
            '/admin/regions?limit=1', {}, scope
        )
        const regionId = regionsRes.data?.regions?.[0]?.id
        if (!regionId) return { error: 'No region configured' }

        const { draft_order, error } = await createDraftOrder({
            region_id: regionId,
            items: input.items.map(i => ({
                variant_id: i.variant_id,
                quantity: i.quantity,
                unit_price: i.unit_price,
            })),
            email: 'pos-parked@tienda.local',
            sales_channel_id: scope?.medusaSalesChannelId,
            no_notification_order: true,
            metadata: {
                source: 'pos',
                pos_parked: true,
                parked_at: new Date().toISOString(),
                customer_name: input.customer_name || null,
                note: input.note || null,
                item_titles: input.items.map(i => `${i.quantity}× ${i.title}`).join(', '),
            },
        }, scope)

        if (error || !draft_order) {
            return { error: error || 'Failed to park sale' }
        }

        return { draft_order_id: draft_order.id }
    } catch (err) {
        logger.error('[pos] parkSaleAction failed', {
            error: err instanceof Error ? err.message : 'Unknown',
        })
        return { error: err instanceof Error ? err.message : 'Park sale failed' }
    }
}

/**
 * List parked sales from the server (draft orders with pos_parked metadata).
 * Used by multi-device mode to show parked sales from ALL terminals.
 */
export async function listParkedSalesAction(): Promise<{
    sales: Array<{
        id: string
        items: Array<{ variant_id: string; quantity: number; unit_price: number; title: string }>
        customer_name?: string
        note?: string
        parked_at: string
    }>
    error?: string
}> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)

        const { adminFetch } = await import('@/lib/medusa/admin-core')
        const res = await adminFetch<{
            draft_orders: Array<{
                id: string
                items: Array<{ variant_id: string; quantity: number; unit_price: number; title: string }>
                metadata: Record<string, unknown> | null
            }>
        }>('/admin/draft-orders?limit=20', {}, scope)

        const drafts = res.data?.draft_orders ?? []
        const parked = drafts
            .filter(d => d.metadata?.pos_parked === true)
            .map(d => ({
                id: d.id,
                items: (d.items || []).map(i => ({
                    variant_id: i.variant_id,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    title: i.title || '',
                })),
                customer_name: d.metadata?.customer_name as string | undefined,
                note: d.metadata?.note as string | undefined,
                parked_at: (d.metadata?.parked_at as string) || new Date().toISOString(),
            }))

        return { sales: parked }
    } catch (err) {
        return {
            sales: [],
            error: err instanceof Error ? err.message : 'Failed to load parked sales',
        }
    }
}

/**
 * Unpark a sale — deletes the draft order from server.
 * Called when a parked sale is resumed or deleted.
 */
export async function unparkSaleAction(draftOrderId: string): Promise<{
    error?: string
}> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)

        const { adminFetch } = await import('@/lib/medusa/admin-core')
        const res = await adminFetch(
            `/admin/draft-orders/${draftOrderId}`,
            { method: 'DELETE' },
            scope
        )

        if (res.error) return { error: res.error }
        return {}
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to unpark sale' }
    }
}
