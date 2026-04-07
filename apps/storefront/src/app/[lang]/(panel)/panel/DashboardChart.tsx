'use client'

/**
 * DashboardChart — SOTA Multi-Currency Revenue & Orders Chart
 *
 * Displays a dual-axis chart: line layers per currency (revenue) + bar (orders).
 * Multi-currency tenants see N stacked lines with currency-colored fills.
 * Single-currency tenants see the classic dual-axis view.
 *
 * Uses Chart.js via PanelChart with interactive tooltips showing
 * currency-formatted amounts and order counts.
 */

import { useState, useMemo, useCallback } from 'react'
import PanelChart, { makeLineDataset, makeBarDataset } from '@/components/panel/PanelChart'
import PanelDateRangeFilter, { getDefaultDateRange, type DateRange } from '@/components/panel/PanelDateRangeFilter'
import { type CurrencyContext, formatAmount, getCurrencyChartColor, getCurrencySymbol } from '@/lib/currency-engine'
import type { ChartOptions, TooltipItem } from 'chart.js'

interface DashboardChartProps {
    /** Revenue data per day × currency */
    revenueByDay: { date: string; revenues: Record<string, number>; totalOrders: number }[]
    /** Order count data points — last 7 days */
    ordersByDay: { date: string; orders: number }[]
    /** Currency context from CurrencyEngine */
    currencyCtx: CurrencyContext
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
    currencyCtx,
    lang,
    labels,
}: DashboardChartProps) {
    const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
    
    // Active currency toggle for multi-currency view
    const [activeCurrency, setActiveCurrency] = useState<string | null>(null)
    const displayCurrencies = activeCurrency ? [activeCurrency] : currencyCtx.active

    // Build chart data with per-currency revenue lines
    const chartData = useMemo(() => {
        const dayLabels = revenueByDay.map(d => {
            const date = new Date(d.date)
            return date.toLocaleDateString(lang, { weekday: 'short', day: 'numeric' })
        })

        const datasets = []

        // Orders bar dataset (always first)
        datasets.push(makeBarDataset(
            labels.orders,
            ordersByDay.map(d => d.orders),
            '#8b5cf680'
        ))

        // Revenue line datasets — one per displayed currency
        for (const code of displayCurrencies) {
            const color = getCurrencyChartColor(code)
            const data = revenueByDay.map(d => (d.revenues[code] ?? 0) / 100)
            const symbol = getCurrencySymbol(code)
            
            datasets.push({
                ...makeLineDataset(
                    currencyCtx.isMulti ? `${labels.revenue} (${symbol})` : labels.revenue,
                    data,
                    color.border
                ),
                yAxisID: 'y1',
            })
        }

        return { labels: dayLabels, datasets }
    }, [revenueByDay, ordersByDay, displayCurrencies, currencyCtx.isMulti, lang, labels])

    // Chart options with dual axes and currency-aware tooltips
    const chartOptions = useMemo((): ChartOptions<'bar'> => ({
        interaction: {
            intersect: false,
            mode: 'index' as const,
        },
        plugins: {
            legend: {
                display: currencyCtx.isMulti,
                position: 'top' as const,
                align: 'end' as const,
                labels: {
                    usePointStyle: true,
                    pointStyleWidth: 8,
                    padding: 12,
                    font: { size: 11 },
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.85)',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                cornerRadius: 10,
                padding: 12,
                titleFont: { size: 13, weight: 'bold' as const },
                bodyFont: { size: 12 },
                callbacks: {
                    label: (ctx: TooltipItem<'bar'>) => {
                        const yVal = ctx.parsed.y ?? 0
                        const isRevenue = ctx.dataset.yAxisID === 'y1'
                        if (isRevenue) {
                            // Extract currency code from the dataset label
                            const code = displayCurrencies.find(c => {
                                const sym = getCurrencySymbol(c)
                                return ctx.dataset.label?.includes(sym) ?? false
                            }) || currencyCtx.primary
                            return `  ${ctx.dataset.label}: ${formatAmount(yVal * 100, code, lang)}`
                        }
                        return `  ${labels.orders}: ${yVal}`
                    },
                },
            },
        },
        scales: {
            y: {
                type: 'linear' as const,
                position: 'left' as const,
                beginAtZero: true,
                grid: { display: true, color: 'rgba(0,0,0,0.04)' },
                ticks: {
                    stepSize: 1,
                    font: { size: 11 },
                },
                title: {
                    display: false,
                },
            },
            y1: {
                type: 'linear' as const,
                position: 'right' as const,
                beginAtZero: true,
                grid: { display: false },
                ticks: {
                    font: { size: 11 },
                    callback: function(tickValue: string | number) {
                        const val = typeof tickValue === 'number' ? tickValue : parseFloat(tickValue)
                        return formatAmount(val * 100, currencyCtx.primary, lang)
                    },
                },
                title: {
                    display: false,
                },
            },
        },
    }), [currencyCtx, displayCurrencies, lang, labels])

    const handleCurrencyToggle = useCallback((code: string) => {
        setActiveCurrency(prev => prev === code ? null : code)
    }, [])

    return (
        <div className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h3 className="text-sm font-bold text-tx flex items-center gap-2">
                    📊 {labels.chartTitle}
                </h3>
                <div className="flex items-center gap-2">
                    {/* Currency filter pills — only show for multi-currency */}
                    {currencyCtx.isMulti && (
                        <div className="flex items-center gap-1 mr-2">
                            {currencyCtx.active.map(code => {
                                const color = getCurrencyChartColor(code)
                                const isActive = !activeCurrency || activeCurrency === code
                                return (
                                    <button
                                        key={code}
                                        onClick={() => handleCurrencyToggle(code)}
                                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all duration-200 ${
                                            isActive
                                                ? 'border-current shadow-sm scale-105'
                                                : 'border-sf-3/30 opacity-40 hover:opacity-70'
                                        }`}
                                        style={{
                                            color: color.border,
                                            backgroundColor: isActive ? color.bg : 'transparent',
                                        }}
                                    >
                                        {code.toUpperCase()}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                    <PanelDateRangeFilter
                        value={dateRange}
                        onChange={setDateRange}
                    />
                </div>
            </div>
            <PanelChart
                type="bar"
                data={chartData}
                options={chartOptions}
                height={300}
                hideLegend={false}
                ariaLabel={labels.chartTitle}
            />
        </div>
    )
}
