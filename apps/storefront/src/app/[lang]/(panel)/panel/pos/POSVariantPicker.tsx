'use client'

/**
 * POSVariantPicker — Modal for choosing a variant when product has >1 variant
 *
 * Touch-friendly: large buttons (min 48×48), visual variant grid, price display.
 * Opens when user taps a multi-variant product in the POS grid.
 */

import { useEffect } from 'react'
import { X, Package } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AdminProductFull } from '@/lib/medusa/admin'
import type { POSCartItem } from '@/lib/pos/pos-config'
import { posLabel } from '@/lib/pos/pos-i18n'

interface POSVariantPickerProps {
    product: AdminProductFull
    defaultCurrency: string
    onSelect: (item: POSCartItem) => void
    onClose: () => void
    labels: Record<string, string>
}

export default function POSVariantPicker({
    product,
    defaultCurrency,
    onSelect,
    onClose,
    labels,
}: POSVariantPickerProps) {
    // ── Escape key to dismiss ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    const formatPrice = (amount: number, currency: string) =>
        new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
        }).format(amount / 100)

    const handleVariantSelect = (variantIndex: number) => {
        const variant = product.variants[variantIndex]
        if (!variant) return

        const calcPrice = (variant as any).calculated_price
        const fallbackPrice = variant.prices?.[0]
        onSelect({
            id: variant.id,
            product_id: product.id,
            title: product.title,
            variant_title: variant.title,
            thumbnail: product.thumbnail,
            sku: variant.sku || null,
            unit_price: calcPrice?.calculated_amount ?? fallbackPrice?.amount ?? 0,
            quantity: 1,
            currency_code: calcPrice?.currency_code ?? fallbackPrice?.currency_code ?? defaultCurrency,
        })
    }

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center"
                role="dialog"
                aria-modal="true"
                aria-label={posLabel('panel.pos.selectVariant', labels) || 'Select variant'}
            >
                {/* Backdrop */}
                <motion.div
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    className="relative w-full max-w-lg mx-4 rounded-2xl bg-sf-0 border border-sf-2 shadow-2xl overflow-hidden"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-sf-2">
                        <div className="flex items-center gap-3 min-w-0">
                            {product.thumbnail ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={product.thumbnail}
                                    alt={product.title}
                                    className="w-12 h-12 rounded-xl object-cover border border-sf-2"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-sf-1 flex items-center justify-center">
                                    <Package className="w-6 h-6 text-tx-faint" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <h3 className="text-sm font-bold text-tx truncate">
                                    {product.title}
                                </h3>
                                <p className="text-xs text-tx-muted">
                                    {product.variants.length} {posLabel('panel.pos.variants', labels)}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label={labels['panel.pos.close'] || 'Close variant picker'}
                            className="w-9 h-9 rounded-lg flex items-center justify-center min-h-[44px] min-w-[44px]
                                       hover:bg-sf-1 text-tx-muted hover:text-tx
                                       transition-colors shrink-0
                                       focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Variant grid */}
                    <div className="p-4 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-2.5">
                            {product.variants.map((variant, idx) => {
                                const calcPrice = (variant as any).calculated_price
                                const fallbackPrice = variant.prices?.[0]
                                const isInStock = variant.manage_inventory
                                    ? (variant.inventory_quantity ?? 0) > 0
                                    : true

                                return (
                                    <motion.button
                                        key={variant.id}
                                        onClick={() => handleVariantSelect(idx)}
                                        disabled={!isInStock}
                                        initial={{ opacity: 0, scale: 0.92 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.15 + idx * 0.04, type: 'spring', damping: 20, stiffness: 250 }}
                                        aria-label={`${variant.title || `Variant ${idx + 1}`} — ${formatPrice(
                                            calcPrice?.calculated_amount ?? fallbackPrice?.amount ?? 0,
                                            calcPrice?.currency_code ?? fallbackPrice?.currency_code ?? defaultCurrency
                                        )}`}
                                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl
                                                   border-2 text-center transition-all duration-150
                                                   min-h-[80px]
                                                   focus-visible:ring-2 focus-visible:ring-med focus-visible:outline-none
                                                   ${isInStock
                                                       ? 'border-sf-2 hover:border-brand hover:bg-brand-subtle active:scale-[0.97] cursor-pointer'
                                                       : 'border-sf-2 opacity-50 cursor-not-allowed'
                                                   }`}
                                    >
                                        <span className="text-sm font-semibold text-tx">
                                            {variant.title || `Variante ${idx + 1}`}
                                        </span>
                                        {variant.sku && (
                                            <span className="text-[10px] text-tx-muted font-mono">
                                                {variant.sku}
                                            </span>
                                        )}
                                        {(calcPrice || fallbackPrice) && (
                                            <span className="text-sm font-bold text-brand">
                                                {formatPrice(
                                                    calcPrice?.calculated_amount ?? fallbackPrice?.amount ?? 0,
                                                    calcPrice?.currency_code ?? fallbackPrice?.currency_code ?? defaultCurrency
                                                )}
                                            </span>
                                        )}
                                        {!isInStock && (
                                            <span className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5
                                                           rounded-full bg-rose-500/10 text-rose-500 font-semibold">
                                                {posLabel('panel.pos.outOfStock', labels)}
                                            </span>
                                        )}
                                    </motion.button>
                                )
                            })}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
