'use client'

/**
 * DashboardChart — Revenue & Orders Chart.js chart for the Dashboard
 *
 * Displays a dual-axis chart: bar (orders) + line (revenue).
 * Uses PanelChart with PanelDateRangeFilter.
 */

import { useState, useMemo } from 'react'
import PanelChart, { makeLineDataset, makeBarDataset } from '@/components/panel/PanelChart'
import PanelDateRangeFilter, { getDefaultDateRange, type DateRange } from '@/components/panel/PanelDateRangeFilter'
import type { ChartOptions, TooltipItem } from 'chart.js'

interface DashboardChartProps {
    /** Revenue data points (cents) — last 7 days */
    revenueByDay: { date: string; revenue: number }[]
    /** Order count data points — last 7 days */
    ordersByDay: { date: string; orders: number }[]
    /** Currency code */
    currency: string
    /** Locale for formatting */
    lang: string
    /** i18n labels */
    labels: {
        revenue: string
        orders: string
        chartTitle: string
    }
}

export default function DashboardChart({
    revenueByDay,
    ordersByDay,
    currency,
    lang,
    labels,
}: DashboardChartProps) {
    const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())

    // Format the chart data
    const chartData = useMemo(() => {
        const dayLabels = revenueByDay.map(d => {
            const date = new Date(d.date)
            return date.toLocaleDateString(lang, { weekday: 'short', day: 'numeric' })
        })

        return {
            labels: dayLabels,
            datasets: [
                makeBarDataset(labels.orders, ordersByDay.map(d => d.orders), '#8b5cf6'),
                makeLineDataset(labels.revenue, revenueByDay.map(d => d.revenue / 100)),
            ],
        }
    }, [revenueByDay, ordersByDay, lang, labels])

    const chartOptions = useMemo((): ChartOptions<'bar'> => ({
        plugins: {
            tooltip: {
                callbacks: {
                    label: (ctx: TooltipItem<'bar'>) => {
                        const yVal = ctx.parsed.y ?? 0
                        if (ctx.dataset.label === labels.revenue) {
                            return `${labels.revenue}: ${new Intl.NumberFormat(lang, {
                                style: 'currency',
                                currency,
                                minimumFractionDigits: 0,
                            }).format(yVal)}`
                        }
                        return `${ctx.dataset.label}: ${yVal}`
                    },
                },
            },
        },
    }), [currency, lang, labels])

    return (
        <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-tx">
                    📊 {labels.chartTitle}
                </h3>
                <PanelDateRangeFilter
                    value={dateRange}
                    onChange={setDateRange}
                />
            </div>
            <PanelChart
                type="bar"
                data={chartData}
                options={chartOptions}
                height={280}
                ariaLabel={labels.chartTitle}
            />
        </div>
    )
}
