'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { Package, AlertTriangle, Search, ArrowUpDown, Save } from 'lucide-react'
import type { InventoryItem, LowStockItem, StockLocation } from '@/lib/medusa/admin-inventory'
import { updateStock } from './actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
        return (
            !q ||
            item.sku?.toLowerCase().includes(q) ||
            item.title?.toLowerCase().includes(q)
        )
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="w-6 h-6" />
                        {labels.title}
                    </h1>
                    <p className="text-sm text-text-muted mt-1">{labels.subtitle}</p>
                </div>
            </div>

            {/* Low Stock Alerts */}
            {showAlerts && lowStockItems.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="w-5 h-5" />
                            {labels.alerts} ({lowStockItems.length})
                        </h2>
                        <button
                            onClick={() => setShowAlerts(false)}
                            className="text-xs text-text-muted hover:underline"
                        >
                            {labels.hide}
                        </button>
                    </div>
                    <div className="grid gap-2">
                        {lowStockItems.slice(0, 5).map(item => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/60 dark:bg-white/5"
                            >
                                <div>
                                    <span className="font-medium text-sm">{item.title || item.sku || 'Unknown'}</span>
                                    {item.sku && (
                                        <span className="ml-2 text-xs text-text-muted">SKU: {item.sku}</span>
                                    )}
                                </div>
                                <span className={`text-sm font-bold ${item.is_out_of_stock ? 'text-red-600' : 'text-amber-600'}`}>
                                    {item.is_out_of_stock ? labels.outOfStock : `${item.available_quantity} ${labels.itemsLeft}`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                    type="text"
                    placeholder={labels.searchPlaceholder}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-3 bg-surface-1 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none"
                />
            </div>

            {/* Inventory Table */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-text-muted">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>{labels.noItems}</p>
                </div>
            ) : (
                <div className="rounded-xl border border-surface-3 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-surface-1 border-b border-surface-3">
                                <th className="text-left px-4 py-3 font-medium">{labels.product}</th>
                                <th className="text-left px-4 py-3 font-medium">{labels.sku}</th>
                                <th className="text-right px-4 py-3 font-medium flex items-center justify-end gap-1">
                                    <ArrowUpDown className="w-3 h-3" />
                                    {labels.stocked}
                                </th>
                                <th className="text-right px-4 py-3 font-medium">{labels.reserved}</th>
                                <th className="text-right px-4 py-3 font-medium">{labels.available}</th>
                                <th className="text-right px-4 py-3 font-medium">{labels.updateStock}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-3">
                            {filtered.map(item => {
                                const available = (item.stocked_quantity ?? 0) - (item.reserved_quantity ?? 0)
                                const isLow = available <= 5 && available > 0
                                const isOut = available <= 0

                                return (
                                    <tr key={item.id} className="hover:bg-surface-1/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {item.thumbnail ? (
                                                    <img
                                                        src={item.thumbnail}
                                                        alt=""
                                                        className="w-8 h-8 rounded object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded bg-surface-1 flex items-center justify-center">
                                                        <Package className="w-4 h-4 text-text-muted" />
                                                    </div>
                                                )}
                                                <span className="font-medium">{item.title || labels.untitled}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-text-muted">
                                            {item.sku || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            {item.stocked_quantity ?? 0}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-text-muted">
                                            {item.reserved_quantity ?? 0}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`font-bold font-mono ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600'
                                                }`}>
                                                {available}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {editingId === item.id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={editValue}
                                                        onChange={e => setEditValue(parseInt(e.target.value) || 0)}
                                                        className="w-20 px-2 py-1 rounded border border-surface-3 bg-surface-1 text-right text-sm font-mono"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleStockUpdate(
                                                            item.id,
                                                            locations[0]?.id || ''
                                                        )}
                                                        disabled={isPending}
                                                        className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="text-xs text-text-muted hover:underline"
                                                    >
                                                        {labels.cancel}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setEditingId(item.id)
                                                        setEditValue(item.stocked_quantity ?? 0)
                                                    }}
                                                    className="text-xs text-primary hover:underline"
                                                >
                                                    {labels.updateStock}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
