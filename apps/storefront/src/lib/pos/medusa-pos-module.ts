/**
 * POS Module — Medusa Admin API Client
 *
 * Typed client for the custom POS Medusa module endpoints:
 *   - Sessions:     /admin/pos/sessions
 *   - Transactions:  /admin/pos/transactions
 *   - Shifts:        /admin/pos/shifts
 *
 * These wrap the CRUD API routes defined in the Medusa backend at
 * `apps/medusa/src/api/admin/pos/`. The POS module uses Medusa's native
 * data persistence (PostgreSQL via MedusaService DML) — NOT IndexedDB.
 *
 * Module Links (server-side, via Medusa Link Module):
 *   - Order ↔ PosTransaction (apps/medusa/src/links/order-pos-transaction.ts)
 *   - Customer ↔ CrmContact (apps/medusa/src/links/customer-crm-contact.ts)
 *
 * @module lib/pos/medusa-pos-module
 */
import 'server-only'

import { adminFetch } from '@/lib/medusa/admin-core'
import type { TenantMedusaScope } from '@/lib/medusa/admin-core'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface PosSession {
    id: string
    operator: string
    terminal_id: string | null
    status: 'open' | 'closed' | 'suspended'
    opening_balance: number
    closing_balance: number | null
    closed_at: string | null
    close_notes: string | null
    created_at: string
    updated_at: string
}

