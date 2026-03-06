/**
 * Medusa Admin API — Inventory Domain
 *
 * Functions for stock level management, inventory items, and stock locations.
 * Used by the owner panel inventory dashboard.
 */
import { adminFetch, normalizeAdminListParams } from './admin-core'
import type { TenantMedusaScope } from './admin-core'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InventoryItem {
    id: string
    sku: string | null
    title: string | null
    description: string | null
    thumbnail: string | null
    requires_shipping: boolean
    stocked_quantity: number
    reserved_quantity: number
    location_levels?: StockLocationLevel[]
    created_at: string
    updated_at: string
}

export interface StockLocationLevel {
    id: string
    inventory_item_id: string
    location_id: string
    stocked_quantity: number
    reserved_quantity: number
    incoming_quantity: number
    available_quantity: number
}

export interface StockLocation {
    id: string
    name: string
    address?: {
        address_1?: string
        city?: string
        country_code?: string
    }
}

export interface InventoryListResult {
    inventory_items: InventoryItem[]
    count: number
}

export interface StockAdjustmentInput {
    location_id: string
    quantity: number  // positive = add stock, negative = remove
}

// ---------------------------------------------------------------------------
// Inventory Items — List & Read
// ---------------------------------------------------------------------------

export async function getInventoryItems(params?: {
    limit?: number
    offset?: number
    sku?: string
    q?: string
}, scope?: TenantMedusaScope | null): Promise<InventoryListResult> {
    const normalized = normalizeAdminListParams({
        limit: params?.limit ?? 50,
        offset: params?.offset,
    })
    const searchParams = new URLSearchParams({
        limit: String(normalized.limit),
        offset: String(normalized.offset),
        order: '-updated_at',
    })
    if (params?.sku) searchParams.set('sku', params.sku)
    if (params?.q) searchParams.set('q', params.q)

    const res = await adminFetch<InventoryListResult>(
        `/admin/inventory-items?${searchParams.toString()}`,
        {},
        scope
    )

    return {
        inventory_items: res.data?.inventory_items ?? [],
        count: res.data?.count ?? 0,
    }
}

export async function getInventoryItem(
    id: string,
    scope?: TenantMedusaScope | null
): Promise<InventoryItem | null> {
    const res = await adminFetch<{ inventory_item: InventoryItem }>(
        `/admin/inventory-items/${id}?fields=*location_levels`,
        {},
        scope
    )
    return res.data?.inventory_item ?? null
}

// ---------------------------------------------------------------------------
// Stock Level Management
// ---------------------------------------------------------------------------

/**
 * Update stock quantity for an inventory item at a specific location.
 * Uses Medusa's stock adjustment API.
 */
export async function adjustStockLevel(
    inventoryItemId: string,
    locationId: string,
    adjustment: number,
    scope?: TenantMedusaScope | null
): Promise<{ error: string | null }> {
    const res = await adminFetch(
        `/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
        {
            method: 'POST',
            body: JSON.stringify({ stocked_quantity: adjustment }),
        },
        scope
    )
    return { error: res.error }
}

/**
 * Bulk stock update — set exact quantities for multiple items.
 * Useful for CSV imports or post-inventory-count adjustments.
 */
export async function bulkUpdateStock(
    updates: { inventory_item_id: string; location_id: string; stocked_quantity: number }[],
    scope?: TenantMedusaScope | null
): Promise<{ success: number; errors: { id: string; error: string }[] }> {
    let success = 0
    const errors: { id: string; error: string }[] = []

    for (const update of updates) {
        const res = await adminFetch(
            `/admin/inventory-items/${update.inventory_item_id}/location-levels/${update.location_id}`,
            {
                method: 'POST',
                body: JSON.stringify({ stocked_quantity: update.stocked_quantity }),
            },
            scope
        )

        if (res.error) {
            errors.push({ id: update.inventory_item_id, error: res.error })
        } else {
            success++
        }
    }

    return { success, errors }
}

// ---------------------------------------------------------------------------
// Stock Locations
// ---------------------------------------------------------------------------

export async function getStockLocations(
    scope?: TenantMedusaScope | null
): Promise<StockLocation[]> {
    const res = await adminFetch<{ stock_locations: StockLocation[] }>(
        '/admin/stock-locations?limit=50',
        {},
        scope
    )
    return res.data?.stock_locations ?? []
}

// ---------------------------------------------------------------------------
// Low Stock Report
// ---------------------------------------------------------------------------

export interface LowStockItem {
    id: string
    sku: string | null
    title: string | null
    available_quantity: number
    stocked_quantity: number
    reserved_quantity: number
    is_out_of_stock: boolean
}

/**
 * Get items below the low stock threshold.
 * Fetches all inventory items and filters client-side
 * (Medusa Admin API doesn't support filtering by quantity).
 */
export async function getLowStockItems(
    threshold: number = 5,
    scope?: TenantMedusaScope | null
): Promise<LowStockItem[]> {
    const res = await adminFetch<InventoryListResult>(
        '/admin/inventory-items?limit=100&fields=id,sku,title,stocked_quantity,reserved_quantity',
        {},
        scope
    )

    const items = res.data?.inventory_items ?? []

    return items
        .map(item => {
            const available = (item.stocked_quantity ?? 0) - (item.reserved_quantity ?? 0)
            return {
                id: item.id,
                sku: item.sku,
                title: item.title,
                available_quantity: available,
                stocked_quantity: item.stocked_quantity ?? 0,
                reserved_quantity: item.reserved_quantity ?? 0,
                is_out_of_stock: available <= 0,
            }
        })
        .filter(item => item.available_quantity <= threshold)
        .sort((a, b) => a.available_quantity - b.available_quantity)
}
