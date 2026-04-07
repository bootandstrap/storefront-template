'use client'

/**
 * AnalyticsCharts — SOTA Interactive Charts for Analytics Dashboard
 *
 * Features:
 * - Revenue trend line chart with per-currency colored layers
 * - Orders bar chart overlay (dual-axis)
 * - Revenue-by-currency doughnut chart (multi-currency tenants)
 * - Interactive currency toggle, tab switching, hover tooltips
 * - Top products horizontal bar chart
 *
 * Built on Chart.js via PanelChart component.
 *
 * @module AnalyticsCharts
 */

import { useState, useMemo, useCallback } from 'react'
import PanelChart, { makeLineDataset, makeBarDataset, makeDoughnutDataset } from '@/components/panel/PanelChart'
import {
    type CurrencyContext,
    type CurrencyRevenue,
    formatAmount,
    getCurrencyChartColor,
    getCurrencySymbol,
} from '@/lib/currency-engine'
import type { MultiCurrencyRevenue, TopProduct } from '@/lib/medusa/admin-analytics'
import type { ChartOptions, TooltipItem } from 'chart.js'
import { BarChart3, PieChart, TrendingUp, Award } from 'lucide-react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AnalyticsChartsProps {
    revenueByDay: { date: string; revenues: Record<string, number>; totalBaseRevenue: number; totalOrders: number }[]
    ordersByDay: { date: string; orders: number }[]
    currencyCtx: CurrencyContext
    revenueMonth: MultiCurrencyRevenue
    topProducts: TopProduct[]
    lang: string
    labels: {
        revenue: string
        orders: string
        chartTitle: string
        currencyBreakdown: string
        topProducts: string
    }
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type ChartTab = 'trend' | 'currency' | 'products'

