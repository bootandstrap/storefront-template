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
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Warehouse } from 'lucide-react'
import InventoryClient from './InventoryClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    return { title: dictionary['panel.inventory.title'] }
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
        title: dict['panel.inventory.title'],
        subtitle: dict['panel.inventory.subtitle'],
        searchPlaceholder: dict['panel.inventory.searchPlaceholder'],
        sku: dict['panel.inventory.sku'],
        product: dict['panel.inventory.product'],
        stocked: dict['panel.inventory.stocked'],
        reserved: dict['panel.inventory.reserved'],
        available: dict['panel.inventory.available'],
        lowStock: dict['panel.inventory.lowStock'],
        outOfStock: dict['panel.inventory.outOfStock'],
        updateStock: dict['panel.inventory.updateStock'],
        noItems: dict['panel.inventory.noItems'],
        save: dict['common.save'],
        cancel: dict['common.cancel'],
        alerts: dict['panel.inventory.alerts'],
        noAlerts: dict['panel.inventory.noAlerts'],
        hide: dict['panel.inventory.hide'],
        itemsLeft: dict['panel.inventory.itemsLeft'],
        untitled: dict['panel.inventory.untitled'],
    }

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={labels.title}
                subtitle={labels.subtitle}
                icon={<Warehouse className="w-5 h-5" />}
                badge={inventoryData.inventory_items.length}
            />
            <InventoryClient
                items={inventoryData.inventory_items}
                lowStockItems={lowStockData}
                locations={locations}
                labels={labels}
            />
        </div>
    )
}
