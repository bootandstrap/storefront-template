'use client'

/**
 * POSParkedSales — Parked Sale Recovery Panel (Phase 3B Batch 5)
 *
 * Slide-out panel showing all parked (held) sales stored in localStorage.
 * Features:
 * - Touch-friendly list with sale summaries
 * - Framer-motion slide-in + stagger animations
 * - Resume, delete, and delete-all actions
 * - Relative time stamps
 */

import { useState, useEffect, useCallback } from 'react'
import {
    X, PauseCircle, Play, Trash2, ShoppingCart, Clock,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { POSCartItem } from '@/lib/pos/pos-config'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'

type CartItem = POSCartItem

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParkedSale {
    id: string
    items: CartItem[]
    parkedAt: string        // ISO string
    customerName?: string
    note?: string
}

interface POSParkedSalesProps {
    onClose: () => void
    onResume: (items: CartItem[]) => void
    labels: Record<string, string>
    defaultCurrency: string
    /** When true, syncs parked sales to Medusa draft orders (Enterprise: multi-device) */
    multiDevice?: boolean
}

// ---------------------------------------------------------------------------
// LocalStorage key
// ---------------------------------------------------------------------------

const PARKED_KEY = 'pos_parked_sales'

export function getParkedSales(): ParkedSale[] {
    if (typeof window === 'undefined') return []
    try {
        return JSON.parse(localStorage.getItem(PARKED_KEY) || '[]')
    } catch { return [] }
}

export function saveParkedSale(sale: ParkedSale): void {
    const existing = getParkedSales()
    existing.push(sale)
    localStorage.setItem(PARKED_KEY, JSON.stringify(existing))
}

export function removeParkedSale(id: string): void {
    const existing = getParkedSales().filter(s => s.id !== id)
    localStorage.setItem(PARKED_KEY, JSON.stringify(existing))
}

export function clearParkedSales(): void {
    localStorage.removeItem(PARKED_KEY)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function POSParkedSales({
    onClose,
    onResume,
    labels,
    defaultCurrency,
    multiDevice = false,
}: POSParkedSalesProps) {
    const [sales, setSales] = useState<ParkedSale[]>([])
    const [syncing, setSyncing] = useState(false)

    useEffect(() => {
        const local = getParkedSales()
        setSales(local)

        // If multi-device, also load parked sales from server and merge
        if (multiDevice) {
            setSyncing(true)
            import('@/lib/pos/parked/parked-actions').then(mod => {
                mod.listParkedSalesAction().then(result => {
                    if (result.sales.length > 0) {
                        const localIds = new Set(local.map(s => s.id))
                        const serverOnly = result.sales
                            .filter(s => !localIds.has(s.id))
                            .map(s => ({
                                id: s.id,
                                items: s.items.map(i => ({
                                    id: i.variant_id,
                                    product_id: '',
                                    title: i.title,
                                    variant_title: null,
                                    thumbnail: null,
                                    sku: null,
                                    unit_price: i.unit_price,
                                    quantity: i.quantity,
                                    currency_code: defaultCurrency,
                                })),
                                parkedAt: s.parked_at,
                                customerName: s.customer_name,
                                note: s.note,
                                serverId: s.id, // Track server origin
                            } as ParkedSale & { serverId?: string }))
                        setSales(prev => [...prev, ...serverOnly])
                    }
                }).finally(() => setSyncing(false))
            }).catch(() => setSyncing(false))
        }
    }, [multiDevice, defaultCurrency])

    // ── Escape key to dismiss ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    const formatCurrency = useCallback((amount: number) =>
        formatPOSCurrency(amount, defaultCurrency),
    [defaultCurrency])

    const relativeTime = (iso: string) => {
        const diff = Date.now() - new Date(iso).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return labels['panel.pos.justNow'] || 'Ahora mismo'
        if (mins < 60) return `${mins} min`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h`
        return `${Math.floor(hrs / 24)}d`
    }

    const handleResume = (sale: ParkedSale) => {
        removeParkedSale(sale.id)
        setSales(prev => prev.filter(s => s.id !== sale.id))

        // Also unpark from server if multi-device
        if (multiDevice && (sale as ParkedSale & { serverId?: string }).serverId) {
            import('@/lib/pos/parked/parked-actions').then(mod => {
                mod.unparkSaleAction((sale as ParkedSale & { serverId?: string }).serverId!)
            }).catch(() => { /* non-blocking */ })
        }

        onResume(sale.items)
        onClose()
    }

    const handleDelete = (id: string) => {
        const sale = sales.find(s => s.id === id)
        removeParkedSale(id)
        setSales(prev => prev.filter(s => s.id !== id))

        // Also unpark from server if multi-device
        if (multiDevice && sale && (sale as ParkedSale & { serverId?: string }).serverId) {
            import('@/lib/pos/parked/parked-actions').then(mod => {
                mod.unparkSaleAction((sale as ParkedSale & { serverId?: string }).serverId!)
            }).catch(() => { /* non-blocking */ })
        }
    }

    const handleClearAll = () => {
        // Unpark all from server if multi-device
        if (multiDevice) {
            const serverSales = sales.filter(s => (s as ParkedSale & { serverId?: string }).serverId)
            if (serverSales.length > 0) {
                import('@/lib/pos/parked/parked-actions').then(mod => {
                    serverSales.forEach(s => {
                        mod.unparkSaleAction((s as ParkedSale & { serverId?: string }).serverId!)
                    })
                }).catch(() => { /* non-blocking */ })
            }
        }
        clearParkedSales()
        setSales([])
    }

    const totalParked = sales.reduce((sum, s) =>
        sum + s.items.reduce((t, i) => t + i.unit_price * i.quantity, 0), 0)

    return (
        <div
            className="fixed inset-0 z-40 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-label={labels['panel.pos.parkedSales'] || 'Parked sales'}
        >
            {/* Backdrop */}
            <motion.div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />

            {/* Panel */}
            <motion.div
                className="relative w-full max-w-sm bg-sf-0 shadow-2xl flex flex-col overflow-hidden"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-sf-2
                                bg-glass-heavy backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5
                                        flex items-center justify-center">
                            <PauseCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-tx text-base leading-tight">
                                {labels['panel.pos.parkedSales'] || 'Ventas en espera'}
                            </h2>
                            <p className="text-[11px] text-tx-muted">
                                {sales.length} {labels['panel.pos.sales'] || 'ventas'}
                                {sales.length > 0 && ` · ${formatCurrency(totalParked)}`}
                            </p>
                        </div>
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {sales.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-tx-muted gap-3">
                            <ShoppingCart className="w-10 h-10 text-sf-3" />
                            <span className="text-sm">
                                {labels['panel.pos.noParkedSales'] || 'No hay ventas en espera'}
                            </span>
                        </div>
                    ) : (
                        <div className="p-3 space-y-2">
                            <AnimatePresence mode="popLayout">
                                {sales.map((sale, idx) => {
                                    const saleTotal = sale.items.reduce(
                                        (t, i) => t + i.unit_price * i.quantity, 0
                                    )
                                    const itemCount = sale.items.reduce((t, i) => t + i.quantity, 0)

                                    return (
                                        <motion.div
                                            key={sale.id}
                                            layout
                                            initial={{ opacity: 0, x: 30 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -30, height: 0, marginBottom: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="rounded-xl bg-glass-heavy border border-sf-2
                                                       overflow-hidden"
                                        >
                                            <div className="p-3.5">
                                                {/* Top row */}
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-tx">
                                                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                                        </span>
                                                        {sale.customerName && (
                                                            <span className="text-[10px] text-tx-muted
                                                                             bg-sf-0 px-1.5 py-0.5 rounded-md">
                                                                {sale.customerName}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-tx-muted">
                                                        <Clock className="w-3 h-3" />
                                                        {relativeTime(sale.parkedAt)}
                                                    </div>
                                                </div>

                                                {/* Item preview */}
                                                <div className="text-[11px] text-tx-sec leading-relaxed mb-3 line-clamp-2">
                                                    {sale.items.map(i => `${i.quantity}× ${i.title}`).join(', ')}
                                                </div>

                                                {/* Actions row */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-tx">
                                                        {formatCurrency(saleTotal)}
                                                    </span>
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            onClick={() => handleDelete(sale.id)}
                                                            aria-label={labels['panel.pos.delete'] || 'Delete'}
                                                            className="p-2 rounded-lg text-tx-muted min-h-[36px] min-w-[36px]
                                                                       flex items-center justify-center
                                                                       hover:bg-rose-500/10 hover:text-rose-500
                                                                       transition-colors
                                                                       focus-visible:ring-2 focus-visible:ring-rose-500/40 focus-visible:outline-none"
                                                            title={labels['panel.pos.delete'] || 'Eliminar'}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleResume(sale)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px]
                                                                       rounded-lg bg-brand text-white text-[11px]
                                                                       font-bold hover:bg-brand-dark
                                                                       transition-colors active:scale-[0.97]
                                                                       focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                                                        >
                                                            <Play className="w-3 h-3" />
                                                            {labels['panel.pos.resume'] || 'Retomar'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Footer — Clear all */}
                {sales.length > 1 && (
                    <div className="px-5 py-3 border-t border-sf-2 bg-sf-0">
                        <button
                            onClick={handleClearAll}
                            className="w-full py-2.5 rounded-xl text-xs font-medium min-h-[44px]
                                       text-rose-500 bg-rose-500/5 border border-rose-500/10
                                       hover:bg-rose-500/10 transition-colors
                                       focus-visible:ring-2 focus-visible:ring-rose-500/40 focus-visible:outline-none"
                        >
                            <Trash2 className="w-3 h-3 inline mr-1.5" />
                            {labels['panel.pos.clearAll'] || 'Eliminar todas las ventas en espera'}
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