const TABS: { key: ChartTab; icon: React.ReactNode; label: string }[] = [
    { key: 'trend', icon: <TrendingUp className="w-4 h-4" />, label: 'Revenue Trend' },
    { key: 'currency', icon: <PieChart className="w-4 h-4" />, label: 'Currency Split' },
    { key: 'products', icon: <Award className="w-4 h-4" />, label: 'Top Products' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnalyticsCharts({
    revenueByDay,
    ordersByDay,
    currencyCtx,
    revenueMonth,
    topProducts,
    lang,
    labels,
}: AnalyticsChartsProps) {
    const [activeTab, setActiveTab] = useState<ChartTab>('trend')
    const [hoveredCurrency, setHoveredCurrency] = useState<string | null>(null)

    // Visible tabs — hide currency tab for single-currency tenants
    const visibleTabs = TABS.filter(tab => {
        if (tab.key === 'currency' && !currencyCtx.isMulti) return false
        if (tab.key === 'products' && topProducts.length === 0) return false
        return true
    })

    return (
        <div>
            {/* ── Tab Navigation ── */}
            <div className="flex items-center gap-1 mb-6 p-1 bg-sf-2/40 rounded-xl w-fit">
                {visibleTabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                            activeTab === tab.key
                                ? 'bg-sf-0 text-tx shadow-sm scale-[1.02]'
                                : 'text-tx-muted hover:text-tx hover:bg-sf-0/50'
                        }`}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Chart Panels ── */}
            {activeTab === 'trend' && (
                <RevenueTrendChart
                    revenueByDay={revenueByDay}
                    ordersByDay={ordersByDay}
                    currencyCtx={currencyCtx}
                    lang={lang}
                    labels={labels}
                />
            )}

            {activeTab === 'currency' && currencyCtx.isMulti && (
                <CurrencyDoughnutChart
                    revenueMonth={revenueMonth}
                    currencyCtx={currencyCtx}
                    hoveredCurrency={hoveredCurrency}
                    onHoverCurrency={setHoveredCurrency}
                    lang={lang}
                    label={labels.currencyBreakdown}
                />
            )}

            {activeTab === 'products' && topProducts.length > 0 && (
                <TopProductsChart
                    topProducts={topProducts}
                    lang={lang}
                    label={labels.topProducts}
                />
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Revenue Trend Chart (Line + Bar dual-axis)
// ---------------------------------------------------------------------------

function RevenueTrendChart({
    revenueByDay,
    ordersByDay,
    currencyCtx,
    lang,
    labels,
}: {
    revenueByDay: { date: string; revenues: Record<string, number>; totalBaseRevenue: number; totalOrders: number }[]
    ordersByDay: { date: string; orders: number }[]
    currencyCtx: CurrencyContext
    lang: string
    labels: { revenue: string; orders: string; chartTitle: string }
}) {
    const [activeCurrency, setActiveCurrency] = useState<string | null>(null)
    const displayCurrencies = activeCurrency ? [activeCurrency] : currencyCtx.active

    const chartData = useMemo(() => {
        const dayLabels = revenueByDay.map(d => {
            const date = new Date(d.date)
            return date.toLocaleDateString(lang, { weekday: 'short', day: 'numeric' })
        })

        const datasets = []

        // Orders bar
        datasets.push({
            ...makeBarDataset(labels.orders, ordersByDay.map(d => d.orders), '#8b5cf6'),
            yAxisID: 'y',
            barPercentage: 0.5,
            categoryPercentage: 0.7,
        })

        // Revenue lines per currency
        for (const code of displayCurrencies) {
            const color = getCurrencyChartColor(code)
            const symbol = getCurrencySymbol(code)
            datasets.push({
                ...makeLineDataset(
                    currencyCtx.isMulti ? `${labels.revenue} (${symbol})` : labels.revenue,
                    revenueByDay.map(d => (d.revenues[code] ?? 0) / 100),
                    color.border
                ),
                yAxisID: 'y1',
            })
        }

        // Unified Base Line for Multi-Currency total overviews
        if (currencyCtx.isMulti && !activeCurrency) {
            datasets.push({
                ...makeLineDataset(
                    `${labels.revenue} (Unified ${currencyCtx.primary.toUpperCase()})`,
                    revenueByDay.map(d => (d.totalBaseRevenue ?? 0) / 100),
                    '#14b8a6' // Teal
                ),
                yAxisID: 'y1',
                borderDash: [5, 5],
                borderWidth: 3,
                tension: 0.4
            })
        }

        return { labels: dayLabels, datasets }
    }, [revenueByDay, ordersByDay, displayCurrencies, currencyCtx.isMulti, lang, labels])

    const options = useMemo((): ChartOptions<'bar'> => ({
        interaction: { intersect: false, mode: 'index' as const },
        plugins: {
            legend: { display: true, position: 'top' as const, align: 'end' as const, labels: { usePointStyle: true, pointStyleWidth: 8, padding: 16, font: { size: 11 } } },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.88)',
                borderColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                cornerRadius: 12,
                padding: 14,
                titleFont: { size: 13, weight: 'bold' as const },
                bodyFont: { size: 12 },
                callbacks: {
                    label: (ctx: TooltipItem<'bar'>) => {
                        const v = ctx.parsed.y ?? 0
                        if (ctx.dataset.yAxisID === 'y1') {
                            const code = displayCurrencies.find(c => ctx.dataset.label?.includes(getCurrencySymbol(c))) || currencyCtx.primary
                            return `  ${ctx.dataset.label}: ${formatAmount(v * 100, code, lang)}`
                        }
                        return `  ${labels.orders}: ${v}`
                    },
                },
            },
        },
        scales: {
            y: {
                type: 'linear' as const, position: 'left' as const, beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.04)' },
                ticks: { stepSize: 1, font: { size: 11 } },
                border: { display: false },
            },
            y1: {
                type: 'linear' as const, position: 'right' as const, beginAtZero: true,
                grid: { display: false },
                ticks: {
                    font: { size: 11 },
                    callback(v: string | number) {
                        const val = typeof v === 'number' ? v : parseFloat(v)
                        return formatAmount(val * 100, currencyCtx.primary, lang)
                    },
                },
                border: { display: false },
            },
        },
    }), [currencyCtx, displayCurrencies, lang, labels])

    return (
        <div>
            {/* Currency filter pills */}
            {currencyCtx.isMulti && (
                <div className="flex items-center gap-1.5 mb-4">
                    <span className="text-[10px] text-tx-muted font-medium mr-1">Filter:</span>
                    {currencyCtx.active.map(code => {
                        const color = getCurrencyChartColor(code)
                        const isActive = !activeCurrency || activeCurrency === code
                        return (
                            <button
                                key={code}
                                onClick={() => setActiveCurrency(prev => prev === code ? null : code)}
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
            <PanelChart
                type="bar"
                data={chartData}
                options={options}
                height={320}
                hideLegend={false}
                ariaLabel={labels.chartTitle}
            />
        </div>
    )
}

// ---------------------------------------------------------------------------
// Currency Doughnut Chart
// ---------------------------------------------------------------------------

function CurrencyDoughnutChart({
    revenueMonth,
    currencyCtx,
    hoveredCurrency,
    onHoverCurrency,
    lang,
    label,
}: {
    revenueMonth: MultiCurrencyRevenue
    currencyCtx: CurrencyContext
    hoveredCurrency: string | null
    onHoverCurrency: (code: string | null) => void
    lang: string
    label: string
}) {
    const sortedRevenues = revenueMonth.all.filter(r => r.amount > 0)
    // Use unified base amount to avoid mixing apples and oranges (e.g. EUR + MXN)
    const unifiedTotal = revenueMonth.totalBaseAmount

    const chartData = useMemo(() => {
        const colors = sortedRevenues.map(r => getCurrencyChartColor(r.code).border)
        return {
            labels: sortedRevenues.map(r => r.code.toUpperCase()),
            datasets: [{
                ...makeDoughnutDataset(
                    // Draw slices proportional to their unified base amount
                    sortedRevenues.map(r => r.baseAmount / 100),
                    colors
                ),
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.8)',
            }],
        }
    }, [sortedRevenues])

    const options = useMemo((): ChartOptions<'doughnut'> => ({
        cutout: '72%',
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.88)',
                cornerRadius: 12,
                padding: 14,
                callbacks: {
                    label: (ctx: TooltipItem<'doughnut'>) => {
                        const idx = ctx.dataIndex
                        const rev = sortedRevenues[idx]
                        if (!rev) return ''
                        const pct = unifiedTotal > 0 ? ((rev.baseAmount / unifiedTotal) * 100).toFixed(1) : '0'
                        return `  ${formatAmount(rev.amount, rev.code, lang)} (${pct}%)`
                    },
                },
            },
        },
    }), [sortedRevenues, unifiedTotal, lang])

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Doughnut */}
            <div className="relative mx-auto" style={{ width: 280, height: 280 }}>
                <PanelChart
                    type="doughnut"
                    data={chartData}
                    options={options}
                    height={280}
                    ariaLabel={label}
                />
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-tx-muted font-medium uppercase tracking-wider">Total</span>
                    <span className="text-xl font-bold font-display text-tx tabular-nums">
                        {formatAmount(unifiedTotal, currencyCtx.primary, lang)}
                    </span>
                </div>
            </div>

            {/* Currency legend with amounts */}
            <div className="space-y-3">
                <h4 className="text-sm font-bold text-tx mb-4">{label}</h4>
                {sortedRevenues.map(rev => {
                    const color = getCurrencyChartColor(rev.code)
                    const pct = unifiedTotal > 0 ? ((rev.baseAmount / unifiedTotal) * 100).toFixed(1) : '0'
                    const isHovered = hoveredCurrency === rev.code

                    return (
                        <div
                            key={rev.code}
                            className={`flex items-center gap-4 p-3 rounded-xl border transition-all duration-200 cursor-default ${
                                isHovered
                                    ? 'border-current bg-sf-1/50 scale-[1.02] shadow-sm'
                                    : 'border-sf-3/20 hover:border-sf-3/40'
                            }`}
                            style={{ borderColor: isHovered ? color.border : undefined }}
                            onMouseEnter={() => onHoverCurrency(rev.code)}
                            onMouseLeave={() => onHoverCurrency(null)}
                        >
                            {/* Color dot */}
                            <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color.border }}
                            />
                            {/* Currency info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-tx">{rev.code.toUpperCase()}</span>
                                    <span className="text-sm font-bold text-tx tabular-nums">
                                        {formatAmount(rev.amount, rev.code, lang)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] text-tx-muted">
                                        {rev.orderCount} orders · AOV {formatAmount(rev.avgOrderValue, rev.code, lang)}
                                    </span>
                                    <span className="text-[10px] font-semibold text-tx-muted">{pct}%</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Top Products Horizontal Bar Chart
// ---------------------------------------------------------------------------

function TopProductsChart({
    topProducts,
    lang,
    label,
}: {
    topProducts: TopProduct[]
    lang: string
    label: string
}) {
    const chartData = useMemo(() => ({
        labels: topProducts.map(p => p.title.length > 20 ? p.title.slice(0, 20) + '…' : p.title),
        datasets: [{
            ...makeBarDataset(label, topProducts.map(p => p.revenue / 100)),
            backgroundColor: topProducts.map((_, i) => {
                const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe']
                return colors[i] || colors[colors.length - 1]
            }),
            borderRadius: 8,
            barPercentage: 0.6,
        }],
    }), [topProducts, label])

    const options = useMemo((): ChartOptions<'bar'> => ({
        indexAxis: 'y' as const,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.88)',
                cornerRadius: 12,
                padding: 14,
                callbacks: {
                    label: (ctx: TooltipItem<'bar'>) => {
                        const product = topProducts[ctx.dataIndex]
                        if (!product) return ''
                        return `  ${formatAmount(product.revenue, product.currency_code, lang)} · ${product.units_sold} sold`
                    },
                },
            },
        },
        scales: {
            x: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.04)' },
                ticks: {
                    font: { size: 11 },
                    callback(v: string | number) {
                        const val = typeof v === 'number' ? v : parseFloat(v)
                        return formatAmount(val * 100, topProducts[0]?.currency_code || 'eur', lang)
                    },
                },
                border: { display: false },
            },
            y: {
                grid: { display: false },
                ticks: { font: { size: 11, weight: 'bold' as const } },
                border: { display: false },
            },
        },
    }), [topProducts, lang])

    return (
        <PanelChart
            type="bar"
            data={chartData}
            options={options}
            height={Math.max(200, topProducts.length * 60)}
            ariaLabel={label}
        />
    )
}
