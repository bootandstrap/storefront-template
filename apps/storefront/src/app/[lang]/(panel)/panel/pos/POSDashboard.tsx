/**
 * POS Dashboard — SOTA Analytics with Chart.js
 *
 * Daily summary view with Chart.js-powered visualizations:
 * - KPI cards with trend deltas
 * - Hourly sales bar chart (Chart.js Bar)
 * - Payment method doughnut (Chart.js Doughnut)
 * - Weekly revenue trend (Chart.js Line — 7-day view)
 * - Top products ranking with animated bars
 * Feature-gated: Enterprise tier (`enable_pos_reports`).
 */
'use client'

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import {
    X, TrendingUp, ShoppingCart, Receipt, Banknote,
    ChevronLeft, ChevronRight, BarChart3, Package, ArrowUpRight,
    ArrowDownRight, Calendar, Download,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DailyStats, PaymentMethod } from '@/lib/pos/pos-config'
import { posLabel } from '@/lib/pos/pos-i18n'

// Lazy load Chart.js (only imported when dashboard is opened)
const PanelChart = lazy(() => import('@/components/panel/PanelChart'))

interface POSDashboardProps {
    onClose: () => void
    labels: Record<string, string>
    defaultCurrency: string
}

const PAYMENT_COLORS: Record<PaymentMethod, string> = {
    cash: '#22c55e',
    card_terminal: '#3b82f6',
    twint: '#8b5cf6',
    manual_card: '#f59e0b',
}

const PAYMENT_LABEL_KEYS: Record<PaymentMethod, string> = {
    cash: 'panel.pos.cash',
    card_terminal: 'panel.pos.cardTerminal',
    twint: 'panel.pos.twint',
    manual_card: 'panel.pos.manualCard',
}

type DashboardTab = 'today' | 'week'

