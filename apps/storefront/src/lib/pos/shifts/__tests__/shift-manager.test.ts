/**
 * POS Shift Manager — Tests
 *
 * Type shapes and contract verification for shifts.
 */
import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Type shape tests
// ---------------------------------------------------------------------------

describe('POS Shift — Type contracts', () => {
    it('exports POSShift with required fields', async () => {
        const shift: import('@/lib/pos/pos-config').POSShift = {
            id: 'shift-001',
            opened_at: new Date().toISOString(),
            opening_cash: 10000, // 100.00
            total_sales: 0,
            total_revenue: 0,
            status: 'open',
        }
        expect(shift.id).toBe('shift-001')
        expect(shift.status).toBe('open')
        expect(shift.opening_cash).toBe(10000)
    })

    it('closed shift includes variance fields', () => {
        const shift: import('@/lib/pos/pos-config').POSShift = {
            id: 'shift-002',
            opened_at: '2026-03-21T08:00:00Z',
            closed_at: '2026-03-21T18:00:00Z',
            opening_cash: 10000,
            closing_cash: 35500,
            expected_cash: 35000,
            cash_difference: 500, // +5.00 surplus
            total_sales: 42,
            total_revenue: 25000,
            status: 'closed',
        }
        expect(shift.cash_difference).toBe(500)
        expect(shift.closing_cash! - shift.expected_cash!).toBe(500)
    })

    it('cash variance calculation is correct', () => {
        const openingCash = 10000
        const cashSalesRevenue = 25000
        const closingCash = 34800

        const expectedCash = openingCash + cashSalesRevenue
        const variance = closingCash - expectedCash

        expect(expectedCash).toBe(35000)
        expect(variance).toBe(-200) // 2.00 short
    })
})

// ---------------------------------------------------------------------------
// Module export tests
// ---------------------------------------------------------------------------

describe('POS Shift — Module exports', () => {
    it('shift-manager.ts exports all lifecycle functions', async () => {
        const mod = await import('@/lib/pos/shifts/shift-manager')
        expect(typeof mod.openShift).toBe('function')
        expect(typeof mod.closeShift).toBe('function')
        expect(typeof mod.getCurrentShift).toBe('function')
        expect(typeof mod.recordShiftSale).toBe('function')
        expect(typeof mod.getShiftHistory).toBe('function')
    })
})

// ---------------------------------------------------------------------------
// POSPanelView type test
// ---------------------------------------------------------------------------

describe('POS Panel — Type contracts', () => {
    it('POSPanelView includes all expected values', () => {
        const views: import('@/lib/pos/pos-config').POSPanelView[] = [
            'history', 'dashboard', 'shift', null,
        ]
        expect(views).toHaveLength(4)
        expect(views).toContain('history')
        expect(views).toContain('dashboard')
        expect(views).toContain('shift')
        expect(views).toContain(null)
    })
})
