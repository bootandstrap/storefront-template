'use client'

/**
 * Inventory Manager — Owner Panel (SOTA rewrite)
 *
 * Fixes:
 * - No animation → PageEntrance + ListStagger
 * - Hand-rolled table → still table but with consistent glass + animation
 * - Basic inline edit → animated transition with AnimatePresence
 * - No stock level indicator → color-coded PanelStatusBadge-style
 * - Low stock alerts → AnimatePresence expand/collapse
 */

import { useState, useTransition } from 'react'
import PanelBadge from '@/components/panel/PanelBadge'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { Package, AlertTriangle, Search, Save, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { PageEntrance } from '@/components/panel/PanelAnimations'
import type { InventoryItem, LowStockItem, StockLocation } from '@/lib/medusa/admin-inventory'
import { updateStock } from './actions'

interface Labels {
    title: string
    subtitle: string
    searchPlaceholder: string
    sku: string
    product: string
    stocked: string
    reserved: string
    available: string
    lowStock: string
    outOfStock: string
    updateStock: string
    noItems: string
    save: string
    cancel: string
    alerts: string
    noAlerts: string
    hide: string
    itemsLeft: string
    untitled: string
}

interface Props {
    items: InventoryItem[]
    lowStockItems: LowStockItem[]
    locations: StockLocation[]
    labels: Labels
}

export default function InventoryClient({ items, lowStockItems, locations, labels }: Props) {
    const [search, setSearch] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState<number>(0)
    const [showAlerts, setShowAlerts] = useState(lowStockItems.length > 0)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    const toast = useToast()

    const filtered = items.filter(item => {
        const q = search.toLowerCase()
        return !q || item.sku?.toLowerCase().includes(q) || item.title?.toLowerCase().includes(q)
    })

    const handleStockUpdate = async (itemId: string, locationId: string) => {
        startTransition(async () => {
            try {
                const result = await updateStock(itemId, locationId, editValue)
                if (!result.success) throw new Error(result.error ?? 'Failed')
                toast.success('✓')
                setEditingId(null)
                router.refresh()
            } catch {
                toast.error('Failed to update stock')
            }
        })
    }

    return (
        <PageEntrance className="space-y-5">
            {/* Header */}
            <PanelPageHeader
                title={labels.title}
                subtitle={labels.subtitle}
                icon={<Package className="w-5 h-5" />}
                badge={items.length}
            />

            {/* Low Stock Alerts */}
            <AnimatePresence>
                {showAlerts && lowStockItems.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="glass rounded-2xl border-l-4 border-l-amber-500 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                    <AlertTriangle className="w-5 h-5" />
                                    {labels.alerts} ({lowStockItems.length})
                                </h2>
                                <button
                                    onClick={() => setShowAlerts(false)}
                                    aria-label="Dismiss alerts"
                                    className="p-1.5 min-h-[36px] rounded-lg hover:bg-sf-1 text-tx-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid gap-2">
                                {lowStockItems.slice(0, 5).map(item => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/60 dark:bg-white/5"
                                    >
                                        <div>
                                            <span className="font-medium text-sm">{item.title || item.sku || 'Unknown'}</span>
                                            {item.sku && (
                                                <span className="ml-2 text-xs text-tx-muted">SKU: {item.sku}</span>
                                            )}
                                        </div>
                                        <span className={`text-sm font-bold ${item.is_out_of_stock ? 'text-red-600' : 'text-amber-600'}`}>
                                            {item.is_out_of_stock ? labels.outOfStock : `${item.available_quantity} ${labels.itemsLeft}`}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted" />
                <input
                    type="text"
                    placeholder={labels.searchPlaceholder}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl glass text-sm focus:ring-2 focus:ring-soft focus:outline-none transition-all"
                />
            </div>

            {/* Inventory Table */}
            {filtered.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-2xl"
                >
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Package className="w-8 h-8 text-tx-muted" strokeWidth={1.5} />
                        </div>
                        <p className="text-tx-muted text-lg">{labels.noItems}</p>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-2xl overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-glass border-b border-sf-3">
                                    <th className="text-left px-4 py-3 font-semibold text-tx-muted text-xs uppercase tracking-wide">{labels.product}</th>
                                    <th className="text-left px-4 py-3 font-semibold text-tx-muted text-xs uppercase tracking-wide">{labels.sku}</th>
                                    <th className="text-right px-4 py-3 font-semibold text-tx-muted text-xs uppercase tracking-wide">{labels.stocked}</th>
                                    <th className="text-right px-4 py-3 font-semibold text-tx-muted text-xs uppercase tracking-wide">{labels.reserved}</th>
                                    <th className="text-right px-4 py-3 font-semibold text-tx-muted text-xs uppercase tracking-wide">{labels.available}</th>
                                    <th className="text-right px-4 py-3 font-semibold text-tx-muted text-xs uppercase tracking-wide">{labels.updateStock}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-2">
                                {filtered.map(item => {
                                    const available = (item.stocked_quantity ?? 0) - (item.reserved_quantity ?? 0)
                                    const isLow = available <= 5 && available > 0
                                    const isOut = available <= 0

                                    return (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className={`transition-colors ${
                                                editingId === item.id
                                                    ? 'bg-brand-subtle'
                                                    : 'hover:bg-glass'
                                            }`}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {item.thumbnail ? (
                                                        <img
                                                            src={item.thumbnail}
                                                            alt=""
                                                            className="w-8 h-8 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-sf-1 flex items-center justify-center">
                                                            <Package className="w-4 h-4 text-tx-muted" />
                                                        </div>
                                                    )}
                                                    <span className="font-medium">{item.title || labels.untitled}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-tx-muted font-mono text-xs">
                                                {item.sku || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {item.stocked_quantity ?? 0}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-tx-muted">
                                                {item.reserved_quantity ?? 0}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <PanelBadge
                                                    variant={isOut ? 'error' : isLow ? 'warning' : 'success'}
                                                    size="sm"
                                                    dot
                                                >
                                                    {available}
                                                </PanelBadge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <AnimatePresence mode="wait">
                                                    {editingId === item.id ? (
                                                        <motion.div
                                                            key="editing"
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            className="flex items-center justify-end gap-2"
                                                        >
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={editValue}
                                                                onChange={e => setEditValue(parseInt(e.target.value) || 0)}
                                                                className="w-20 px-2 py-1.5 min-h-[36px] rounded-lg glass text-right text-sm font-mono focus:ring-2 focus:ring-soft focus:outline-none"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => handleStockUpdate(item.id, locations[0]?.id || '')}
                                                                disabled={isPending}
                                                                aria-label={labels.save}
                                                                className="p-1.5 min-h-[36px] rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2"
                                                            >
                                                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                aria-label={labels.cancel}
                                                                className="p-1.5 min-h-[36px] rounded-lg hover:bg-sf-1 text-tx-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </motion.div>
                                                    ) : (
                                                        <motion.button
                                                            key="edit-btn"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            onClick={() => {
                                                                setEditingId(item.id)
                                                                setEditValue(item.stocked_quantity ?? 0)
                                                            }}
                                                            className="text-xs text-brand hover:text-brand-light font-medium transition-colors min-h-[36px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med rounded-lg px-2"
                                                        >
                                                            {labels.updateStock}
                                                        </motion.button>
                                                    )}
                                                </AnimatePresence>
                                            </td>
                                        </motion.tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}
        </PageEntrance>
    )
}
