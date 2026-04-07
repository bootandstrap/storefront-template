'use client'

/**
 * POSQuickPriceModal — Rapid price entry for products missing a price
 * in the tenant's configured currency.
 *
 * Shows:
 * - Product name + thumbnail
 * - Existing prices in other currencies (reference for manual conversion)
 * - Input for the target currency price
 * - "Set price" button that calls addVariantCurrencyPrice()
 * - Link to /productos for full product editing
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, DollarSign, ArrowRight, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'
import { posLabel } from '@/lib/pos/pos-i18n'
import { addVariantCurrencyPrice } from './actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface POSQuickPriceModalProps {
    product: {
        id: string
        title: string
        thumbnail: string | null
        variants: {
            id: string
            title: string
            prices: { amount: number; currency_code: string }[]
        }[]
    }
    targetCurrency: string
    /** Other prices available for reference */
    availablePrices: { amount: number; currency_code: string }[]
    onClose: () => void
    onPriceSet: () => void
    labels: Record<string, string>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function POSQuickPriceModal({
    product,
    targetCurrency,
    availablePrices,
    onClose,
    onPriceSet,
    labels,
}: POSQuickPriceModalProps) {
    const [price, setPrice] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const backdropRef = useRef<HTMLDivElement>(null)
    const variant = product.variants?.[0]

    // Autofocus input
    useEffect(() => {
        const timer = setTimeout(() => inputRef.current?.focus(), 100)
        return () => clearTimeout(timer)
    }, [])

    // Close on Escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [onClose])

    const handleSubmit = useCallback(async () => {
        const numPrice = parseFloat(price)
        if (isNaN(numPrice) || numPrice <= 0) {
            setError('Enter a valid price greater than 0')
            return
        }
        if (!variant) {
            setError('No variant found')
            return
        }

        setSaving(true)
        setError(null)

        const result = await addVariantCurrencyPrice({
            productId: product.id,
            variantId: variant.id,
            amount: numPrice,
            currencyCode: targetCurrency,
        })

        setSaving(false)

        if (result.success) {
            onPriceSet()
        } else {
            setError(result.error || 'Failed to set price')
        }
    }, [price, variant, product.id, targetCurrency, onPriceSet])

    const lang = typeof document !== 'undefined' ? document.documentElement.lang || 'es' : 'es'

    return (
        <AnimatePresence>
            <motion.div
                ref={backdropRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className="bg-sf-0 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-sf-2"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-tx">
                                    {posLabel('panel.pos.setPrice', labels) || 'Set Price'}
                                </h3>
                                <p className="text-[11px] text-tx-muted">
                                    {targetCurrency.toUpperCase()}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-sf-1 flex items-center justify-center
                                       hover:bg-sf-2 transition-colors"
                        >
                            <X className="w-4 h-4 text-tx-muted" />
                        </button>
                    </div>

                    {/* Product info */}
                    <div className="px-5 pb-4">
                        <div className="flex items-center gap-3 p-3 bg-sf-1 rounded-2xl">
                            {product.thumbnail ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={product.thumbnail}
                                    alt={product.title}
                                    className="w-12 h-12 rounded-xl object-cover"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-sf-2 flex items-center justify-center">
                                    <DollarSign className="w-5 h-5 text-tx-faint" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-tx truncate">{product.title}</p>
                                {variant && variant.title !== 'Default' && (
                                    <p className="text-[11px] text-tx-muted">{variant.title}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Existing prices reference */}
                    {availablePrices.length > 0 && (
                        <div className="px-5 pb-3">
                            <p className="text-[10px] font-bold text-tx-muted uppercase tracking-wider mb-2">
                                {posLabel('panel.pos.existingPrices', labels) || 'Existing prices'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {availablePrices.map(p => (
                                    <span
                                        key={p.currency_code}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sf-1 rounded-xl text-xs font-medium text-tx-sec"
                                    >
                                        <span className="text-[10px] font-bold text-tx-muted uppercase">
                                            {p.currency_code}
                                        </span>
                                        {formatPOSCurrency(p.amount, p.currency_code)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Price input */}
                    <div className="px-5 pb-4">
                        <label className="text-[10px] font-bold text-tx-muted uppercase tracking-wider mb-2 block">
                            {posLabel('panel.pos.priceIn', labels) || 'Price in'} {targetCurrency.toUpperCase()}
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-tx-muted">
                                {targetCurrency.toUpperCase()}
                            </span>
                            <input
                                ref={inputRef}
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={price}
                                onChange={e => { setPrice(e.target.value); setError(null) }}
                                onKeyDown={e => { if (e.key === 'Enter' && !saving) handleSubmit() }}
                                className="w-full pl-14 pr-4 py-3.5 rounded-2xl bg-sf-1 text-sm font-semibold text-right
                                           border border-transparent focus:outline-none focus:ring-2 focus:ring-brand/20
                                           focus:border-brand/30 transition-all tabular-nums"
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 mt-2 px-3 py-2 bg-red-50 rounded-xl"
                            >
                                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                <p className="text-[11px] text-red-600 font-medium">{error}</p>
                            </motion.div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="px-5 pb-5 flex flex-col gap-2">
                        <button
                            onClick={handleSubmit}
                            disabled={saving || !price}
                            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white
                                       bg-brand hover:bg-brand-dark transition-colors
                                       disabled:opacity-40 disabled:cursor-not-allowed
                                       active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {posLabel('panel.pos.saving', labels) || 'Saving...'}
                                </>
                            ) : (
                                <>
                                    {posLabel('panel.pos.setPrice', labels) || 'Set Price'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        <a
                            href={`/${lang}/panel/productos`}
                            className="w-full py-2.5 rounded-2xl text-xs font-medium text-tx-sec text-center
                                       hover:bg-sf-1 transition-colors flex items-center justify-center gap-1.5"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {posLabel('panel.pos.editInProducts', labels) || 'Edit in Products'}
                        </a>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
