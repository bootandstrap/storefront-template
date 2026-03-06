/**
 * Inventory Dashboard — Owner Panel
 *
 * Server component fetches inventory items, stock locations, and low stock alerts.
 * Delegates to InventoryClient for interactive stock management.
 *
 * Zone: 🟡 EXTEND
 */

import { getDictionary, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getInventoryItems, getLowStockItems, getStockLocations } from '@/lib/medusa/admin-inventory'
import InventoryClient from './InventoryClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    return { title: dictionary['panel.inventory.title'] || 'Inventory' }
}

export default async function InventoryPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { tenantId } = await withPanelGuard()
    const scope = await getTenantMedusaScope(tenantId)

    const [inventoryData, lowStockData, locations] = await Promise.all([
        getInventoryItems({ limit: 50 }, scope),
        getLowStockItems(5, scope),
        getStockLocations(scope),
    ])

    const dict = await getDictionary(lang as Locale)

    const labels = {
        title: dict['panel.inventory.title'] || 'Inventory',
        subtitle: dict['panel.inventory.subtitle'] || 'Manage stock levels across all products',
        searchPlaceholder: dict['panel.inventory.searchPlaceholder'] || 'Search by SKU or name...',
        sku: dict['panel.inventory.sku'] || 'SKU',
        product: dict['panel.inventory.product'] || 'Product',
        stocked: dict['panel.inventory.stocked'] || 'Stocked',
        reserved: dict['panel.inventory.reserved'] || 'Reserved',
        available: dict['panel.inventory.available'] || 'Available',
        lowStock: dict['panel.inventory.lowStock'] || 'Low Stock',
        outOfStock: dict['panel.inventory.outOfStock'] || 'Out of Stock',
        updateStock: dict['panel.inventory.updateStock'] || 'Update Stock',
        noItems: dict['panel.inventory.noItems'] || 'No inventory items found',
        save: dict['common.save'] || 'Save',
        cancel: dict['common.cancel'] || 'Cancel',
        alerts: dict['panel.inventory.alerts'] || 'Stock Alerts',
        noAlerts: dict['panel.inventory.noAlerts'] || 'All products are well-stocked',
        hide: dict['panel.inventory.hide'] || 'Hide',
        itemsLeft: dict['panel.inventory.itemsLeft'] || 'left',
        untitled: dict['panel.inventory.untitled'] || 'Untitled',
    }

    return (
        <div className="space-y-6">
            <InventoryClient
                items={inventoryData.inventory_items}
                lowStockItems={lowStockData}
                locations={locations}
                labels={labels}
            />
        </div>
    )
}
