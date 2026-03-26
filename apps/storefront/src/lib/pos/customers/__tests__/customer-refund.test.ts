import { describe, it, expect } from 'vitest'
import type { POSCustomerResult, POSRefund, RefundReason } from '@/lib/pos/pos-config'

// ---------------------------------------------------------------------------
// Type contract tests — ensure Sprint 5 types are well-formed
// ---------------------------------------------------------------------------

describe('Sprint 5: Customer Management & Refunds – Types', () => {
    describe('POSCustomerResult', () => {
        it('should define the correct shape', () => {
            const customer: POSCustomerResult = {
                id: 'cus_test123',
                first_name: 'Juan',
                last_name: 'García',
                email: 'juan@example.com',
                phone: '+41 79 123 4567',
                orders_count: 5,
            }
            expect(customer.id).toBe('cus_test123')
            expect(customer.email).toBe('juan@example.com')
            expect(customer.orders_count).toBe(5)
        })

        it('should allow nullable first/last name and phone', () => {
            const customer: POSCustomerResult = {
                id: 'cus_anon',
                first_name: null,
                last_name: null,
                email: 'anon@example.com',
                phone: null,
                orders_count: 0,
            }
            expect(customer.first_name).toBeNull()
            expect(customer.last_name).toBeNull()
            expect(customer.phone).toBeNull()
        })
    })

    describe('POSRefund', () => {
        it('should define the correct shape for a completed refund', () => {
            const refund: POSRefund = {
                id: 'ref_1234567890',
                order_id: 'order_abc123',
                items: [
                    { title: 'Camiseta', quantity: 1, amount: 2500 },
                    { title: 'Pantalón', quantity: 2, amount: 6000 },
                ],
                reason: 'damaged',
                reason_note: 'Product arrived with tear',
                total_refund: 8500,
                currency_code: 'chf',
                created_at: '2026-03-21T12:00:00Z',
                status: 'completed',
            }
            expect(refund.items).toHaveLength(2)
            expect(refund.total_refund).toBe(8500)
            expect(refund.status).toBe('completed')
        })

        it('should allow all status values', () => {
            const statuses: POSRefund['status'][] = ['completed', 'pending', 'failed']
            expect(statuses).toHaveLength(3)
        })
    })

    describe('RefundReason', () => {
        it('should cover all 4 reasons', () => {
            const reasons: RefundReason[] = ['damaged', 'wrong_item', 'dissatisfied', 'other']
            expect(reasons).toHaveLength(4)
        })
    })
})

// ---------------------------------------------------------------------------
// Module export tests
// ---------------------------------------------------------------------------

describe('Sprint 5: Module exports', () => {
    it('customer-actions should export searchPOSCustomersAction', async () => {
        const mod = await import('@/lib/pos/customers/customer-actions')
        expect(mod.searchPOSCustomersAction).toBeTypeOf('function')
    })

    it('customer-actions should export createPOSCustomerAction', async () => {
        const mod = await import('@/lib/pos/customers/customer-actions')
        expect(mod.createPOSCustomerAction).toBeTypeOf('function')
    })

    it('refund-actions should export getRefundableItemsAction', async () => {
        const mod = await import('@/lib/pos/refunds/refund-actions')
        expect(mod.getRefundableItemsAction).toBeTypeOf('function')
    })

    it('refund-actions should export createPOSRefundAction', async () => {
        const mod = await import('@/lib/pos/refunds/refund-actions')
        expect(mod.createPOSRefundAction).toBeTypeOf('function')
    })
})

// ---------------------------------------------------------------------------
// Pure logic tests — refund amount calculation
// ---------------------------------------------------------------------------

describe('Sprint 5: Refund calculation logic', () => {
    const sampleItems = [
        { id: 'item_1', title: 'Widget', unit_price: 1500, quantity: 3 },
        { id: 'item_2', title: 'Gadget', unit_price: 2000, quantity: 1 },
        { id: 'item_3', title: 'Doohickey', unit_price: 500, quantity: 5 },
    ]

    function calculateRefundAmount(
        items: typeof sampleItems,
        selected: Map<string, number>
    ): number {
        return Array.from(selected.entries()).reduce((sum, [id, qty]) => {
            const item = items.find(i => i.id === id)
            return sum + (item?.unit_price || 0) * qty
        }, 0)
    }

    it('should calculate full refund for all items', () => {
        const selected = new Map<string, number>([
            ['item_1', 3],
            ['item_2', 1],
            ['item_3', 5],
        ])
        const total = calculateRefundAmount(sampleItems, selected)
        expect(total).toBe(1500 * 3 + 2000 * 1 + 500 * 5) // 4500 + 2000 + 2500 = 9000
    })

    it('should calculate partial refund for subset of items', () => {
        const selected = new Map<string, number>([['item_1', 1]])
        const total = calculateRefundAmount(sampleItems, selected)
        expect(total).toBe(1500)
    })

    it('should calculate partial quantity refund', () => {
        const selected = new Map<string, number>([['item_3', 2]])
        const total = calculateRefundAmount(sampleItems, selected)
        expect(total).toBe(1000)
    })

    it('should return 0 for empty selection', () => {
        const selected = new Map<string, number>()
        const total = calculateRefundAmount(sampleItems, selected)
        expect(total).toBe(0)
    })

    it('should handle unknown item IDs gracefully', () => {
        const selected = new Map<string, number>([['item_unknown', 1]])
        const total = calculateRefundAmount(sampleItems, selected)
        expect(total).toBe(0)
    })
})

// ---------------------------------------------------------------------------
// Customer display name logic
// ---------------------------------------------------------------------------

describe('Sprint 5: Customer display name', () => {
    function displayName(customer: POSCustomerResult): string {
        return [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.email
    }

    it('should show full name when available', () => {
        const c: POSCustomerResult = {
            id: '1', first_name: 'María', last_name: 'López',
            email: 'maria@test.com', phone: null, orders_count: 0,
        }
        expect(displayName(c)).toBe('María López')
    })

    it('should show first name only when last name is null', () => {
        const c: POSCustomerResult = {
            id: '2', first_name: 'Carlos', last_name: null,
            email: 'carlos@test.com', phone: null, orders_count: 0,
        }
        expect(displayName(c)).toBe('Carlos')
    })

    it('should fall back to email when both names are null', () => {
        const c: POSCustomerResult = {
            id: '3', first_name: null, last_name: null,
            email: 'anon@test.com', phone: null, orders_count: 0,
        }
        expect(displayName(c)).toBe('anon@test.com')
    })
})
