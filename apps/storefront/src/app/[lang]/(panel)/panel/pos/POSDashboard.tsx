/**
 * POS Dashboard — SOTA KPI Cards + Charts
 *
 * Daily summary view with key metrics, payment breakdown, hourly chart, and top products.
 * Feature-gated: Enterprise tier (`enable_pos_reports`).
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    X, TrendingUp, ShoppingCart, Receipt, Banknote,
    ChevronLeft, ChevronRight, BarChart3, Package, ArrowUpRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DailyStats, PaymentMethod } from '@/lib/pos/pos-config'
import { posLabel } from '@/lib/pos/pos-i18n'

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

export default function POSDashboard({
    onClose,
    labels,
    defaultCurrency,
}: POSDashboardProps) {
    const [stats, setStats] = useState<DailyStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [dateOffset, setDateOffset] = useState(0)

    const formatCurrency = useCallback((amount: number) =>
        new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: defaultCurrency,
        }).format(amount / 100),
    [defaultCurrency])

    const targetDate = new Date(Date.now() + dateOffset * 86400000)
        .toISOString().split('T')[0]

    const fetchStats = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const { getDailyStatsAction } = await import('@/lib/pos/history/daily-stats')
            const result = await getDailyStatsAction(targetDate)
            if (result.error) setError(result.error)
            setStats(result.stats)
        } catch {
            setError('Failed to load stats')
        }
        setLoading(false)
    }, [targetDate])

    useEffect(() => { fetchStats() }, [fetchStats])

    const maxHourTotal = stats?.byHour.reduce((max, h) => Math.max(max, h.total), 0) || 1

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
                className="relative w-full max-w-lg bg-surface-0 shadow-2xl flex flex-col overflow-hidden"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-surface-2 bg-surface-0/95 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="font-bold text-text-primary text-base leading-tight">
                                {labels['panel.pos.dashboard'] || 'Dashboard'}
                            </h2>
                            <p className="text-[11px] text-text-muted">{posLabel('panel.pos.daySummary', labels)}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label={labels['panel.pos.close'] || 'Close dashboard'}
                        className="p-2 rounded-xl hover:bg-surface-1 transition-colors
                                   focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                    >
                        <X className="w-4 h-4 text-text-muted" />
                    </button>
                </div>

                {/* ── Date navigator ── */}
                <div className="flex items-center justify-between px-5 py-2.5 bg-surface-1/40 border-b border-surface-2">
                    <button
                        onClick={() => setDateOffset(d => d - 1)}
                        aria-label={labels['panel.pos.previousDay'] || 'Previous day'}
                        className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors min-h-[44px] min-w-[44px]
                                   flex items-center justify-center
                                   focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                    >
                        <ChevronLeft className="w-4 h-4 text-text-secondary" />
                    </button>
                    <span className="text-sm font-semibold text-text-primary">
                        {dateOffset === 0
                            ? (labels['panel.pos.today'] || 'Hoy')
                            : dateOffset === -1
                                ? (labels['panel.pos.yesterday'] || 'Ayer')
                                : new Date(targetDate).toLocaleDateString()}
                    </span>
                    <button
                        onClick={() => setDateOffset(d => Math.min(0, d + 1))}
                        disabled={dateOffset >= 0}
                        aria-label={labels['panel.pos.nextDay'] || 'Next day'}
                        className="p-1.5 rounded-lg hover:bg-surface-2 disabled:opacity-30 transition-colors min-h-[44px] min-w-[44px]
                                   flex items-center justify-center
                                   focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                    >
                        <ChevronRight className="w-4 h-4 text-text-secondary" />
                    </button>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-5 space-y-5">
                            {/* Skeleton KPI cards */}
                            <div className="grid grid-cols-2 gap-3">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="rounded-2xl p-4 space-y-2.5 border border-surface-2 bg-surface-1/40">
                                        <div className="w-8 h-8 rounded-xl bg-surface-2 animate-pulse" />
                                        <div className="h-2.5 w-16 bg-surface-2/60 rounded animate-pulse" />
                                        <div className="h-5 w-24 bg-surface-2 rounded animate-pulse" />
                                    </div>
                                ))}
                            </div>
                            {/* Skeleton chart */}
                            <div className="rounded-2xl border border-surface-2 bg-surface-1/40 p-4 space-y-3">
                                <div className="h-3 w-28 bg-surface-2 rounded animate-pulse" />
                                <div className="flex items-end gap-[3px] h-28">
                                    {Array.from({ length: 24 }).map((_, i) => (
                                        <div key={i} className="flex-1 bg-surface-2/40 rounded-t-sm animate-pulse"
                                             style={{ height: `${15 + Math.random() * 50}%` }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 px-6 text-sm text-amber-600">
                            {error}
                        </div>
                    ) : stats ? (
                        <div className="p-5 space-y-5">

                            {/* ── KPI Cards ── */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { icon: <ShoppingCart className="w-4 h-4" />, label: labels['panel.pos.totalSales'] || 'Ventas', value: String(stats.totalSales), gradient: 'from-blue-500/10 to-blue-500/5', iconBg: 'bg-blue-500/15 text-blue-600' },
                                    { icon: <TrendingUp className="w-4 h-4" />, label: labels['panel.pos.revenue'] || 'Ingresos', value: formatCurrency(stats.totalRevenue), gradient: 'from-emerald-500/10 to-emerald-500/5', iconBg: 'bg-emerald-500/15 text-emerald-600', highlight: true },
                                    { icon: <Receipt className="w-4 h-4" />, label: labels['panel.pos.avgTicket'] || 'Ticket medio', value: formatCurrency(stats.avgTicket), gradient: 'from-violet-500/10 to-violet-500/5', iconBg: 'bg-violet-500/15 text-violet-600' },
                                    { icon: <Banknote className="w-4 h-4" />, label: labels['panel.pos.cashSales'] || 'Efectivo', value: formatCurrency(stats.byPaymentMethod.cash?.total || 0), gradient: 'from-amber-500/10 to-amber-500/5', iconBg: 'bg-amber-500/15 text-amber-600' },
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

                            {/* ── Payment breakdown ── */}
                            <div className="rounded-2xl bg-surface-1/70 border border-surface-2 p-4">
                                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
                                    {labels['panel.pos.byPaymentMethod'] || posLabel('panel.pos.byMethod', labels)}
                                </h3>

                                {/* Stacked bar */}
                                <div className="h-3 rounded-full overflow-hidden flex bg-surface-2 mb-4">
                                    {Object.entries(stats.byPaymentMethod).map(([method, data]) => {
                                        if (!data || stats.totalRevenue === 0) return null
                                        const pct = (data.total / stats.totalRevenue) * 100
                                        return (
                                            <div
                                                key={method}
                                                style={{
                                                    width: `${Math.max(pct, 3)}%`,
                                                    backgroundColor: PAYMENT_COLORS[method as PaymentMethod] || '#94a3b8',
                                                }}
                                                className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                                                title={`${posLabel(PAYMENT_LABEL_KEYS[method as PaymentMethod] || 'panel.pos.other', labels)}: ${formatCurrency(data.total)}`}
                                            />
                                        )
                                    })}
                                </div>

                                {/* Legend grid */}
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(stats.byPaymentMethod).map(([method, data]) => {
                                        if (!data) return null
                                        const pct = stats.totalRevenue > 0
                                            ? Math.round((data.total / stats.totalRevenue) * 100) : 0
                                        return (
                                            <div key={method} className="flex items-center gap-2 p-2 rounded-lg bg-surface-0/50">
                                                <div
                                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: PAYMENT_COLORS[method as PaymentMethod] }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[11px] text-text-secondary truncate">
                                                        {posLabel(PAYMENT_LABEL_KEYS[method as PaymentMethod] || 'panel.pos.other', labels)}
                                                    </div>
                                                    <div className="text-xs font-bold text-text-primary">
                                                        {data.count} <span className="text-text-muted font-normal">· {pct}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* ── Hourly chart ── */}
                            {stats.byHour.length > 0 && (
                                <div className="rounded-2xl bg-surface-1/70 border border-surface-2 p-4">
                                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">
                                        {labels['panel.pos.salesByHour'] || 'Ventas por hora'}
                                    </h3>
                                    <div className="flex items-end gap-[3px] h-28">
                                        {Array.from({ length: 24 }, (_, h) => {
                                            const bucket = stats.byHour.find(b => b.hour === h)
                                            const pct = bucket ? (bucket.total / maxHourTotal) * 100 : 0
                                            const isActive = bucket && bucket.count > 0
                                            return (
                                                <div
                                                    key={h}
                                                    className="flex-1 group relative flex flex-col items-center"
                                                >
                                                    {/* Tooltip on hover */}
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-text-primary text-surface-0
                                                                    text-[9px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100
                                                                    transition-opacity pointer-events-none z-10">
                                                        {h}:00 · {bucket?.count || 0}v · {formatCurrency(bucket?.total || 0)}
                                                    </div>
                                                    <motion.div
                                                        initial={{ scaleY: 0 }}
                                                        animate={{ scaleY: 1 }}
                                                        transition={{ delay: 0.3 + h * 0.025, type: 'spring', damping: 18, stiffness: 160 }}
                                                        style={{ height: `${Math.max(pct, 3)}%`, transformOrigin: 'bottom' }}
                                                        className={`w-full rounded-t-sm min-h-[3px] ${
                                                            isActive
                                                                ? 'bg-primary/60 group-hover:bg-primary'
                                                                : 'bg-surface-2/80'
                                                        }`}
                                                    />
                                                    {h % 6 === 0 && (
                                                        <span className="text-[8px] text-text-muted mt-1 font-medium">
                                                            {h}h
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── Top products ── */}
                            {stats.topProducts.length > 0 && (
                                <div className="rounded-2xl bg-surface-1/70 border border-surface-2 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                                            {labels['panel.pos.topProducts'] || 'Top productos'}
                                        </h3>
                                        <Package className="w-3.5 h-3.5 text-text-muted" />
                                    </div>
                                    <div className="space-y-2">
                                        {stats.topProducts.slice(0, 5).map((prod, idx) => {
                                            const maxRevenue = stats.topProducts[0]?.revenue || 1
                                            const barPct = (prod.revenue / maxRevenue) * 100
                                            return (
                                                <motion.div
                                                    key={prod.title}
                                                    className="group relative"
                                                    initial={{ opacity: 0, x: -8 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.3 + idx * 0.06 }}
                                                >
                                                    {/* Progress bar background */}
                                                    <motion.div
                                                        className="absolute inset-0 rounded-xl bg-primary/[0.04] group-hover:bg-primary/[0.08] transition-colors"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${barPct}%` }}
                                                        transition={{ delay: 0.5 + idx * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                                    />
                                                    <div className="relative flex items-center justify-between p-2.5 pr-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="w-6 h-6 rounded-lg bg-surface-0 border border-surface-2 flex items-center justify-center
                                                                           text-[10px] font-bold text-text-muted flex-shrink-0 shadow-sm">
                                                                {idx + 1}
                                                            </span>
                                                            <span className="text-xs font-medium text-text-primary truncate max-w-[160px]">
                                                                {prod.title}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-text-muted bg-surface-0 px-1.5 py-0.5 rounded-md">
                                                                ×{prod.quantity}
                                                            </span>
                                                            <span className="text-xs font-bold text-text-primary">
                                                                {formatCurrency(prod.revenue)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                        </div>
                    ) : null}
                </div>
            </motion.div>
        </div>
    )
}

/* ─────────────────────────────────────────────────────
 * KPI Card — SOTA gradient card with highlight variant
 * ───────────────────────────────────────────────────── */

function KPICard({
    icon,
    label,
    value,
    gradient,
    iconBg,
    highlight,
}: {
    icon: React.ReactNode
    label: string
    value: string
    gradient: string
    iconBg: string
    highlight?: boolean
}) {
    return (
        <div className={`relative rounded-2xl p-4 space-y-2.5 overflow-hidden
                         bg-gradient-to-br ${gradient} border border-surface-2
                         hover:border-primary/20 transition-all duration-300 group`}>
            {/* Decorative corner accent */}
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-primary/[0.03] group-hover:bg-primary/[0.06] transition-colors" />

            <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}>
                    {icon}
                </div>
                {highlight && (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
            </div>
            <div className="text-[11px] text-text-muted font-medium">{label}</div>
            <div className={`font-bold text-text-primary ${highlight ? 'text-lg' : 'text-base'}`}>
                {value}
            </div>
        </div>
    )
}