export interface PosTransaction {
    id: string
    order_id: string | null
    session_id: string
    payment_method: 'cash' | 'card' | 'mixed' | 'voucher' | 'other'
    amount: number
    currency_code: string
    cash_tendered: number | null
    receipt_number: string | null
    customer_name: string | null
    status: 'completed' | 'refunded' | 'voided'
    line_items_snapshot: unknown[] | null
    discount_percent: number | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface PosShift {
    id: string
    operator: string
    terminal_id: string | null
    status: 'open' | 'closed'
    expected_cash: number
    actual_cash: number | null
    discrepancy: number | null
    transaction_count: number
    total_revenue: number
    closed_at: string | null
    close_notes: string | null
    created_at: string
    updated_at: string
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Operations
// ═══════════════════════════════════════════════════════════════════════════

export async function createPOSSession(
    data: {
        operator: string
        terminal_id?: string
        opening_balance?: number
    },
    scope?: TenantMedusaScope | null
): Promise<{ session: PosSession | null; error: string | null }> {
    const res = await adminFetch<{ session: PosSession }>(
        '/admin/pos/sessions',
        {
            method: 'POST',
            body: JSON.stringify(data),
        },
        scope
    )
    return { session: res.data?.session ?? null, error: res.error }
}

export async function closePOSSession(
    sessionId: string,
    data: {
        closing_balance?: number
        close_notes?: string
    },
    scope?: TenantMedusaScope | null
): Promise<{ session: PosSession | null; error: string | null }> {
    const res = await adminFetch<{ session: PosSession }>(
        `/admin/pos/sessions/${sessionId}`,
        {
            method: 'POST',
            body: JSON.stringify({
                status: 'closed',
                ...data,
            }),
        },
        scope
    )
    return { session: res.data?.session ?? null, error: res.error }
}

export async function listPOSSessions(
    filters?: { status?: string; terminal_id?: string },
    scope?: TenantMedusaScope | null
): Promise<PosSession[]> {
    try {
        const params = new URLSearchParams()
        if (filters?.status) params.set('status', filters.status)
        if (filters?.terminal_id) params.set('terminal_id', filters.terminal_id)
        const qs = params.toString()

        const res = await adminFetch<{ sessions: PosSession[] }>(
            `/admin/pos/sessions${qs ? `?${qs}` : ''}`,
            {},
            scope
        )
        return res.data?.sessions ?? []
    } catch {
        // Graceful: POS module not deployed → empty list
        return []
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Transaction Operations
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateTransactionInput {
    session_id: string
    order_id?: string
    amount: number
    currency_code: string
    payment_method: 'cash' | 'card' | 'mixed' | 'voucher' | 'other'
    cash_tendered?: number
    receipt_number?: string
    customer_name?: string
    line_items_snapshot?: unknown[]
    discount_percent?: number
    notes?: string
}

export async function recordPOSTransaction(
    data: CreateTransactionInput,
    scope?: TenantMedusaScope | null
): Promise<{ transaction: PosTransaction | null; error: string | null }> {
    const res = await adminFetch<{ transaction: PosTransaction }>(
        '/admin/pos/transactions',
        {
            method: 'POST',
            body: JSON.stringify(data),
        },
        scope
    )
    return { transaction: res.data?.transaction ?? null, error: res.error }
}

export async function listPOSTransactions(
    filters?: { session_id?: string; payment_method?: string },
    scope?: TenantMedusaScope | null
): Promise<PosTransaction[]> {
    try {
        const params = new URLSearchParams()
        if (filters?.session_id) params.set('session_id', filters.session_id)
        if (filters?.payment_method) params.set('payment_method', filters.payment_method)
        const qs = params.toString()

        const res = await adminFetch<{ transactions: PosTransaction[] }>(
            `/admin/pos/transactions${qs ? `?${qs}` : ''}`,
            {},
            scope
        )
        return res.data?.transactions ?? []
    } catch {
        // Graceful: POS module not deployed → empty list
        return []
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Shift Operations
// ═══════════════════════════════════════════════════════════════════════════

export async function openPOSShift(
    data: {
        operator: string
        terminal_id?: string
        expected_cash?: number
    },
    scope?: TenantMedusaScope | null
): Promise<{ shift: PosShift | null; error: string | null }> {
    const res = await adminFetch<{ shift: PosShift }>(
        '/admin/pos/shifts',
        {
            method: 'POST',
            body: JSON.stringify(data),
        },
        scope
    )
    return { shift: res.data?.shift ?? null, error: res.error }
}

export async function closePOSShift(
    shiftId: string,
    data: {
        actual_cash?: number
        close_notes?: string
        transaction_count?: number
        total_revenue?: number
    },
    scope?: TenantMedusaScope | null
): Promise<{ shift: PosShift | null; error: string | null }> {
    const res = await adminFetch<{ shift: PosShift }>(
        `/admin/pos/shifts/${shiftId}`,
        {
            method: 'POST',
            body: JSON.stringify({
                status: 'closed',
                ...data,
            }),
        },
        scope
    )
    return { shift: res.data?.shift ?? null, error: res.error }
}

export async function getPOSShift(
    shiftId: string,
    scope?: TenantMedusaScope | null
): Promise<PosShift | null> {
    try {
        const res = await adminFetch<{ shift: PosShift }>(
            `/admin/pos/shifts/${shiftId}`,
            {},
            scope
        )
        return res.data?.shift ?? null
    } catch {
        // Graceful: POS module not deployed
        return null
    }
}

export async function listPOSShifts(
    filters?: { status?: string; operator?: string },
    scope?: TenantMedusaScope | null
): Promise<PosShift[]> {
    try {
        const params = new URLSearchParams()
        if (filters?.status) params.set('status', filters.status)
        if (filters?.operator) params.set('operator', filters.operator)
        const qs = params.toString()

        const res = await adminFetch<{ shifts: PosShift[] }>(
            `/admin/pos/shifts${qs ? `?${qs}` : ''}`,
            {},
            scope
        )
        return res.data?.shifts ?? []
    } catch {
        // Graceful: POS module not deployed → empty list
        return []
    }
}

/**
 * Update shift aggregates (called after each transaction).
 * Increments transaction_count and adds to total_revenue + expected_cash.
 */
export async function updateShiftAggregates(
    shiftId: string,
    transactionAmount: number,
    paymentMethod: string,
    scope?: TenantMedusaScope | null
): Promise<{ shift: PosShift | null; error: string | null }> {
    // Fetch current shift to calculate new totals
    const current = await getPOSShift(shiftId, scope)
    if (!current) {
        return { shift: null, error: `Shift ${shiftId} not found` }
    }

    const newCount = (current.transaction_count ?? 0) + 1
    const newRevenue = (current.total_revenue ?? 0) + transactionAmount

    // Only add to expected_cash for cash payments
    const cashDelta = paymentMethod === 'cash' ? transactionAmount : 0
    const newExpectedCash = (current.expected_cash ?? 0) + cashDelta

    const res = await adminFetch<{ shift: PosShift }>(
        `/admin/pos/shifts/${shiftId}`,
        {
            method: 'POST',
            body: JSON.stringify({
                transaction_count: newCount,
                total_revenue: newRevenue,
                expected_cash: newExpectedCash,
            }),
        },
        scope
    )
    return { shift: res.data?.shift ?? null, error: res.error }
}
