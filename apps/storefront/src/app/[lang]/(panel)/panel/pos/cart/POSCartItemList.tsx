'use client'

/**
 * POSCartItemList — Cart items list with swipe-to-delete
 *
 * Extracted from POSCart.tsx. Features:
 * - Drag-to-delete with velocity-based threshold (Framer Motion best practice)
 * - Layout animations for smooth reorder on add/remove
 * - Empty state with staggered entrance
 * - Premium hover glass effect
 *
 * @module pos/cart/POSCartItemList
 */

import { Minus, Plus, Trash2, Package, ShoppingCart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { POSCartItem } from '@/lib/pos/pos-config'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'
import { posLabel } from '@/lib/pos/pos-i18n'
import { POS_SPRINGS } from '../hooks/pos-springs'

interface POSCartItemListProps {
    items: POSCartItem[]
    onUpdateQty: (variantId: string, quantity: number) => void
    onRemoveItem: (variantId: string) => void
    labels: Record<string, string>
    defaultCurrency: string
}

export default function POSCartItemList({
    items,
    onUpdateQty,
    onRemoveItem,
    labels,
    defaultCurrency,
}: POSCartItemListProps) {
    const formatCurrency = (amount: number, currency?: string) =>
        formatPOSCurrency(amount, currency || defaultCurrency)

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-tx-muted gap-3 py-12">
                <motion.div
                    className="w-16 h-16 rounded-2xl bg-sf-1 flex items-center justify-center"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={POS_SPRINGS.bouncy}
                >
                    <ShoppingCart className="w-7 h-7 opacity-25" />
                </motion.div>
                <motion.p
                    className="text-sm text-tx-faint font-medium"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    {posLabel('panel.pos.emptyCart', labels)}
                </motion.p>
                <motion.p
                    className="text-[11px] text-tx-faint text-center max-w-[180px]"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    {posLabel('panel.pos.emptyCartHint', labels) || 'Selecciona productos del catálogo para comenzar'}
                </motion.p>
            </div>
        )
    }

    return (
        <AnimatePresence initial={false}>
            {items.map(item => (
                <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
                    transition={{ layout: POS_SPRINGS.layout, opacity: { duration: 0.18 } }}
                    className="relative rounded-xl overflow-hidden"
                >
                    {/* Swipe-to-delete backdrop */}
                    <div className="absolute inset-0 bg-rose-500/8 flex items-center justify-end pr-4 rounded-xl">
                        <Trash2 className="w-4 h-4 text-rose-400" />
                    </div>

                    {/* Cart item row */}
                    <motion.div
                        drag="x"
                        dragConstraints={{ left: -72, right: 0 }}
                        dragElastic={0.12}
                        onDragEnd={(_, info) => {
                            // Velocity-based threshold: either distance OR speed triggers delete
                            if (info.offset.x < -55 || info.velocity.x < -300) {
                                onRemoveItem(item.id)
                            }
                        }}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-sf-0
                                   pos-cart-item-premium
                                   cursor-grab active:cursor-grabbing relative z-10"
                        style={{ touchAction: 'pan-y' }}
                    >
                        {/* Thumbnail */}
                        {item.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={item.thumbnail}
                                alt=""
                                className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-lg bg-sf-2 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-tx-faint" />
                            </div>
                        )}

                        {/* Title + variant */}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-tx truncate leading-tight">
                                {item.title}
                            </p>
                            {item.variant_title && (
                                <p className="text-[10px] text-tx-faint truncate">{item.variant_title}</p>
                            )}
                        </div>

                        {/* Qty stepper */}
                        <div className="flex items-center gap-0 bg-sf-1 rounded-lg flex-shrink-0">
                            <button
                                onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                                aria-label={`Decrease quantity of ${item.title}`}
                                className="w-7 h-7 flex items-center justify-center
                                           hover:bg-sf-2 rounded-l-lg transition-colors active:scale-90"
                            >
                                <Minus className="w-3 h-3" />
                            </button>
                            <motion.span
                                key={item.quantity}
                                initial={{ scale: 1.2 }}
                                animate={{ scale: 1 }}
                                transition={POS_SPRINGS.snappy}
                                className="w-6 text-center text-xs font-bold tabular-nums"
                            >
                                {item.quantity}
                            </motion.span>
                            <button
                                onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                                aria-label={`Increase quantity of ${item.title}`}
                                className="w-7 h-7 flex items-center justify-center
                                           hover:bg-sf-2 rounded-r-lg transition-colors active:scale-90"
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Item total */}
                        <span className="text-xs font-bold text-tx tabular-nums w-16 text-right shrink-0">
                            {formatCurrency(item.unit_price * item.quantity, item.currency_code)}
                        </span>
                    </motion.div>
                </motion.div>
            ))}
        </AnimatePresence>
    )
}
