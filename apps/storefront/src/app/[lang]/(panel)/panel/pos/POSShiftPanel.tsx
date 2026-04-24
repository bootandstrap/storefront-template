/**
 * POS Shift Panel — Open/Close Shifts (SOTA)
 *
 * Modal for managing cashier shifts with cash counting.
 * Feature-gated: Pro tier (`enable_pos_shifts`).
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    X, Clock, DollarSign, AlertTriangle, CheckCircle,
    Play, Square, ArrowUpDown, Timer, TrendingUp,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { POSShift } from '@/lib/pos/pos-config'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'
import {
    openShiftAction,
    closeShiftAction,
    getActiveShiftAction,
    listShiftsAction,
} from '@/lib/pos/shifts/shift-actions'

interface POSShiftPanelProps {
    onClose: () => void
    onShiftChange?: (shift: POSShift | null) => void
    labels: Record<string, string>
    defaultCurrency: string
}

type ShiftView = 'status' | 'open' | 'close' | 'history'

export default function POSShiftPanel({
    onClose,
    onShiftChange,
    labels,
    defaultCurrency,
}: POSShiftPanelProps) {
    const [currentShift, setCurrentShift] = useState<POSShift | null>(null)
    const [shiftHistory, setShiftHistory] = useState<POSShift[]>([])
    const [view, setView] = useState<ShiftView>('status')
    const [cashInput, setCashInput] = useState('')
    const [loading, setLoading] = useState(true)

    const formatCurrency = useCallback((amount: number) =>
        formatPOSCurrency(amount, defaultCurrency),
    [defaultCurrency])

    // Load current shift + history from server
    useEffect(() => {
        (async () => {
            try {
                const [activeResult, historyResult] = await Promise.all([
                    getActiveShiftAction(),
                    listShiftsAction(),
                ])
                if (activeResult.shift) {
                    // Map server shift to local POSShift shape
                    const mapped = mapServerShift(activeResult.shift)
                    setCurrentShift(mapped)
                }
                if (historyResult.shifts) {
                    setShiftHistory(historyResult.shifts.map(mapServerShift).slice(0, 5))
                }
            } catch { /* server unavailable */ }
            setLoading(false)
        })()
    }, [])

    // ── Escape key to dismiss ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    // Open shift handler — via server action
    const handleOpenShift = useCallback(async () => {
        const amount = Math.round(parseFloat(cashInput) * 100)
        if (isNaN(amount) || amount < 0) return

        try {
            const result = await openShiftAction({
                operator: 'owner', // Default operator
                expected_cash: amount,
            })
            if (result.shift) {
                const mapped = mapServerShift(result.shift)
                setCurrentShift(mapped)
                onShiftChange?.(mapped)
            }
            setCashInput('')
            setView('status')
        } catch { /* */ }
    }, [cashInput, onShiftChange])

    // Close shift handler — via server action
    const handleCloseShift = useCallback(async () => {
        if (!currentShift) return
        const closingAmount = Math.round(parseFloat(cashInput) * 100)
        if (isNaN(closingAmount) || closingAmount < 0) return

        try {
            const result = await closeShiftAction({
                shift_id: currentShift.id,
                actual_cash: closingAmount,
            })
            setCurrentShift(null)
            onShiftChange?.(null)
            setCashInput('')
            setView('status')
            if (result.shift) {
                const mapped = mapServerShift(result.shift)
                setShiftHistory(prev => [mapped, ...prev].slice(0, 5))
            }
        } catch { /* */ }
    }, [currentShift, cashInput, onShiftChange])

    // Calculate shift duration
    const shiftDuration = currentShift
        ? Math.floor((Date.now() - new Date(currentShift.opened_at).getTime()) / 60000)
        : 0
    const durationStr = `${Math.floor(shiftDuration / 60)}h ${shiftDuration % 60}m`

    return (
        <div
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={labels['panel.pos.shift'] || 'Shift management'}
        >
            {/* Backdrop */}
            <motion.div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onClose}
            />

            {/* Modal */}
            <motion.div
                className="relative bg-sf-0 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-sf-2"
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-sf-2">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="font-bold text-tx text-base">
                            {labels['panel.pos.shift'] || 'Turno'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label={labels['panel.pos.close'] || 'Close'}
                        className="p-2 rounded-xl hover:bg-sf-1 transition-colors min-h-[44px] min-w-[44px]
                                   flex items-center justify-center
                                   focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                    >
                        <X className="w-4 h-4 text-tx-muted" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="space-y-3 w-full px-5">
                            <div className="h-24 rounded-2xl bg-sf-1 animate-pulse" />
                            <div className="h-12 rounded-2xl bg-sf-1 animate-pulse" />
                        </div>
                    </div>
                ) : (
                    <div className="p-5">
                        {/* ── STATUS VIEW ── */}
                        {view === 'status' && (
                            <div className="space-y-4">
                                {currentShift ? (
                                    <>
                                        {/* Active shift card */}
                                        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50
                                                        border border-emerald-200/60 p-5 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-sm font-bold text-emerald-700">
                                                        {labels['panel.pos.shiftActive'] || 'Turno activo'}
                                                    </span>
                                                </div>
                                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full
                                                               bg-emerald-500/15 text-emerald-700 font-semibold">
                                                    <Timer className="w-3 h-3" />
                                                    {durationStr}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <ShiftMetric
                                                    label={labels['panel.pos.opened'] || 'Apertura'}
                                                    value={new Date(currentShift.opened_at).toLocaleTimeString([], {
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                />
                                                <ShiftMetric
                                                    label={labels['panel.pos.sales'] || 'Ventas'}
                                                    value={String(currentShift.total_sales)}
                                                />
                                                <ShiftMetric
                                                    label={labels['panel.pos.revenue'] || 'Ingresos'}
                                                    value={formatCurrency(currentShift.total_revenue)}
                                                    highlight
                                                />
                                                <ShiftMetric
                                                    label={labels['panel.pos.openingCash'] || 'Caja inicial'}
                                                    value={formatCurrency(currentShift.opening_cash)}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => { setView('close'); setCashInput('') }}
                                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl min-h-[48px]
                                                       bg-rose-500/10 text-rose-600 font-bold text-sm border border-rose-500/20
                                                       hover:bg-rose-500/20 transition-all
                                                       focus-visible:ring-2 focus-visible:ring-rose-500/40 focus-visible:outline-none"
                                        >
                                            <Square className="w-4 h-4" />
                                            {labels['panel.pos.closeShift'] || 'Cerrar turno'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-center py-6">
                                            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-sf-1 border border-sf-2
                                                            flex items-center justify-center">
                                                <Clock className="w-7 h-7 text-tx-muted" />
                                            </div>
                                            <p className="text-sm text-tx-sec font-medium">
                                                {labels['panel.pos.noActiveShift'] || 'No hay turno activo'}
                                            </p>
                                            <p className="text-xs text-tx-muted mt-1">
                                                {labels['panel.pos.openShiftHint'] || 'Abre un turno para comenzar a registrar ventas'}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => { setView('open'); setCashInput('') }}
                                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl min-h-[48px]
                                                       bg-brand text-white font-bold text-sm shadow-lg shadow-brand-soft
                                                       hover:shadow-xl hover:shadow-brand-soft hover:-translate-y-0.5
                                                       transition-all duration-300
                                                       focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                                        >
                                            <Play className="w-4 h-4" />
                                            {labels['panel.pos.openShift'] || 'Abrir turno'}
                                        </button>
                                    </>
                                )}

                                {/* Past shifts */}
                                {shiftHistory.length > 0 && (
                                    <div className="border-t border-sf-2 pt-4">
                                        <h3 className="text-xs font-bold text-tx-sec uppercase tracking-wider mb-3">
                                            {labels['panel.pos.pastShifts'] || 'Turnos anteriores'}
                                        </h3>
                                        <div className="space-y-2 max-h-36 overflow-y-auto">
                                            {shiftHistory.filter(s => s.status === 'closed').slice(0, 3).map(shift => (
                                                <div key={shift.id} className="flex items-center justify-between text-xs
                                                                              rounded-xl bg-glass-heavy border border-sf-2 p-3">
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="w-3.5 h-3.5 text-tx-muted" />
                                                        <div>
                                                            <span className="text-tx font-semibold">
                                                                {new Date(shift.opened_at).toLocaleDateString([], {
                                                                    day: '2-digit', month: 'short'
                                                                })}
                                                            </span>
                                                            <span className="text-tx-muted ml-1.5">
                                                                {shift.total_sales} ventas
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-tx">
                                                            {formatCurrency(shift.total_revenue)}
                                                        </span>
                                                        {shift.cash_difference !== undefined && shift.cash_difference !== 0 && (
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                                                                shift.cash_difference > 0
                                                                    ? 'bg-emerald-500/10 text-emerald-600'
                                                                    : 'bg-rose-500/10 text-rose-600'
                                                            }`}>
                                                                {shift.cash_difference > 0 ? '+' : ''}{formatCurrency(shift.cash_difference)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── OPEN SHIFT VIEW ── */}
                        {view === 'open' && (
                            <div className="space-y-5">
                                <div className="text-center">
                                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-subtle flex items-center justify-center">
                                        <DollarSign className="w-7 h-7 text-brand" />
                                    </div>
                                    <h3 className="font-bold text-tx text-lg">
                                        {labels['panel.pos.openShift'] || 'Abrir turno'}
                                    </h3>
                                    <p className="text-xs text-tx-muted mt-1.5">
                                        {labels['panel.pos.countCash'] || 'Cuenta el efectivo en caja'}
                                    </p>
                                </div>

                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-tx-muted font-semibold uppercase tracking-wider">
                                        {defaultCurrency}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={cashInput}
                                        onChange={e => setCashInput(e.target.value)}
                                        placeholder="0.00"
                                        autoFocus
                                        className="w-full pl-16 pr-4 py-4 rounded-2xl bg-sf-1 text-xl font-bold
                                                   text-center border border-sf-2 focus:border-brand focus:ring-2
                                                   focus:ring-soft focus:outline-none transition-all"
                                    />
                                </div>

                                <div className="flex gap-2.5">
                                    <button
                                        onClick={() => setView('status')}
                                        className="flex-1 py-3 rounded-2xl border border-sf-2
                                                   text-tx-sec text-sm font-medium hover:bg-sf-1 transition-colors"
                                    >
                                        {labels['panel.pos.cancel'] || 'Cancelar'}
                                    </button>
                                    <button
                                        onClick={handleOpenShift}
                                        disabled={!cashInput || parseFloat(cashInput) < 0}
                                        className="flex-1 py-3 rounded-2xl bg-brand text-white text-sm font-bold
                                                   shadow-lg shadow-brand-soft hover:shadow-xl
                                                   disabled:opacity-40 disabled:shadow-none transition-all"
                                    >
                                        {labels['panel.pos.confirm'] || 'Confirmar'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── CLOSE SHIFT VIEW ── */}
                        {view === 'close' && currentShift && (
                            <div className="space-y-5">
                                <div className="text-center">
                                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                                        <ArrowUpDown className="w-7 h-7 text-rose-500" />
                                    </div>
                                    <h3 className="font-bold text-tx text-lg">
                                        {labels['panel.pos.closeShift'] || 'Cerrar turno'}
                                    </h3>
                                    <p className="text-xs text-tx-muted mt-1.5">
                                        {labels['panel.pos.closingCount'] || 'Cuenta el efectivo final en caja'}
                                    </p>
                                </div>

                                {/* Shift summary */}
                                <div className="rounded-2xl bg-glass-heavy border border-sf-2 p-4 space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-tx-muted">{labels['panel.pos.duration'] || 'Duración'}</span>
                                        <span className="font-semibold text-tx">{durationStr}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-tx-muted">{labels['panel.pos.sales'] || 'Ventas'}</span>
                                        <span className="font-semibold text-tx">{currentShift.total_sales}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-tx-muted">{labels['panel.pos.openingCash'] || 'Apertura'}</span>
                                        <span className="font-semibold text-tx">{formatCurrency(currentShift.opening_cash)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold border-t border-sf-2 pt-2 text-sm">
                                        <span className="text-tx">{labels['panel.pos.expectedCash'] || 'Esperado'}</span>
                                        <span className="text-tx">{formatCurrency(currentShift.opening_cash + currentShift.total_revenue)}</span>
                                    </div>
                                </div>

                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-tx-muted font-semibold uppercase tracking-wider">
                                        {defaultCurrency}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={cashInput}
                                        onChange={e => setCashInput(e.target.value)}
                                        placeholder="0.00"
                                        autoFocus
                                        className="w-full pl-16 pr-4 py-4 rounded-2xl bg-sf-1 text-xl font-bold
                                                   text-center border border-sf-2 focus:border-brand focus:ring-2
                                                   focus:ring-soft focus:outline-none transition-all"
                                    />
                                </div>

                                {/* Variance preview */}
                                {cashInput && (
                                    <VarianceDisplay
                                        expected={currentShift.opening_cash + currentShift.total_revenue}
                                        actual={Math.round(parseFloat(cashInput) * 100)}
                                        formatCurrency={formatCurrency}
                                        labels={labels}
                                    />
                                )}

                                <div className="flex gap-2.5">
                                    <button
                                        onClick={() => setView('status')}
                                        className="flex-1 py-3 rounded-2xl border border-sf-2
                                                   text-tx-sec text-sm font-medium hover:bg-sf-1 transition-colors"
                                    >
                                        {labels['panel.pos.cancel'] || 'Cancelar'}
                                    </button>
                                    <button
                                        onClick={handleCloseShift}
                                        disabled={!cashInput || parseFloat(cashInput) < 0}
                                        className="flex-1 py-3 rounded-2xl bg-rose-500 text-white text-sm font-bold
                                                   shadow-lg shadow-rose-500/20 hover:shadow-xl
                                                   disabled:opacity-40 disabled:shadow-none transition-all"
                                    >
                                        {labels['panel.pos.confirmClose'] || 'Cerrar turno'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    )
}

/* ─────────────────────────────────────────────────
 * Shift Metric — compact stat inside active shift
 * ───────────────────────────────────────────────── */

function ShiftMetric({
    label,
    value,
    highlight,
}: {
    label: string
    value: string
    highlight?: boolean
}) {
    return (
        <div className="rounded-xl bg-white/60 p-2.5">
            <div className="text-[10px] text-emerald-600/80 font-medium">{label}</div>
            <div className={`font-bold text-emerald-800 ${highlight ? 'text-base' : 'text-sm'}`}>
                {value}
            </div>
        </div>
    )
}

/* ─────────────────────────────────────────────────
 * Variance Display — cash count assessment
 * ───────────────────────────────────────────────── */

function VarianceDisplay({
    expected,
    actual,
    formatCurrency,
    labels,
}: {
    expected: number
    actual: number
    formatCurrency: (n: number) => string
    labels: Record<string, string>
}) {
    const diff = actual - expected
    const isExact = diff === 0
    const isOver = diff > 0

    return (
        <div className={`flex items-center gap-2.5 p-3.5 rounded-2xl text-xs font-semibold ${
            isExact ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' :
            isOver ? 'bg-blue-50 text-blue-700 border border-blue-200/50' :
            'bg-rose-50 text-rose-700 border border-rose-200/50'
        }`}>
            {isExact ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>
                {isExact
                    ? (labels['panel.pos.exactMatch'] || 'Cuadra perfectamente')
                    : isOver
                        ? `${labels['panel.pos.cashOver'] || 'Sobrante'}: +${formatCurrency(diff)}`
                        : `${labels['panel.pos.cashUnder'] || 'Faltante'}: ${formatCurrency(diff)}`
                }
            </span>
        </div>
    )
}

/* ─────────────────────────────────────────────────
 * Map server PosShift → frontend POSShift shape
 * ───────────────────────────────────────────────── */

function mapServerShift(server: {
    id: string
    status: string
    expected_cash: number
    actual_cash: number | null
    discrepancy: number | null
    transaction_count: number
    total_revenue: number
    closed_at: string | null
    created_at: string
}): import('@/lib/pos/pos-config').POSShift {
    return {
        id: server.id,
        opened_at: server.created_at,
        closed_at: server.closed_at ?? undefined,
        opening_cash: server.expected_cash,
        closing_cash: server.actual_cash ?? undefined,
        expected_cash: server.expected_cash,
        cash_difference: server.discrepancy ?? undefined,
        total_sales: server.transaction_count,
        total_revenue: server.total_revenue,
        status: server.status as 'open' | 'closed',
    }
}
