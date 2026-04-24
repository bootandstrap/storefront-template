/**
 * POS Shift Server Actions
 *
 * Bridges the frontend (POSShiftPanel, POSEndOfDay) to the Medusa POS module
 * backend via server actions. Replaces all IndexedDB-based shift persistence.
 *
 * Data flow:
 *   Frontend → shift-actions.ts → medusa-pos-module.ts → Medusa Admin API
 *
 * Each action is gated by `withPanelGuard()` and scoped to the tenant's
 * Medusa instance via `getTenantMedusaScope()`.
 *
 * @module lib/pos/shifts/shift-actions
 */
'use server'

import { revalidatePath } from 'next/cache'
import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { logOwnerAction } from '@/lib/panel/log-owner-action'
import {
    openPOSShift,
    closePOSShift,
    getPOSShift,
    listPOSShifts,
    type PosShift,
} from '@/lib/pos/medusa-pos-module'
import { logger } from '@/lib/logger'

// ═══════════════════════════════════════════════════════════════════════════
// Open Shift
// ═══════════════════════════════════════════════════════════════════════════

export interface OpenShiftInput {
    operator: string
    terminal_id?: string
    expected_cash?: number
}

export async function openShiftAction(
    input: OpenShiftInput
): Promise<{ shift: PosShift | null; error: string | null }> {
    try {
        const { tenantId, appConfig } = await withPanelGuard()

        // Gate: shifts require Pro+ tier
        if (!appConfig?.featureFlags?.enable_pos_shifts) {
            return { shift: null, error: 'POS Shifts requires POS Pro or higher' }
        }

        const scope = await getTenantMedusaScope(tenantId)

        // Check for existing open shift on same terminal
        const existing = await listPOSShifts(
            { status: 'open', operator: input.operator },
            scope
        )
        if (existing.length > 0) {
            return {
                shift: existing[0],
                error: `Shift already open for ${input.operator}`,
            }
        }

        const { shift, error } = await openPOSShift(
            {
                operator: input.operator,
                terminal_id: input.terminal_id,
                expected_cash: input.expected_cash ?? 0,
            },
            scope
        )

        if (error) {
            logger.error('[pos] openShiftAction failed', { error })
            return { shift: null, error }
        }

        logOwnerAction(tenantId, 'pos.open_shift', {
            shiftId: shift?.id,
            operator: input.operator,
            terminalId: input.terminal_id,
        })

        revalidatePath('/[lang]/panel/pos', 'page')
        return { shift, error: null }
    } catch (err) {
        logger.error('[pos] openShiftAction exception', {
            error: err instanceof Error ? err.message : 'Unknown',
        })
        return {
            shift: null,
            error: err instanceof Error ? err.message : 'Failed to open shift',
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Close Shift (End of Day / Reconciliation)
// ═══════════════════════════════════════════════════════════════════════════

export interface CloseShiftInput {
    shift_id: string
    actual_cash?: number
    close_notes?: string
}

export async function closeShiftAction(
    input: CloseShiftInput
): Promise<{
    shift: PosShift | null
    discrepancy: number | null
    error: string | null
}> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)

        // Fetch current shift for discrepancy calculation
        const current = await getPOSShift(input.shift_id, scope)
        if (!current) {
            return { shift: null, discrepancy: null, error: 'Shift not found' }
        }
        if (current.status === 'closed') {
            return { shift: current, discrepancy: current.discrepancy ?? null, error: 'Shift already closed' }
        }

        // Calculate discrepancy
        const expectedCash = current.expected_cash ?? 0
        const actualCash = input.actual_cash ?? expectedCash
        const discrepancy = actualCash - expectedCash

        const { shift, error } = await closePOSShift(
            input.shift_id,
            {
                actual_cash: actualCash,
                close_notes: input.close_notes,
                transaction_count: current.transaction_count,
                total_revenue: current.total_revenue,
            },
            scope
        )

        if (error) {
            logger.error('[pos] closeShiftAction failed', { error })
            return { shift: null, discrepancy: null, error }
        }

        logOwnerAction(tenantId, 'pos.close_shift', {
            shiftId: input.shift_id,
            expectedCash,
            actualCash,
            discrepancy,
            totalRevenue: current.total_revenue,
            transactionCount: current.transaction_count,
        })

        revalidatePath('/[lang]/panel/pos', 'page')
        return { shift, discrepancy, error: null }
    } catch (err) {
        logger.error('[pos] closeShiftAction exception', {
            error: err instanceof Error ? err.message : 'Unknown',
        })
        return {
            shift: null,
            discrepancy: null,
            error: err instanceof Error ? err.message : 'Failed to close shift',
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Get Active Shift
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Retrieve the currently open shift for the operator (or any open shift).
 * Used by POSClient to determine if a shift is active before processing sales.
 */
export async function getActiveShiftAction(
    operator?: string
): Promise<{ shift: PosShift | null; error: string | null }> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)

        const filters: { status: string; operator?: string } = { status: 'open' }
        if (operator) filters.operator = operator

        const shifts = await listPOSShifts(filters, scope)
        return {
            shift: shifts.length > 0 ? shifts[0] : null,
            error: null,
        }
    } catch (err) {
        return {
            shift: null,
            error: err instanceof Error ? err.message : 'Failed to get active shift',
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// List Shifts (History)
// ═══════════════════════════════════════════════════════════════════════════

export async function listShiftsAction(
    filters?: { status?: string; operator?: string }
): Promise<{ shifts: PosShift[]; error: string | null }> {
    try {
        const { tenantId, appConfig } = await withPanelGuard()

        // Gate: shifts require Pro+ tier
        if (!appConfig?.featureFlags?.enable_pos_shifts) {
            return { shifts: [], error: 'POS Shifts requires POS Pro or higher' }
        }

        const scope = await getTenantMedusaScope(tenantId)
        const shifts = await listPOSShifts(filters, scope)

        return { shifts, error: null }
    } catch (err) {
        return {
            shifts: [],
            error: err instanceof Error ? err.message : 'Failed to list shifts',
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Get Shift Detail (with computed stats)
// ═══════════════════════════════════════════════════════════════════════════

export interface ShiftDetail extends PosShift {
    duration_minutes: number | null
    average_transaction: number | null
}

export async function getShiftDetailAction(
    shiftId: string
): Promise<{ shift: ShiftDetail | null; error: string | null }> {
    try {
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)

        const raw = await getPOSShift(shiftId, scope)
        if (!raw) {
            return { shift: null, error: 'Shift not found' }
        }

        // Compute derived stats
        const startTime = new Date(raw.created_at).getTime()
        const endTime = raw.closed_at ? new Date(raw.closed_at).getTime() : Date.now()
        const durationMinutes = Math.round((endTime - startTime) / 60000)

        const averageTransaction = raw.transaction_count > 0
            ? raw.total_revenue / raw.transaction_count
            : null

        const detail: ShiftDetail = {
            ...raw,
            duration_minutes: durationMinutes,
            average_transaction: averageTransaction,
        }

        return { shift: detail, error: null }
    } catch (err) {
        return {
            shift: null,
            error: err instanceof Error ? err.message : 'Failed to get shift detail',
        }
    }
}