export default function POSDashboard({
    onClose,
    labels,
    defaultCurrency,
}: POSDashboardProps) {
    const [stats, setStats] = useState<DailyStats | null>(null)
    const [prevStats, setPrevStats] = useState<DailyStats | null>(null)
    const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [dateOffset, setDateOffset] = useState(0)
    const [activeTab, setActiveTab] = useState<DashboardTab>('today')

    const formatCurrency = useCallback((amount: number) =>
        new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: defaultCurrency,
        }).format(amount / 100),
    [defaultCurrency])

    const targetDate = new Date(Date.now() + dateOffset * 86400000)
        .toISOString().split('T')[0]

    // ── Fetch today + previous day stats ──
    const fetchStats = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const { getDailyStatsAction } = await import('@/lib/pos/history/daily-stats')
            const prevDate = new Date(Date.now() + (dateOffset - 1) * 86400000)
                .toISOString().split('T')[0]

            const [result, prevResult] = await Promise.all([
                getDailyStatsAction(targetDate),
                getDailyStatsAction(prevDate),
            ])
            if (result.error) setError(result.error)
            setStats(result.stats)
            setPrevStats(prevResult.stats)
        } catch {
            setError('Failed to load stats')
        }
        setLoading(false)
    }, [targetDate, dateOffset])

    // ── Fetch weekly stats for trend chart ──
    const fetchWeekly = useCallback(async () => {
        try {
            const { getDailyStatsAction } = await import('@/lib/pos/history/daily-stats')
            const promises = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(Date.now() + (dateOffset - 6 + i) * 86400000)
                    .toISOString().split('T')[0]
                return getDailyStatsAction(d)
            })
            const results = await Promise.all(promises)
            setWeeklyStats(results.map(r => r.stats).filter(Boolean) as DailyStats[])
        } catch { /* silent */ }
    }, [dateOffset])

    useEffect(() => { fetchStats() }, [fetchStats])
    useEffect(() => { if (activeTab === 'week') fetchWeekly() }, [activeTab, fetchWeekly])

    // ── Trend calculation ──
    const getDelta = (current: number, prev: number): { value: number; isUp: boolean } => {
        if (!prev || prev === 0) return { value: 0, isUp: true }
        const pct = Math.round(((current - prev) / prev) * 100)
        return { value: Math.abs(pct), isUp: pct >= 0 }
    }

    // ── Chart.js data: Hourly sales bar ──
    const hourlyChartData = useMemo(() => {
        if (!stats) return null
        const hourLabels = Array.from({ length: 24 }, (_, h) => `${h}:00`)
        const hourData = Array.from({ length: 24 }, (_, h) => {
            const bucket = stats.byHour.find(b => b.hour === h)
            return bucket ? bucket.total / 100 : 0
        })
        const hourCounts = Array.from({ length: 24 }, (_, h) => {
            const bucket = stats.byHour.find(b => b.hour === h)
            return bucket ? bucket.count : 0
        })

        return {
            labels: hourLabels,
            datasets: [{
                label: posLabel('panel.pos.revenue', labels) || 'Revenue',
                data: hourData,
                backgroundColor: hourData.map(v => v > 0 ? 'rgba(99, 102, 241, 0.7)' : 'rgba(99, 102, 241, 0.1)'),
                hoverBackgroundColor: 'rgba(99, 102, 241, 0.9)',
                borderRadius: 4,
                borderSkipped: false as const,
                barPercentage: 0.8,
                categoryPercentage: 0.9,
            }],
            _counts: hourCounts, // metadata, not rendered
        }
    }, [stats, labels])

    // ── Chart.js data: Payment method doughnut ──
    const paymentChartData = useMemo(() => {
        if (!stats) return null
        const methods = Object.entries(stats.byPaymentMethod).filter(([, d]) => d && d.total > 0)
        if (methods.length === 0) return null

        return {
            labels: methods.map(([m]) => posLabel(PAYMENT_LABEL_KEYS[m as PaymentMethod] || 'panel.pos.other', labels)),
            datasets: [{
                data: methods.map(([, d]) => d!.total / 100),
                backgroundColor: methods.map(([m]) => PAYMENT_COLORS[m as PaymentMethod] || '#94a3b8'),
                hoverBackgroundColor: methods.map(([m]) => (PAYMENT_COLORS[m as PaymentMethod] || '#94a3b8') + 'e6'),
                borderWidth: 0,
                hoverOffset: 6,
            }],
        }
    }, [stats, labels])

    // ── Chart.js data: Weekly trend line ──
    const weeklyChartData = useMemo(() => {
        if (weeklyStats.length === 0) return null
        return {
            labels: weeklyStats.map(s => {
                const d = new Date(s.date)
                return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
            }),
            datasets: [{
                label: posLabel('panel.pos.revenue', labels) || 'Revenue',
                data: weeklyStats.map(s => s.totalRevenue / 100),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                borderWidth: 2.5,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#6366f1',
                pointHoverBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true,
            }, {
                label: posLabel('panel.pos.totalSales', labels) || 'Sales',
                data: weeklyStats.map(s => s.totalSales),
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: '#22c55e',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true,
                yAxisID: 'y1',
            }],
        }
    }, [weeklyStats, labels])

    const weeklyChartOptions = useMemo(() => ({
        scales: {
            y: {
                position: 'left' as const,
                title: {
                    display: true,
                    text: posLabel('panel.pos.revenue', labels) || 'Revenue',
                    font: { size: 10 },
                },
            },
            y1: {
                position: 'right' as const,
                grid: { drawOnChartArea: false },
                title: {
                    display: true,
                    text: posLabel('panel.pos.totalSales', labels) || 'Sales',
                    font: { size: 10 },
                },
                beginAtZero: true,
            },
        },
        plugins: {
            legend: { display: true },
        },
    }), [labels])

    // ── KPI deltas ──
    const revenueDelta = getDelta(stats?.totalRevenue || 0, prevStats?.totalRevenue || 0)
    const salesDelta = getDelta(stats?.totalSales || 0, prevStats?.totalSales || 0)
    const ticketDelta = getDelta(stats?.avgTicket || 0, prevStats?.avgTicket || 0)

    return (
        <div className="fixed inset-0 z-40 flex justify-end">
            {/* Backdrop */}
            <motion.div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onClose}
            />

            {/* Panel */}
            <motion.div
                className="relative w-full max-w-lg bg-sf-0 shadow-2xl flex flex-col overflow-hidden"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-sf-2 bg-glass-heavy backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-subtle to-brand-subtle flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-brand" />
                        </div>
                        <div>
                            <h2 className="font-bold text-tx text-base leading-tight">
                                {labels['panel.pos.dashboard'] || 'Dashboard'}
                            </h2>
                            <p className="text-[11px] text-tx-muted">{posLabel('panel.pos.daySummary', labels)}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label={labels['panel.pos.close'] || 'Close dashboard'}
                        className="p-2 rounded-xl hover:bg-sf-1 transition-colors
                                   focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                    >
                        <X className="w-4 h-4 text-tx-muted" />
                    </button>
                </div>

                {/* ── Tab bar: Today / Week ── */}
                <div className="flex items-center px-5 py-2 gap-1.5 border-b border-sf-2 bg-glass">
                    {(['today', 'week'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px]
                                       focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none
                                       ${activeTab === tab
                                    ? 'text-brand'
                                    : 'text-tx-muted hover:text-tx-sec hover:bg-sf-1'
                                }`}
                        >
                            {tab === 'today'
                                ? (labels['panel.pos.today'] || 'Hoy')
                                : (labels['panel.pos.weekOverview'] || 'Semana')}
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="pos-dash-tab"
                                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-brand"
                                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                />
                            )}
                        </button>
                    ))}
                    {/* Spacer */}
                    <div className="flex-1" />
                    {/* Date navigator (only for Today tab) */}
                    {activeTab === 'today' && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setDateOffset(d => d - 1)}
                                aria-label={labels['panel.pos.previousDay'] || 'Previous day'}
                                className="p-1.5 rounded-lg hover:bg-sf-2 transition-colors min-h-[36px] min-w-[36px]
                                           flex items-center justify-center
                                           focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 text-tx-sec" />
                            </button>
                            <span className="text-[11px] font-semibold text-tx min-w-[60px] text-center">
                                {dateOffset === 0
                                    ? (labels['panel.pos.today'] || 'Hoy')
                                    : dateOffset === -1
                                        ? (labels['panel.pos.yesterday'] || 'Ayer')
                                        : new Date(targetDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                            </span>
                            <button
                                onClick={() => setDateOffset(d => Math.min(0, d + 1))}
                                disabled={dateOffset >= 0}
                                aria-label={labels['panel.pos.nextDay'] || 'Next day'}
                                className="p-1.5 rounded-lg hover:bg-sf-2 disabled:opacity-30 transition-colors min-h-[36px] min-w-[36px]
                                           flex items-center justify-center
                                           focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                            >
                                <ChevronRight className="w-3.5 h-3.5 text-tx-sec" />
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <DashboardSkeleton />
                    ) : error ? (
                        <div className="text-center py-20 px-6 text-sm text-amber-600">
                            {error}
                        </div>
                    ) : stats ? (
                        <AnimatePresence mode="wait">
                            {activeTab === 'today' ? (
                                <motion.div
                                    key="today"
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 16 }}
                                    transition={{ duration: 0.2 }}
                                    className="p-5 space-y-5"
                                >
                                    {/* ── KPI Cards with Deltas ── */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            {
                                                icon: <ShoppingCart className="w-4 h-4" />,
                                                label: labels['panel.pos.totalSales'] || 'Ventas',
                                                value: String(stats.totalSales),
                                                gradient: 'from-blue-500/10 to-blue-500/5',
                                                iconBg: 'bg-blue-500/15 text-blue-600',
                                                delta: salesDelta,
                                            },
                                            {
                                                icon: <TrendingUp className="w-4 h-4" />,
                                                label: labels['panel.pos.revenue'] || 'Ingresos',
                                                value: formatCurrency(stats.totalRevenue),
                                                gradient: 'from-emerald-500/10 to-emerald-500/5',
                                                iconBg: 'bg-emerald-500/15 text-emerald-600',
                                                highlight: true,
                                                delta: revenueDelta,
                                            },
                                            {
                                                icon: <Receipt className="w-4 h-4" />,
                                                label: labels['panel.pos.avgTicket'] || 'Ticket medio',
                                                value: formatCurrency(stats.avgTicket),
                                                gradient: 'from-violet-500/10 to-violet-500/5',
                                                iconBg: 'bg-violet-500/15 text-violet-600',
                                                delta: ticketDelta,
                                            },
                                            {
                                                icon: <Banknote className="w-4 h-4" />,
                                                label: labels['panel.pos.cashSales'] || 'Efectivo',
                                                value: formatCurrency(stats.byPaymentMethod.cash?.total || 0),
                                                gradient: 'from-amber-500/10 to-amber-500/5',
                                                iconBg: 'bg-amber-500/15 text-amber-600',
                                            },
                                        ].map((kpi, idx) => (
                                            <motion.div
                                                key={kpi.label}
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.08, type: 'spring', damping: 20, stiffness: 200 }}
                                            >
                                                <KPICard {...kpi} />
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* ── Hourly Sales Chart (Chart.js Bar) ── */}
                                    {hourlyChartData && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.35 }}
                                            className="rounded-2xl bg-glass-heavy border border-sf-2 p-4"
                                        >
                                            <h3 className="text-xs font-bold text-tx-sec uppercase tracking-wider mb-3">
                                                {labels['panel.pos.salesByHour'] || 'Ventas por hora'}
                                            </h3>
                                            <Suspense fallback={<div className="h-[180px] bg-sf-1 rounded-xl animate-pulse" />}>
                                                <PanelChart
                                                    type="bar"
                                                    data={hourlyChartData}
                                                    height={180}
                                                    options={{
                                                        scales: {
                                                            x: {
                                                                ticks: {
                                                                    callback: (_: unknown, index: number) => index % 3 === 0 ? `${index}h` : '',
                                                                    maxRotation: 0,
                                                                    font: { size: 10 },
                                                                },
                                                            },
                                                            y: {
                                                                ticks: {
                                                                    callback: (val: unknown) => `${val}`,
                                                                    font: { size: 10 },
                                                                },
                                                            },
                                                        },
                                                        plugins: {
                                                            tooltip: {
                                                                callbacks: {
                                                                    title: (items: Array<{ dataIndex: number }>) => {
                                                                        const idx = items[0]?.dataIndex
                                                                        return idx !== undefined ? `${idx}:00 – ${idx + 1}:00` : ''
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    } as never}
                                                    ariaLabel={labels['panel.pos.salesByHour'] || 'Sales by hour chart'}
                                                />
                                            </Suspense>
                                        </motion.div>
                                    )}

                                    {/* ── Payment Method Doughnut (Chart.js) ── */}
                                    {paymentChartData && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 }}
                                            className="rounded-2xl bg-glass-heavy border border-sf-2 p-4"
                                        >
                                            <h3 className="text-xs font-bold text-tx-sec uppercase tracking-wider mb-3">
                                                {labels['panel.pos.byPaymentMethod'] || posLabel('panel.pos.byMethod', labels)}
                                            </h3>
                                            <div className="flex items-center gap-4">
                                                <div className="w-[140px] h-[140px] flex-shrink-0">
                                                    <Suspense fallback={<div className="w-full h-full bg-sf-1 rounded-full animate-pulse" />}>
                                                        <PanelChart
                                                            type="doughnut"
                                                            data={paymentChartData}
                                                            height={140}
                                                            hideLegend
                                                            ariaLabel={labels['panel.pos.byPaymentMethod'] || 'Payment methods'}
                                                        />
                                                    </Suspense>
                                                </div>
                                                {/* Legend */}
                                                <div className="flex-1 space-y-2">
                                                    {Object.entries(stats.byPaymentMethod).map(([method, data]) => {
                                                        if (!data) return null
                                                        const pct = stats.totalRevenue > 0
                                                            ? Math.round((data.total / stats.totalRevenue) * 100) : 0
                                                        return (
                                                            <div key={method} className="flex items-center gap-2">
                                                                <div
                                                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                    style={{ backgroundColor: PAYMENT_COLORS[method as PaymentMethod] }}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[11px] text-tx-sec truncate">
                                                                        {posLabel(PAYMENT_LABEL_KEYS[method as PaymentMethod] || 'panel.pos.other', labels)}
                                                                    </div>
                                                                </div>
                                                                <div className="text-[11px] font-bold text-tx tabular-nums">
                                                                    {pct}%
                                                                </div>
                                                                <div className="text-[10px] text-tx-muted tabular-nums">
                                                                    {formatCurrency(data.total)}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* ── Top Products ── */}
                                    {stats.topProducts.length > 0 && (
                                        <TopProducts
                                            products={stats.topProducts}
                                            formatCurrency={formatCurrency}
                                            labels={labels}
                                        />
                                    )}
                                </motion.div>
                            ) : (
                                /* ── WEEK TAB ── */
                                <motion.div
                                    key="week"
                                    initial={{ opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -16 }}
                                    transition={{ duration: 0.2 }}
                                    className="p-5 space-y-5"
                                >
                                    {/* Week KPI summary */}
                                    {weeklyStats.length > 0 && (
                                        <>
                                            <div className="grid grid-cols-3 gap-2.5">
                                                <WeekKPI
                                                    label={labels['panel.pos.totalSales'] || 'Ventas'}
                                                    value={String(weeklyStats.reduce((s, d) => s + d.totalSales, 0))}
                                                    color="blue"
                                                />
                                                <WeekKPI
                                                    label={labels['panel.pos.revenue'] || 'Ingresos'}
                                                    value={formatCurrency(weeklyStats.reduce((s, d) => s + d.totalRevenue, 0))}
                                                    color="emerald"
                                                    highlight
                                                />
                                                <WeekKPI
                                                    label={labels['panel.pos.avgTicket'] || 'Ticket'}
                                                    value={formatCurrency(
                                                        weeklyStats.reduce((s, d) => s + d.totalRevenue, 0) /
                                                        Math.max(1, weeklyStats.reduce((s, d) => s + d.totalSales, 0))
                                                    )}
                                                    color="violet"
                                                />
                                            </div>

                                            {/* Weekly Trend Line Chart */}
                                            {weeklyChartData && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 12 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.15 }}
                                                    className="rounded-2xl bg-glass-heavy border border-sf-2 p-4"
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h3 className="text-xs font-bold text-tx-sec uppercase tracking-wider">
                                                            {labels['panel.pos.weeklyTrend'] || 'Tendencia semanal'}
                                                        </h3>
                                                        <Calendar className="w-3.5 h-3.5 text-tx-muted" />
                                                    </div>
                                                    <Suspense fallback={<div className="h-[200px] bg-sf-1 rounded-xl animate-pulse" />}>
                                                        <PanelChart
                                                            type="line"
                                                            data={weeklyChartData}
                                                            height={200}
                                                            options={weeklyChartOptions as never}
                                                            ariaLabel={labels['panel.pos.weeklyTrend'] || 'Weekly trend chart'}
                                                        />
                                                    </Suspense>
                                                </motion.div>
                                            )}

                                            {/* Best/Worst day */}
                                            <div className="grid grid-cols-2 gap-3">
                                                {(() => {
                                                    const sorted = [...weeklyStats].sort((a, b) => b.totalRevenue - a.totalRevenue)
                                                    const best = sorted[0]
                                                    const worst = sorted[sorted.length - 1]
                                                    if (!best || !worst) return null
                                                    return (
                                                        <>
                                                            <DaySummaryCard
                                                                label={labels['panel.pos.bestDay'] || 'Mejor día'}
                                                                day={best}
                                                                formatCurrency={formatCurrency}
                                                                variant="success"
                                                            />
                                                            <DaySummaryCard
                                                                label={labels['panel.pos.worstDay'] || 'Día más bajo'}
                                                                day={worst}
                                                                formatCurrency={formatCurrency}
                                                                variant="muted"
                                                            />
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        </>
                                    )}

                                    {weeklyStats.length === 0 && !loading && (
                                        <div className="text-center py-16 text-sm text-tx-muted">
                                            {labels['panel.pos.noData'] || 'No hay datos para esta semana'}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    ) : null}
                </div>
            </motion.div>
        </div>
    )
}

/* ─────────────────────────────────────────────────────
 * KPI Card — SOTA gradient card with delta indicator
 * ───────────────────────────────────────────────────── */

function KPICard({
    icon,
    label,
    value,
    gradient,
    iconBg,
    highlight,
    delta,
}: {
    icon: React.ReactNode
    label: string
    value: string
    gradient: string
    iconBg: string
    highlight?: boolean
    delta?: { value: number; isUp: boolean }
}) {
    return (
        <div className={`relative rounded-2xl p-4 space-y-2.5 overflow-hidden
                         bg-gradient-to-br ${gradient} border border-sf-2
                         hover:border-brand-soft transition-all duration-300 group`}>
            {/* Decorative corner accent */}
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-brand-subtle group-hover:bg-brand-subtle transition-colors" />

            <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}>
                    {icon}
                </div>
                {delta && delta.value > 0 && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md
                                    ${delta.isUp
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-rose-500/10 text-rose-600'
                        }`}>
                        {delta.isUp
                            ? <ArrowUpRight className="w-3 h-3" />
                            : <ArrowDownRight className="w-3 h-3" />
                        }
                        {delta.value}%
                    </div>
                )}
                {!delta && highlight && (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
            </div>
            <div className="text-[11px] text-tx-muted font-medium">{label}</div>
            <div className={`font-bold text-tx ${highlight ? 'text-lg' : 'text-base'}`}>
                {value}
            </div>
        </div>
    )
}

