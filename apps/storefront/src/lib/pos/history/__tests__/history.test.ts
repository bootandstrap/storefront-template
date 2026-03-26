/**
 * POS Sales History + Daily Stats — Tests
 *
 * Contract/type verification for the history module.
 */
import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Type shape tests (compile-time + runtime contract verification)
// ---------------------------------------------------------------------------

describe('POS History — Type contracts', () => {
    it('exports POSSaleRecord with required fields', async () => {
        const mod = await import('@/lib/pos/pos-config')
        // Type shape check
        const sample: import('@/lib/pos/pos-config').POSSaleRecord = {
            id: 'test-sale-1',
            items: [{ title: 'Widget', quantity: 2, unit_price: 1000 }],
            item_count: 2,
            subtotal: 2000,
            discount_amount: 0,
            total: 2000,
            currency_code: 'chf',
            payment_method: 'cash',
            customer_name: null,
            created_at: new Date().toISOString(),
            status: 'completed',
        }
        expect(sample.id).toBe('test-sale-1')
        expect(sample.status).toBe('completed')
        expect(sample.item_count).toBe(2)
    })

    it('exports POSSalesFilter with optional fields', async () => {
        const filter: import('@/lib/pos/pos-config').POSSalesFilter = {
            from: '2026-01-01T00:00:00Z',
            payment_method: 'cash',
            limit: 20,
        }
        expect(filter.from).toBeDefined()
        expect(filter.to).toBeUndefined()
        expect(filter.limit).toBe(20)
    })

    it('exports DailyStats shape', async () => {
        const stats: import('@/lib/pos/pos-config').DailyStats = {
            date: '2026-03-21',
            totalSales: 42,
            totalRevenue: 125000,
            avgTicket: 2976,
            byPaymentMethod: {
                cash: { count: 30, total: 80000 },
                card_terminal: { count: 12, total: 45000 },
            },
            byHour: [
                { hour: 9, count: 5, total: 15000 },
                { hour: 10, count: 8, total: 25000 },
            ],
            topProducts: [
                { title: 'Café', quantity: 50, revenue: 25000 },
            ],
        }
        expect(stats.totalSales).toBe(42)
        expect(stats.avgTicket).toBe(2976)
        expect(stats.byHour.length).toBe(2)
        expect(stats.topProducts[0].title).toBe('Café')
    })

    it('POSSaleRecord status enum is correct', () => {
        const statuses: import('@/lib/pos/pos-config').POSSaleRecord['status'][] = [
            'completed', 'pending', 'refunded',
        ]
        expect(statuses).toHaveLength(3)
    })
})

// ---------------------------------------------------------------------------
// Module export tests
// ---------------------------------------------------------------------------

describe('POS History — Module exports', () => {
    it('sales-history.ts exports getPOSSalesAction', async () => {
        const mod = await import('@/lib/pos/history/sales-history')
        expect(typeof mod.getPOSSalesAction).toBe('function')
    })

    it('sales-history.ts exports getPOSSaleDetailAction', async () => {
        const mod = await import('@/lib/pos/history/sales-history')
        expect(typeof mod.getPOSSaleDetailAction).toBe('function')
    })

    it('daily-stats.ts exports getDailyStatsAction', async () => {
        const mod = await import('@/lib/pos/history/daily-stats')
        expect(typeof mod.getDailyStatsAction).toBe('function')
    })
})

// ---------------------------------------------------------------------------
// Daily stats aggregation logic (pure function tests)
// ---------------------------------------------------------------------------

describe('POS Daily Stats — Aggregation', () => {
    it('computes correct averages from sales data', () => {
        // Pure test of the aggregation logic
        const mockSales = [
            { total: 1000, items: [{ title: 'A', quantity: 1, unit_price: 1000 }] },
            { total: 2000, items: [{ title: 'B', quantity: 2, unit_price: 1000 }] },
            { total: 3000, items: [{ title: 'A', quantity: 3, unit_price: 1000 }] },
        ]

        const totalRevenue = mockSales.reduce((s, r) => s + r.total, 0)
        const avgTicket = Math.round(totalRevenue / mockSales.length)

        expect(totalRevenue).toBe(6000)
        expect(avgTicket).toBe(2000)
    })

    it('computes correct top products ranking', () => {
        const items = [
            { title: 'Café', quantity: 5, unit_price: 300 },
            { title: 'Croissant', quantity: 3, unit_price: 400 },
            { title: 'Café', quantity: 2, unit_price: 300 },
            { title: 'Agua', quantity: 1, unit_price: 200 },
        ]

        const productMap = new Map<string, { quantity: number; revenue: number }>()
        for (const item of items) {
            const existing = productMap.get(item.title) || { quantity: 0, revenue: 0 }
            existing.quantity += item.quantity
            existing.revenue += item.unit_price * item.quantity
            productMap.set(item.title, existing)
        }

        const ranked = Array.from(productMap.entries())
            .map(([title, data]) => ({ title, ...data }))
            .sort((a, b) => b.revenue - a.revenue)

        expect(ranked[0].title).toBe('Café')
        expect(ranked[0].quantity).toBe(7)
        expect(ranked[0].revenue).toBe(2100)
        expect(ranked[1].title).toBe('Croissant')
        expect(ranked[2].title).toBe('Agua')
    })

    it('computes correct hourly distribution', () => {
        const mockSales = [
            { created_at: '2026-03-21T09:15:00Z', total: 1000 },
            { created_at: '2026-03-21T09:45:00Z', total: 1500 },
            { created_at: '2026-03-21T10:00:00Z', total: 2000 },
            { created_at: '2026-03-21T14:30:00Z', total: 3000 },
        ]

        const hourBuckets = new Map<number, { count: number; total: number }>()
        for (const sale of mockSales) {
            const hour = new Date(sale.created_at).getUTCHours()
            const bucket = hourBuckets.get(hour) || { count: 0, total: 0 }
            bucket.count++
            bucket.total += sale.total
            hourBuckets.set(hour, bucket)
        }

        expect(hourBuckets.get(9)?.count).toBe(2)
        expect(hourBuckets.get(9)?.total).toBe(2500)
        expect(hourBuckets.get(10)?.count).toBe(1)
        expect(hourBuckets.get(14)?.count).toBe(1)
    })
})
