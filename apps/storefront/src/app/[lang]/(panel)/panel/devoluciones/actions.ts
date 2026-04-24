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
import { createClient } from '@/lib/supabase/server'
import {
    createReturnRequest,
    receiveReturn
} from '@/lib/medusa/admin'

interface ReturnRequest {
    id: string
    tenant_id: string
    order_id: string
    status: string
    items: ReturnItem[]
    created_at: string
    [key: string]: unknown
}

interface ReturnItem {
    id: string
    quantity: number
    reason?: string
}

/**
 * Fetch all return requests from Supabase pre-validation layer.
 */
export async function fetchReturns(): Promise<{ returns: ReturnRequest[]; error?: string }> {
    try {
        const { tenantId } = await withPanelGuard()
        const supabase = await createClient()
        
        const { data: returns, error } = await supabase
            .from('return_requests')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return { returns: returns || [] }
    } catch (err) {
        return { returns: [], error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

/**
 * Approve a returnrequest — Create native return in Medusa and mark approved.
 */
export async function approveReturnAction(
    returnId: string,
    items: { id: string; quantity: number; reason?: string }[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const { tenantId } = await withPanelGuard()
        const supabase = await createClient()

        // 1. Get the return request from Supabase
        const { data: req, error: fetchErr } = await supabase
            .from('return_requests')
            .select('*')
            .eq('id', returnId)
            .eq('tenant_id', tenantId)
            .single()

        if (fetchErr || !req) {
            throw new Error('Return request not found')
        }

        // 2. Map items from the original request
        const medusaItems = (req.items as ReturnItem[] || []).map(i => ({
            id: i.id,
            quantity: i.quantity,
            reason: i.reason
        }))

        // 3. Create the return request in Medusa
        const scope = await getTenantMedusaScope(tenantId)
        const result = await createReturnRequest(req.order_id, medusaItems, scope)
        
        if (result.error) {
            return { success: false, error: result.error }
        }

        // 4. Update Supabase
        await supabase
            .from('return_requests')
            .update({ status: 'approved' })
            .eq('id', returnId)

        revalidatePath('/panel/devoluciones')
        logOwnerAction(tenantId, 'return.approve', { returnId, orderId: req.order_id })
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

/**
 * Reject a return request in the pre-validation layer.
 */
export async function rejectReturnAction(
    returnId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { tenantId } = await withPanelGuard()
        const supabase = await createClient()
        
        const { error } = await supabase
            .from('return_requests')
            .update({ status: 'rejected' })
            .eq('id', returnId)
            .eq('tenant_id', tenantId)

        if (error) throw error

        revalidatePath('/panel/devoluciones')
        logOwnerAction(tenantId, 'return.reject', { returnId })
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