/* ─────────────────────────────────────────────────────
 * Top Products — animated ranking with progress bars
 * ───────────────────────────────────────────────────── */

function TopProducts({
    products,
    formatCurrency,
    labels,
}: {
    products: { title: string; quantity: number; revenue: number }[]
    formatCurrency: (n: number) => string
    labels: Record<string, string>
}) {
    const maxRevenue = products[0]?.revenue || 1

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-2xl bg-glass-heavy border border-sf-2 p-4"
        >
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-tx-sec uppercase tracking-wider">
                    {labels['panel.pos.topProducts'] || 'Top productos'}
                </h3>
                <Package className="w-3.5 h-3.5 text-tx-muted" />
            </div>
            <div className="space-y-2">
                {products.slice(0, 5).map((prod, idx) => {
                    const barPct = (prod.revenue / maxRevenue) * 100
                    return (
                        <motion.div
                            key={prod.title}
                            className="group relative"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + idx * 0.06 }}
                        >
                            {/* Progress bar background */}
                            <motion.div
                                className="absolute inset-0 rounded-xl bg-brand-subtle group-hover:bg-brand-subtle transition-colors"
                                initial={{ width: 0 }}
                                animate={{ width: `${barPct}%` }}
                                transition={{ delay: 0.6 + idx * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            />
                            <div className="relative flex items-center justify-between p-2.5 pr-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-lg bg-sf-0 border border-sf-2 flex items-center justify-center
                                                       text-[10px] font-bold text-tx-muted flex-shrink-0 shadow-sm">
                                        {idx + 1}
                                    </span>
                                    <span className="text-xs font-medium text-tx truncate max-w-[160px]">
                                        {prod.title}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-tx-muted bg-sf-0 px-1.5 py-0.5 rounded-md">
                                        ×{prod.quantity}
                                    </span>
                                    <span className="text-xs font-bold text-tx">
                                        {formatCurrency(prod.revenue)}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </motion.div>
    )
}

/* ─────────────────────────────────────────────────────
 * Week KPI — compact metric for weekly view
 * ───────────────────────────────────────────────────── */

function WeekKPI({
    label,
    value,
    color,
    highlight,
}: {
    label: string
    value: string
    color: 'blue' | 'emerald' | 'violet'
    highlight?: boolean
}) {
    const colors = {
        blue: 'from-blue-500/10 to-blue-500/5 text-blue-700',
        emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-700',
        violet: 'from-violet-500/10 to-violet-500/5 text-violet-700',
    }
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={`rounded-2xl p-3 bg-gradient-to-br ${colors[color]} border border-sf-2 text-center`}
        >
            <div className="text-[10px] font-medium opacity-70">{label}</div>
            <div className={`font-bold tabular-nums mt-1 ${highlight ? 'text-base' : 'text-sm'}`}>
                {value}
            </div>
        </motion.div>
    )
}

/* ─────────────────────────────────────────────────────
 * Day Summary Card — best/worst day mini card
 * ───────────────────────────────────────────────────── */

function DaySummaryCard({
    label,
    day,
    formatCurrency,
    variant,
}: {
    label: string
    day: DailyStats
    formatCurrency: (n: number) => string
    variant: 'success' | 'muted'
}) {
    const styles = variant === 'success'
        ? 'bg-emerald-50/50 border-emerald-200/40'
        : 'bg-sf-1 border-sf-2'
    const dateStr = new Date(day.date).toLocaleDateString(undefined, {
        weekday: 'short', day: 'numeric', month: 'short'
    })

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`rounded-2xl border p-3.5 ${styles}`}
        >
            <div className="text-[10px] text-tx-muted font-medium">{label}</div>
            <div className="text-xs font-bold text-tx mt-1">{dateStr}</div>
            <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-tx-muted">{day.totalSales} ventas</span>
                <span className="font-bold text-tx tabular-nums">
                    {formatCurrency(day.totalRevenue)}
                </span>
            </div>
        </motion.div>
    )
}

