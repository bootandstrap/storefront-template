/**
 * RevenueChart30Day — SOTA 30-day revenue + orders chart.
 *
 * RSC wrapper that passes data to a client-side chart component.
 * Uses gradient fills, smooth curves, and a collapsible POS/Online split.
 */

import { SotaBentoItem } from '@/components/panel'
import type { DashboardContext } from '../_lib/dashboard-context'
import RevenueChartClient, { type RevenueByDayEntry } from './RevenueChartClient'

interface Props {
    ctx: DashboardContext
}

export default function RevenueChart30Day({ ctx }: Props) {
    const { revenue, lang, t } = ctx
    const { ordersByDay, revenueByDay, formattedRevenue, hasPosOrders, posPrimary, onlinePrimary, currencyCtx } = revenue

    // Map to client-friendly shape
    const chartRevenue: RevenueByDayEntry[] = revenueByDay.map(d => ({
        date: d.date,
        primaryAmount: d.revenues[currencyCtx.primary] ?? d.totalBaseRevenue ?? 0,
        totalOrders: d.totalOrders,
    }))

    return (
        <SotaBentoItem colSpan={{ base: 12 }}>
            <RevenueChartClient
                ordersByDay={ordersByDay}
                revenueByDay={chartRevenue}
                formattedRevenue={formattedRevenue}
                hasPosOrders={hasPosOrders}
                posPrimary={posPrimary}
                onlinePrimary={onlinePrimary}
                primaryCurrency={currencyCtx.primary}
                lang={lang}
                labels={{
                    title: t('panel.stats.revenue') || 'Revenue',
                    orders: t('panel.stats.ordersMonth') || 'Orders',
                    last30: t('panel.chart.last30') || 'Last 30 days',
                    pos: 'POS',
                    online: 'Online',
                    noData: t('panel.chart.noData') || 'No data yet',
                }}
            />
        </SotaBentoItem>
    )
}
