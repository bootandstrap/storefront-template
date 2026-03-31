/**
 * POSEndOfDayReport — Comprehensive Daily Summary Modal
 *
 * Provides a full end-of-day view with:
 * - Revenue summary with comparison to previous day
 * - Payment method breakdown with Chart.js doughnut
 * - Top 10 products ranking
 * - Shift summary with cash variance
 * - Full export to CSV
 * Feature-gated: Enterprise tier.
 */
'use client'

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import {
    X, FileText, Download, TrendingUp, ShoppingCart,
    Receipt, CreditCard, Package, Clock, AlertTriangle,
    CheckCircle, Banknote, Printer,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DailyStats, POSShift, PaymentMethod } from '@/lib/pos/pos-config'
import { posLabel } from '@/lib/pos/pos-i18n'

const PanelChart = lazy(() => import('@/components/panel/PanelChart'))

interface POSEndOfDayReportProps {
    onClose: () => void
    labels: Record<string, string>
    defaultCurrency: string
    shifts: POSShift[]
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

type ReportSection = 'summary' | 'products' | 'shifts'

export default function POSEndOfDayReport({
    onClose,
    labels,
    defaultCurrency,
    shifts,
}: POSEndOfDayReportProps) {
    const [stats, setStats] = useState<DailyStats | null>(null)
    const [prevStats, setPrevStats] = useState<DailyStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeSection, setActiveSection] = useState<ReportSection>('summary')

    const today = new Date().toISOString().split('T')[0]

