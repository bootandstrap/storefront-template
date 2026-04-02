'use server'

/**
 * Inventory Server Actions — Owner Panel
 *
 * Fixes B1: stock update was calling non-existent API endpoint.
 * Now uses proper server actions with withPanelGuard.
 *
 * Zone: 🟡 EXTEND
 */

import { revalidatePath } from 'next/cache'
import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { logOwnerAction } from '@/lib/panel/log-owner-action'
import {
    adjustStockLevel,
    bulkUpdateStock,
    getInventoryItems,
    getStockLocations,
} from '@/lib/medusa/admin-inventory'

// ---------------------------------------------------------------------------
// Single stock update
// ---------------------------------------------------------------------------

export async function updateStock(
    inventoryItemId: string,
    locationId: string,
    stockedQuantity: number
): Promise<{ success: boolean; error?: string }> {
    const { tenantId } = await withPanelGuard()
    const scope = await getTenantMedusaScope(tenantId)

    const { error } = await adjustStockLevel(
        inventoryItemId,
        locationId,
        stockedQuantity,
        scope
    )

    if (error) {
        return { success: false, error }
    }

    revalidatePath('/panel/inventario', 'page')
    logOwnerAction(tenantId, 'inventory.update_stock', { inventoryItemId, locationId, stockedQuantity })
    return { success: true }
}

// ---------------------------------------------------------------------------
// CSV bulk import
// ---------------------------------------------------------------------------

interface CsvRow {
    sku: string
    quantity: number
}

export async function importStockCsv(
    rows: CsvRow[]
): Promise<{ success: number; errors: { sku: string; error: string }[]; total: number }> {
    const { tenantId } = await withPanelGuard()
    const scope = await getTenantMedusaScope(tenantId)

    // Resolve SKUs to inventory item IDs
    const locations = await getStockLocations(scope)
    const defaultLocationId = locations[0]?.id
    if (!defaultLocationId) {
        return { success: 0, errors: [{ sku: '*', error: 'No stock location configured' }], total: rows.length }
    }

    const updates: { inventory_item_id: string; location_id: string; stocked_quantity: number }[] = []
    const resolveErrors: { sku: string; error: string }[] = []

    for (const row of rows) {
        const result = await getInventoryItems({ sku: row.sku, limit: 1 }, scope)
        const item = result.inventory_items[0]
        if (!item) {
            resolveErrors.push({ sku: row.sku, error: 'SKU not found' })
            continue
        }
        updates.push({
            inventory_item_id: item.id,
            location_id: defaultLocationId,
            stocked_quantity: row.quantity,
        })
    }

    if (updates.length === 0) {
        return { success: 0, errors: resolveErrors, total: rows.length }
    }

    const result = await bulkUpdateStock(updates, scope)

    const allErrors = [
        ...resolveErrors,
        ...result.errors.map(e => ({ sku: e.id, error: e.error })),
    ]

    revalidatePath('/panel/inventario', 'page')
    logOwnerAction(tenantId, 'inventory.csv_import', { totalRows: rows.length, successCount: result.success, errorCount: allErrors.length })
    return { success: result.success, errors: allErrors, total: rows.length }
}
