'use server'

import { withPanelGuard } from '@/lib/panel-guard'
import { getAdminShippingOptions, updateAdminShippingOption } from '@/lib/medusa/admin'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { logOwnerAction } from '@/lib/panel/log-owner-action'
import type { AdminShippingOption } from '@/lib/medusa/admin'

// ---------------------------------------------------------------------------
// List shipping options (Medusa Admin API — zero Supabase)
// ---------------------------------------------------------------------------
export async function listShippingOptions(): Promise<{
    options: AdminShippingOption[]
    error?: string
}> {
    try {
        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
        const scope = await getTenantMedusaScope(tenantId)
        const { shipping_options } = await getAdminShippingOptions(scope)
        return { options: shipping_options }
    } catch (err) {
        console.error('[panel/envios] listShippingOptions error:', err)
        return { options: [], error: err instanceof Error ? err.message : 'Error loading shipping options' }
    }
}

// ---------------------------------------------------------------------------
// Update shipping option price (flat rate)
// ---------------------------------------------------------------------------
export async function updateShippingPrice(
    optionId: string,
    amount: number,
    currencyCode: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!optionId || typeof amount !== 'number' || amount < 0) {
            return { success: false, error: 'Invalid parameters' }
        }

        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
        const scope = await getTenantMedusaScope(tenantId)
        const { error } = await updateAdminShippingOption(optionId, {
            prices: [{ amount, currency_code: currencyCode }],
        }, scope)

        if (error) return { success: false, error }
        logOwnerAction(tenantId, 'shipping.update_price', { optionId, amount, currencyCode })
        return { success: true }
    } catch (err) {
        console.error('[panel/envios] updateShippingPrice error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Error updating price' }
    }
}

// ---------------------------------------------------------------------------
// Update shipping option name
// ---------------------------------------------------------------------------
export async function updateShippingName(
    optionId: string,
    name: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!optionId || !name.trim()) {
            return { success: false, error: 'Name is required' }
        }

        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
        const scope = await getTenantMedusaScope(tenantId)
        const { error } = await updateAdminShippingOption(optionId, { name: name.trim() }, scope)

        if (error) return { success: false, error }
        logOwnerAction(tenantId, 'shipping.update_name', { optionId, name: name.trim() })
        return { success: true }
    } catch (err) {
        console.error('[panel/envios] updateShippingName error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Error updating name' }
    }
}