/* ─────────────────────────────────────────────────────
 * Skeleton — loading state
 * ───────────────────────────────────────────────────── */

function DashboardSkeleton() {
    return (
        <div className="p-5 space-y-5">
            {/* Skeleton KPI cards */}
            <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl p-4 space-y-2.5 border border-sf-2 bg-glass">
                        <div className="w-8 h-8 rounded-xl bg-sf-2 animate-pulse" />
                        <div className="h-2.5 w-16 bg-glass rounded animate-pulse" />
                        <div className="h-5 w-24 bg-sf-2 rounded animate-pulse" />
                    </div>
                ))}
            </div>
            {/* Skeleton chart */}
            <div className="rounded-2xl border border-sf-2 bg-glass p-4 space-y-3">
                <div className="h-3 w-28 bg-sf-2 rounded animate-pulse" />
                <div className="h-[180px] bg-sf-1 rounded-xl animate-pulse" />
            </div>
            {/* Skeleton doughnut */}
            <div className="rounded-2xl border border-sf-2 bg-glass p-4">
                <div className="h-3 w-32 bg-sf-2 rounded animate-pulse mb-3" />
                <div className="flex items-center gap-4">
                    <div className="w-[140px] h-[140px] rounded-full bg-sf-1 animate-pulse" />
                    <div className="flex-1 space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-3 bg-sf-1 rounded animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
