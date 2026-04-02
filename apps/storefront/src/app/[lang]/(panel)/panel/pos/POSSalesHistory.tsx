/**
 * POS Sales History — Slide-out Panel (SOTA)
 *
 * Shows past POS sales with date/payment filters, search, expandable items.
 * Feature-gated: Pro tier (`enable_pos_history`).
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import PanelSelect from '@/components/panel/PanelSelect'
import {
    X, ChevronLeft, ChevronRight, Receipt, CreditCard,
    Banknote, Smartphone, Clock, Search, Users, ChevronDown,
    ShoppingBag,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { POSSaleRecord, PaymentMethod, POSSalesFilter } from '@/lib/pos/pos-config'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'

interface POSSalesHistoryProps {
    onClose: () => void
    labels: Record<string, string>
    defaultCurrency: string
}

const DATE_PRESETS = [
    { key: 'today', dayOffset: 0 },
    { key: 'yesterday', dayOffset: -1 },
    { key: 'week', dayOffset: -7 },
    { key: 'month', dayOffset: -30 },
] as const

const PAYMENT_ICONS: Record<PaymentMethod, typeof Banknote> = {
    cash: Banknote,
    card_terminal: CreditCard,
    twint: Smartphone,
    manual_card: Receipt,
}

const PAYMENT_BADGE_COLORS: Record<PaymentMethod, string> = {
    cash: 'bg-emerald-500/10 text-emerald-600',
    card_terminal: 'bg-blue-500/10 text-blue-600',
    twint: 'bg-violet-500/10 text-violet-600',
    manual_card: 'bg-amber-500/10 text-amber-600',
}

export default function POSSalesHistory({
    onClose,
    labels,
    defaultCurrency,
}: POSSalesHistoryProps) {
    const [sales, setSales] = useState<POSSaleRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [datePreset, setDatePreset] = useState<string>('today')
    const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [page, setPage] = useState(0)

    const PAGE_SIZE = 20

    const formatCurrency = useCallback((amount: number) =>
        formatPOSCurrency(amount, defaultCurrency),
    [defaultCurrency])

    const buildDateRange = useCallback((preset: string): { from?: string; to?: string } => {
        const now = new Date()
        const todayStr = now.toISOString().split('T')[0]

        switch (preset) {
            case 'today':
                return { from: `${todayStr}T00:00:00Z`, to: `${todayStr}T23:59:59Z` }
            case 'yesterday': {
                const y = new Date(now.getTime() - 86400000).toISOString().split('T')[0]
                return { from: `${y}T00:00:00Z`, to: `${y}T23:59:59Z` }
            }
            case 'week': {
                const w = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]
                return { from: `${w}T00:00:00Z`, to: `${todayStr}T23:59:59Z` }
            }
            case 'month': {
                const m = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]
                return { from: `${m}T00:00:00Z`, to: `${todayStr}T23:59:59Z` }
            }
            default:
                return {}
        }
    }, [])

    const fetchSales = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const { getPOSSalesAction } = await import('@/lib/pos/history/sales-history')
            const dateRange = buildDateRange(datePreset)
            const filters: POSSalesFilter = {
                ...dateRange,
                payment_method: paymentFilter || undefined,
                search: searchQuery || undefined,
                limit: PAGE_SIZE,
                offset: page * PAGE_SIZE,
            }
            const result = await getPOSSalesAction(filters)
            if (result.error) {
                setError(result.error)
            }
            setSales(result.sales)
            setTotal(result.total)
        } catch {
            setError('Failed to load sales')
        }
        setLoading(false)
    }, [datePreset, paymentFilter, searchQuery, page, buildDateRange])

    useEffect(() => { fetchSales() }, [fetchSales])

    const totalRevenue = sales.reduce((s, r) => s + r.total, 0)

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
                className="relative w-full max-w-md bg-sf-0 shadow-2xl flex flex-col overflow-hidden"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-sf-2 bg-glass-heavy backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-tx text-base leading-tight">
                                {labels['panel.pos.salesHistory'] || 'Historial de ventas'}
                            </h2>
                            <p className="text-[11px] text-tx-muted">
                                {total} {labels['panel.pos.sales'] || 'ventas'} · {formatCurrency(totalRevenue)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label={labels['panel.pos.close'] || 'Close sales history'}
                        className="p-2 rounded-xl hover:bg-sf-1 transition-colors
                                   focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                    >
                        <X className="w-4 h-4 text-tx-muted" />
                    </button>
                </div>

                {/* ── Filters ── */}
                <div className="px-5 py-3 space-y-3 border-b border-sf-2 bg-glass">
                    {/* Date presets */}
                    <div className="flex gap-1.5">
                        {DATE_PRESETS.map(p => (
                            <button
                                key={p.key}
                                onClick={() => { setDatePreset(p.key); setPage(0) }}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                                    datePreset === p.key
                                        ? 'bg-brand text-white shadow-sm shadow-brand-soft'
                                        : 'bg-sf-0 text-tx-sec border border-sf-2 hover:border-brand'
                                }`}
                            >
                                {labels[`panel.pos.${p.key}`] || p.key}
                            </button>
                        ))}
                    </div>

                    {/* Search + payment filter */}
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tx-muted" />
                            <input
                                type="text"
                                placeholder={labels['panel.pos.searchSales'] || 'Buscar venta...'}
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setPage(0) }}
                                className="w-full pl-9 pr-3 py-2 rounded-xl bg-sf-0 text-xs
                                           border border-sf-2 focus:border-brand focus:ring-2 focus:ring-soft
                                           focus:outline-none transition-all placeholder:text-tx-faint"
                            />
                        </div>
                        <PanelSelect
                            size="sm"
                            value={paymentFilter || ''}
                            onChange={e => { setPaymentFilter((e.target.value as PaymentMethod) || null); setPage(0) }}
                        >
                            <option value="">{labels['panel.pos.allMethods'] || 'Todos'}</option>
                            <option value="cash">{labels['panel.pos.cash'] || 'Efectivo'}</option>
                            <option value="card_terminal">{labels['panel.pos.cardTerminal'] || 'Terminal'}</option>
                            <option value="twint">{labels['panel.pos.twint'] || 'Twint'}</option>
                            <option value="manual_card">{labels['panel.pos.manualCard'] || 'Manual'}</option>
                        </PanelSelect>
                    </div>
                </div>

                {/* ── Sales list ── */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-3 space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                                    <div className="w-9 h-9 rounded-xl bg-sf-2 animate-pulse" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 w-20 bg-sf-2 rounded animate-pulse" />
                                        <div className="h-2.5 w-32 bg-glass rounded animate-pulse" />
                                    </div>
                                    <div className="h-4 w-14 bg-sf-2 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-16 px-6 text-sm text-amber-600">
                            {error}
                        </div>
                    ) : sales.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-tx-muted gap-3">
                            <motion.div
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', damping: 12, stiffness: 150 }}
                            >
                                <ShoppingBag className="w-10 h-10 text-sf-3" />
                            </motion.div>
                            <motion.span
                                className="text-sm"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                            >
                                {labels['panel.pos.noSales'] || 'No hay ventas en este período'}
                            </motion.span>
                        </div>
                    ) : (
                        <div className="p-3 space-y-1.5">
                            {sales.map(sale => {
                                const PayIcon = PAYMENT_ICONS[sale.payment_method] || Receipt
                                const badgeColor = PAYMENT_BADGE_COLORS[sale.payment_method] || 'bg-sf-1 text-tx-sec'
                                const isExpanded = expandedId === sale.id
                                return (
                                    <button
                                        key={sale.id}
                                        onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                                        className={`w-full text-left rounded-xl transition-all ${
                                            isExpanded
                                                ? 'bg-sf-1 ring-1 ring-soft'
                                                : 'hover:bg-glass'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between p-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${badgeColor}`}>
                                                    <PayIcon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold text-tx">
                                                        {sale.order_display_id || `#${sale.id.slice(-8)}`}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-tx-muted mt-0.5">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(sale.created_at).toLocaleTimeString([], {
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                        <span className="opacity-40">·</span>
                                                        <span>{sale.item_count} items</span>
                                                        {sale.customer_name && (
                                                            <>
                                                                <span className="opacity-40">·</span>
                                                                <Users className="w-3 h-3" />
                                                                <span className="truncate max-w-[60px]">{sale.customer_name}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-tx">
                                                    {formatCurrency(sale.total)}
                                                </span>
                                                <ChevronDown className={`w-3.5 h-3.5 text-tx-muted transition-transform ${
                                                    isExpanded ? 'rotate-180' : ''
                                                }`} />
                                            </div>
                                        </div>

                                        {/* Expanded detail with AnimatePresence */}
                                        <AnimatePresence initial={false}>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="mx-3 mb-3 p-3 rounded-lg bg-sf-0 border border-sf-2 space-y-1.5">
                                                        {sale.items.map((item, idx) => (
                                                            <motion.div
                                                                key={idx}
                                                                className="flex justify-between text-[11px]"
                                                                initial={{ opacity: 0, x: -6 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: idx * 0.04 }}
                                                            >
                                                                <span className="text-tx-sec">
                                                                    {item.quantity}× {item.title}
                                                                </span>
                                                                <span className="text-tx font-medium">
                                                                    {formatCurrency(item.unit_price * item.quantity)}
                                                                </span>
                                                            </motion.div>
                                                        ))}
                                                        {sale.discount_amount > 0 && (
                                                            <div className="flex justify-between text-[11px] text-emerald-600 pt-1 border-t border-dashed border-sf-2">
                                                                <span>{labels['panel.pos.discount'] || 'Descuento'}</span>
                                                                <span>-{formatCurrency(sale.discount_amount)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* ── Pagination ── */}
                {total > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-sf-2 bg-sf-0">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            aria-label={labels['panel.pos.previousPage'] || 'Previous page'}
                            className="p-2 rounded-lg hover:bg-sf-1 disabled:opacity-30 transition-colors min-h-[44px] min-w-[44px]
                                       flex items-center justify-center
                                       focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-[11px] text-tx-muted font-medium tabular-nums">
                            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}
                        </span>
                        <button
                            disabled={(page + 1) * PAGE_SIZE >= total}
                            onClick={() => setPage(p => p + 1)}
                            aria-label={labels['panel.pos.nextPage'] || 'Next page'}
                            className="p-2 rounded-lg hover:bg-sf-1 disabled:opacity-30 transition-colors min-h-[44px] min-w-[44px]
                                       flex items-center justify-center
                                       focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