    const formatCurrency = useCallback((amount: number) =>
        new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: defaultCurrency,
        }).format(amount / 100),
    [defaultCurrency])

    // ── Load stats ──
    useEffect(() => {
        let cancelled = false
        async function load() {
            setLoading(true)
            try {
                const { getDailyStatsAction } = await import('@/lib/pos/history/daily-stats')
                const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
                const [result, prev] = await Promise.all([
                    getDailyStatsAction(today),
                    getDailyStatsAction(yesterday),
                ])
                if (cancelled) return
                if (result.error) setError(result.error)
                setStats(result.stats)
                setPrevStats(prev.stats)
            } catch {
                if (!cancelled) setError('Failed to load')
            }
            if (!cancelled) setLoading(false)
        }
        load()
        return () => { cancelled = true }
    }, [today])

    // ── Compute shift summary ──
    const shiftSummary = useMemo(() => {
        const todayShifts = shifts.filter(s => s.opened_at.startsWith(today))
        const totalCash = todayShifts.reduce((sum, s) => sum + (s.closing_cash || 0), 0)
        const totalExpected = todayShifts.reduce((sum, s) => sum + (s.expected_cash || 0), 0)
        const totalVariance = todayShifts.reduce((sum, s) => sum + (s.cash_difference || 0), 0)
        return { shifts: todayShifts, totalCash, totalExpected, totalVariance }
    }, [shifts, today])

    // ── Payment doughnut chart ──
    const paymentChartData = useMemo(() => {
        if (!stats) return null
        const entries = Object.entries(stats.byPaymentMethod).filter(([, d]) => d && d.total > 0)
        if (entries.length === 0) return null
        return {
            labels: entries.map(([m]) => posLabel(PAYMENT_LABEL_KEYS[m as PaymentMethod] || 'panel.pos.other', labels)),
            datasets: [{
                data: entries.map(([, d]) => d!.total / 100),
                backgroundColor: entries.map(([m]) => PAYMENT_COLORS[m as PaymentMethod] || '#94a3b8'),
                borderWidth: 0,
                hoverOffset: 4,
            }],
        }
    }, [stats, labels])

    // ── Export CSV ──
    const exportCSV = useCallback(() => {
        if (!stats) return
        const rows: string[][] = [
            ['End of Day Report', today],
            [''],
            ['Total Sales', String(stats.totalSales)],
            ['Total Revenue', formatCurrency(stats.totalRevenue)],
            ['Average Ticket', formatCurrency(stats.avgTicket)],
            [''],
            ['Payment Method', 'Count', 'Total'],
        ]

        for (const [method, data] of Object.entries(stats.byPaymentMethod)) {
            if (data) {
                rows.push([
                    posLabel(PAYMENT_LABEL_KEYS[method as PaymentMethod], labels),
                    String(data.count),
                    formatCurrency(data.total),
                ])
            }
        }

        rows.push([''], ['Top Products', 'Quantity', 'Revenue'])
        for (const prod of stats.topProducts) {
            rows.push([prod.title, String(prod.quantity), formatCurrency(prod.revenue)])
        }

        if (shiftSummary.shifts.length > 0) {
            rows.push([''], ['Shift', 'Opened', 'Closed', 'Cash Variance'])
            for (const shift of shiftSummary.shifts) {
                rows.push([
                    shift.id.slice(0, 8),
                    new Date(shift.opened_at).toLocaleTimeString(),
                    shift.closed_at ? new Date(shift.closed_at).toLocaleTimeString() : 'Open',
                    shift.cash_difference !== undefined ? formatCurrency(shift.cash_difference) : 'N/A',
                ])
            }
        }

        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pos-report-${today}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }, [stats, today, formatCurrency, labels, shiftSummary])

    // ── Delta ──
    const getDelta = (curr: number, prev: number) => {
        if (!prev) return null
        const pct = Math.round(((curr - prev) / prev) * 100)
        return { value: Math.abs(pct), isUp: pct >= 0 }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onClose}
            />

            <motion.div
                className="relative bg-sf-0 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-sf-2"
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-sf-2 bg-glass-heavy backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-tx text-base">
                                {labels['panel.pos.endOfDayReport'] || 'Cierre del día'}
                            </h2>
                            <p className="text-[11px] text-tx-muted">
                                {new Date(today).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={exportCSV}
                            disabled={!stats}
                            className="p-2.5 rounded-xl hover:bg-sf-1 transition-colors text-tx-sec
                                       disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center
                                       focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                            aria-label={labels['panel.pos.exportCSV'] || 'Export CSV'}
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-xl hover:bg-sf-1 transition-colors min-h-[44px] min-w-[44px]
                                       flex items-center justify-center
                                       focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                            aria-label={labels['panel.pos.close'] || 'Close'}
                        >
                            <X className="w-4 h-4 text-tx-muted" />
                        </button>
                    </div>
                </div>

                {/* Section tabs */}
                <div className="flex px-5 py-2 gap-1 border-b border-sf-2 bg-glass">
                    {(['summary', 'products', 'shifts'] as const).map(sec => (
                        <button
                            key={sec}
                            onClick={() => setActiveSection(sec)}
                            className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px]
                                       ${activeSection === sec
                                    ? 'text-brand'
                                    : 'text-tx-muted hover:text-tx-sec hover:bg-sf-1'
                                }`}
                        >
                            {sec === 'summary' && (labels['panel.pos.summary'] || 'Resumen')}
                            {sec === 'products' && (labels['panel.pos.topProducts'] || 'Productos')}
                            {sec === 'shifts' && (labels['panel.pos.shifts'] || 'Turnos')}
                            {activeSection === sec && (
                                <motion.div
                                    layoutId="eod-tab"
                                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-brand"
                                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-16 rounded-2xl bg-sf-1 animate-pulse" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center text-sm text-amber-600">{error}</div>
                    ) : stats ? (
                        <AnimatePresence mode="wait">
                            {/* ── SUMMARY ── */}
                            {activeSection === 'summary' && (
                                <motion.div
                                    key="summary"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="p-5 space-y-4"
                                >
                                    {/* KPI row */}
                                    <div className="grid grid-cols-3 gap-2.5">
                                        {[
                                            {
                                                icon: <ShoppingCart className="w-4 h-4 text-blue-500" />,
                                                label: labels['panel.pos.totalSales'] || 'Ventas',
                                                value: String(stats.totalSales),
                                                color: 'blue',
                                                delta: getDelta(stats.totalSales, prevStats?.totalSales || 0),
                                            },
                                            {
                                                icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
                                                label: labels['panel.pos.revenue'] || 'Ingresos',
                                                value: formatCurrency(stats.totalRevenue),
                                                color: 'emerald',
                                                delta: getDelta(stats.totalRevenue, prevStats?.totalRevenue || 0),
                                            },
                                            {
                                                icon: <Receipt className="w-4 h-4 text-violet-500" />,
                                                label: labels['panel.pos.avgTicket'] || 'Ticket',
                                                value: formatCurrency(stats.avgTicket),
                                                color: 'violet',
                                                delta: getDelta(stats.avgTicket, prevStats?.avgTicket || 0),
                                            },
                                        ].map((kpi, idx) => (
                                            <motion.div
                                                key={kpi.label}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.08 }}
                                                className={`rounded-2xl p-3 text-center border border-sf-2
                                                           bg-gradient-to-br from-${kpi.color}-500/8 to-${kpi.color}-500/3`}
                                            >
                                                <div className="flex items-center justify-center mb-1.5">{kpi.icon}</div>
                                                <div className="text-[10px] text-tx-muted font-medium">{kpi.label}</div>
                                                <div className="font-bold text-tx text-sm mt-0.5 tabular-nums">{kpi.value}</div>
                                                {kpi.delta && (
                                                    <div className={`text-[9px] font-bold mt-1 ${kpi.delta.isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {kpi.delta.isUp ? '↑' : '↓'} {kpi.delta.value}% vs ayer
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Payment breakdown */}
                                    {paymentChartData && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.25 }}
                                            className="rounded-2xl bg-glass border border-sf-2 p-4"
                                        >
                                            <h3 className="text-xs font-bold text-tx-sec uppercase tracking-wider mb-3">
                                                {labels['panel.pos.paymentBreakdown'] || 'Desglose por método'}
                                            </h3>
                                            <div className="flex items-center gap-4">
                                                <div className="w-[120px] h-[120px] flex-shrink-0">
                                                    <Suspense fallback={<div className="w-full h-full bg-sf-1 rounded-full animate-pulse" />}>
                                                        <PanelChart
                                                            type="doughnut"
                                                            data={paymentChartData}
                                                            height={120}
                                                            hideLegend
                                                            ariaLabel="Payment methods breakdown"
                                                        />
                                                    </Suspense>
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    {Object.entries(stats.byPaymentMethod).map(([method, data]) => {
                                                        if (!data) return null
                                                        return (
                                                            <div key={method} className="flex items-center gap-2 text-xs">
                                                                <div className="w-2 h-2 rounded-full flex-shrink-0"
                                                                     style={{ backgroundColor: PAYMENT_COLORS[method as PaymentMethod] }} />
                                                                <span className="text-tx-sec flex-1 truncate">
                                                                    {posLabel(PAYMENT_LABEL_KEYS[method as PaymentMethod], labels)}
                                                                </span>
                                                                <span className="text-tx-muted tabular-nums">{data.count}×</span>
                                                                <span className="font-bold text-tx tabular-nums">
                                                                    {formatCurrency(data.total)}
                                                                </span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Hourly peak */}
                                    {stats.byHour.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 }}
                                            className="rounded-2xl bg-glass border border-sf-2 p-4 flex items-center gap-3"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                                <Clock className="w-5 h-5 text-orange-500" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-tx-muted font-medium uppercase tracking-wider">
                                                    {labels['panel.pos.peakHour'] || 'Hora punta'}
                                                </div>
                                                {(() => {
                                                    const peak = [...stats.byHour].sort((a, b) => b.total - a.total)[0]
                                                    if (!peak) return null
                                                    return (
                                                        <div className="text-sm font-bold text-tx mt-0.5">
                                                            {peak.hour}:00 — {peak.count} {labels['panel.pos.sales'] || 'ventas'} ({formatCurrency(peak.total)})
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}

                            {/* ── PRODUCTS ── */}
                            {activeSection === 'products' && (
                                <motion.div
                                    key="products"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="p-5 space-y-2"
                                >
                                    {stats.topProducts.length === 0 ? (
                                        <div className="text-center py-12 text-sm text-tx-muted">
                                            {labels['panel.pos.noProducts'] || 'Sin productos vendidos'}
                                        </div>
                                    ) : (
                                        stats.topProducts.map((prod, idx) => {
                                            const maxRev = stats.topProducts[0]?.revenue || 1
                                            const pct = Math.round((prod.revenue / maxRev) * 100)
                                            return (
                                                <motion.div
                                                    key={prod.title}
                                                    initial={{ opacity: 0, x: -8 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.04 }}
                                                    className="relative rounded-xl overflow-hidden"
                                                >
                                                    <motion.div
                                                        className="absolute inset-0 bg-brand-subtle"
                                                        initial={{ width: '0%' }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ delay: 0.2 + idx * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                                    />
                                                    <div className="relative flex items-center justify-between p-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="w-6 h-6 rounded-lg bg-sf-0 border border-sf-2 flex items-center justify-center
                                                                             text-[10px] font-bold text-tx-muted shadow-sm">
                                                                {idx + 1}
                                                            </span>
                                                            <span className="text-xs font-medium text-tx truncate max-w-[180px]">
                                                                {prod.title}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="text-[10px] text-tx-muted bg-sf-0 px-1.5 py-0.5 rounded-md">
                                                                ×{prod.quantity}
                                                            </span>
                                                            <span className="text-xs font-bold text-tx tabular-nums">
                                                                {formatCurrency(prod.revenue)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )
                                        })
                                    )}
                                </motion.div>
                            )}

                            {/* ── SHIFTS ── */}
                            {activeSection === 'shifts' && (
                                <motion.div
                                    key="shifts"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="p-5 space-y-4"
                                >
                                    {shiftSummary.shifts.length === 0 ? (
                                        <div className="text-center py-12 text-sm text-tx-muted">
                                            {labels['panel.pos.noShifts'] || 'Sin turnos registrados hoy'}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Summary bar */}
                                            <div className={`flex items-center gap-3 p-4 rounded-2xl border
                                                           ${Math.abs(shiftSummary.totalVariance) <= 100
                                                    ? 'bg-emerald-50 border-emerald-200/40'
                                                    : 'bg-amber-50 border-amber-200/40'
                                                }`}>
                                                {Math.abs(shiftSummary.totalVariance) <= 100 ? (
                                                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                                ) : (
                                                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                                )}
                                                <div className="flex-1">
                                                    <div className="text-xs font-bold text-tx">
                                                        {labels['panel.pos.cashVariance'] || 'Variación de caja'}
                                                    </div>
                                                    <div className="text-[11px] text-tx-muted mt-0.5">
                                                        {labels['panel.pos.expected'] || 'Esperado'}: {formatCurrency(shiftSummary.totalExpected)}
                                                        {' • '}
                                                        {labels['panel.pos.actual'] || 'Real'}: {formatCurrency(shiftSummary.totalCash)}
                                                    </div>
                                                </div>
                                                <div className={`text-sm font-bold tabular-nums
                                                               ${Math.abs(shiftSummary.totalVariance) <= 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                    {shiftSummary.totalVariance >= 0 ? '+' : ''}{formatCurrency(shiftSummary.totalVariance)}
                                                </div>
                                            </div>

                                            {/* Shift cards */}
                                            {shiftSummary.shifts.map((shift, idx) => (
                                                <motion.div
                                                    key={shift.id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.08 }}
                                                    className="rounded-2xl border border-sf-2 bg-glass p-4 space-y-2.5"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full
                                                                           ${shift.status === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-sf-3'}`} />
                                                            <span className="text-xs font-bold text-tx">
                                                                {labels['panel.pos.shift'] || 'Turno'} #{idx + 1}
                                                            </span>
                                                        </div>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold
                                                                        ${shift.status === 'open'
                                                                ? 'bg-emerald-500/10 text-emerald-600'
                                                                : 'bg-sf-1 text-tx-muted'}`}>
                                                            {shift.status === 'open'
                                                                ? (labels['panel.pos.open'] || 'Abierto')
                                                                : (labels['panel.pos.closed'] || 'Cerrado')}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div>
                                                            <span className="text-tx-muted">{labels['panel.pos.opened'] || 'Apertura'}</span>
                                                            <div className="font-semibold text-tx mt-0.5">
                                                                {new Date(shift.opened_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                        {shift.closed_at && (
                                                            <div>
                                                                <span className="text-tx-muted">{labels['panel.pos.closed'] || 'Cierre'}</span>
                                                                <div className="font-semibold text-tx mt-0.5">
                                                                    {new Date(shift.closed_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between pt-2 border-t border-sf-2">
                                                        <div className="text-xs">
                                                            <span className="text-tx-muted">{shift.total_sales}</span>
                                                            <span className="text-tx-muted ml-0.5">{labels['panel.pos.sales'] || 'ventas'}</span>
                                                        </div>
                                                        <div className="text-xs font-bold text-tx tabular-nums">
                                                            {formatCurrency(shift.total_revenue)}
                                                        </div>
                                                    </div>

                                                    {shift.cash_difference !== undefined && shift.status === 'closed' && (
                                                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold
                                                                        ${Math.abs(shift.cash_difference) <= 50
                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                : 'bg-amber-50 text-amber-700'}`}>
                                                            <Banknote className="w-3.5 h-3.5" />
                                                            {labels['panel.pos.cashVariance'] || 'Variación'}:
                                                            <span className="ml-auto tabular-nums">
                                                                {shift.cash_difference >= 0 ? '+' : ''}{formatCurrency(shift.cash_difference)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-sf-2 bg-glass flex items-center gap-2.5">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-2xl border border-sf-2 text-tx-sec text-sm font-medium
                                   hover:bg-sf-1 transition-colors min-h-[44px]"
                    >
                        {labels['panel.pos.close'] || 'Cerrar'}
                    </button>
                    <button
                        onClick={exportCSV}
                        disabled={!stats}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl
                                   bg-brand text-white text-sm font-bold
                                   hover:shadow-lg hover:-translate-y-0.5
                                   disabled:opacity-40 transition-all duration-300 min-h-[44px]"
                    >
                        <Download className="w-4 h-4" />
                        {labels['panel.pos.exportReport'] || 'Exportar CSV'}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
