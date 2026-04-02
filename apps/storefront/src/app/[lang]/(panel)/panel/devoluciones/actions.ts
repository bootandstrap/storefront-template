'use server'

/**
 * Returns (Devoluciones) — Server Actions
 *
 * Tenant-scoped: all Medusa admin queries go through getTenantMedusaScope.
 * Zone: 🟡 EXTEND — uses locked auth/config + Medusa admin APIs
 */

import { revalidatePath } from 'next/cache'
import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { logOwnerAction } from '@/lib/panel/log-owner-action'
import {
    getAdminReturns,
    receiveAdminReturn,
    cancelAdminReturn,
    type AdminReturn,
} from '@/lib/medusa/admin'

/**
 * Fetch all returns for the current tenant (server-only).
 */
export async function fetchReturns(): Promise<{ returns: AdminReturn[]; error?: string }> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)
        const result = await getAdminReturns({ limit: 50 }, scope)
        return { returns: result.returns }
    } catch (err) {
        return { returns: [], error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

/**
 * Approve (receive) a return — tenant-scoped.
 */
export async function approveReturnAction(
    returnId: string,
    items: { id: string; quantity: number }[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)
        const result = await receiveAdminReturn(returnId, items, scope)
        if (result.error) {
            return { success: false, error: result.error }
        }
        revalidatePath('/panel/devoluciones')
        logOwnerAction(tenantId, 'return.approve', { returnId, itemCount: items.length })
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

/**
 * Reject (cancel) a return — tenant-scoped.
 */
export async function rejectReturnAction(
    returnId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)
        const result = await cancelAdminReturn(returnId, scope)
        if (result.error) {
            return { success: false, error: result.error }
        }
        revalidatePath('/panel/devoluciones')
        logOwnerAction(tenantId, 'return.reject', { returnId })
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
