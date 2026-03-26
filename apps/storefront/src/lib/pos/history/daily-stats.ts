/**
 * POS Daily Stats — Server Action
 *
 * Aggregates daily KPIs from POS sales.
 * Gated by `enable_pos_reports` (Enterprise tier).
 */
'use server'

import { withPanelGuard } from '@/lib/panel-guard'
import type { DailyStats, PaymentMethod, POSSaleRecord } from '../pos-config'

// ---------------------------------------------------------------------------
// Get daily stats
// ---------------------------------------------------------------------------

export async function getDailyStatsAction(
    date?: string // YYYY-MM-DD, defaults to today
): Promise<{ stats: DailyStats | null; error?: string }> {
    try {
        const { appConfig } = await withPanelGuard()

        // Enterprise gate
        if (!appConfig?.featureFlags?.enable_pos_shifts) {
            return { stats: null, error: 'Upgrade to Enterprise for analytics' }
        }

        // Fetch all POS sales for the target date
        const targetDate = date || new Date().toISOString().split('T')[0]
        const dayStart = `${targetDate}T00:00:00.000Z`
        const dayEnd = `${targetDate}T23:59:59.999Z`

        // Use sales-history action internally
        const { getPOSSalesAction } = await import('./sales-history')
        const { sales } = await getPOSSalesAction({
            from: dayStart,
            to: dayEnd,
            limit: 500,
        })

        if (sales.length === 0) {
            return {
                stats: {
                    date: targetDate,
                    totalSales: 0,
                    totalRevenue: 0,
                    avgTicket: 0,
                    byPaymentMethod: {},
                    byHour: [],
                    topProducts: [],
                },
            }
        }

        return { stats: aggregateStats(targetDate, sales) }
    } catch (err) {
        return {
            stats: null,
            error: err instanceof Error ? err.message : 'Stats failed',
        }
    }
}

// ---------------------------------------------------------------------------
// Aggregation engine
// ---------------------------------------------------------------------------

function aggregateStats(date: string, sales: POSSaleRecord[]): DailyStats {
    const totalRevenue = sales.reduce((s, r) => s + r.total, 0)

    // By payment method
    const byPaymentMethod: DailyStats['byPaymentMethod'] = {}
    for (const sale of sales) {
        const pm = sale.payment_method as PaymentMethod
        if (!byPaymentMethod[pm]) {
            byPaymentMethod[pm] = { count: 0, total: 0 }
        }
        byPaymentMethod[pm]!.count++
        byPaymentMethod[pm]!.total += sale.total
    }

    // By hour (24 buckets)
    const hourBuckets = new Map<number, { count: number; total: number }>()
    for (const sale of sales) {
        const hour = new Date(sale.created_at).getHours()
        const bucket = hourBuckets.get(hour) || { count: 0, total: 0 }
        bucket.count++
        bucket.total += sale.total
        hourBuckets.set(hour, bucket)
    }
    const byHour = Array.from(hourBuckets.entries())
        .map(([hour, data]) => ({ hour, ...data }))
        .sort((a, b) => a.hour - b.hour)

    // Top products
    const productMap = new Map<string, { quantity: number; revenue: number }>()
    for (const sale of sales) {
        for (const item of sale.items) {
            const existing = productMap.get(item.title) || { quantity: 0, revenue: 0 }
            existing.quantity += item.quantity
            existing.revenue += item.unit_price * item.quantity
            productMap.set(item.title, existing)
        }
    }
    const topProducts = Array.from(productMap.entries())
        .map(([title, data]) => ({ title, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

    return {
        date,
        totalSales: sales.length,
        totalRevenue,
        avgTicket: sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0,
        byPaymentMethod,
        byHour,
        topProducts,
    }
}
