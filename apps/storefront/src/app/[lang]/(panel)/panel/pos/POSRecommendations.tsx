/**
 * POSRecommendations — "Frequently Bought Together" Suggestions
 *
 * Analyzes POS sales history to find co-occurring products
 * and displays contextual recommendations based on current cart items.
 *
 * Algorithm: For each cart item, find products most frequently
 * sold together in the same transaction. Score by co-occurrence count.
 */
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { POSCartItem, POSSaleRecord } from '@/lib/pos/pos-config'
import { safeVariantPrice } from '@/lib/pos/pos-config'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'
import { posLabel } from '@/lib/pos/pos-i18n'

// ── Co-occurrence storage ──

const CO_OCCURRENCE_KEY = 'pos-co-occurrence'

interface CoOccurrenceMap {
    /** product_title -> { co_product_title: score } */
    [title: string]: Record<string, number>
}

function getCoOccurrenceMap(): CoOccurrenceMap {
    if (typeof window === 'undefined') return {}
    try {
        return JSON.parse(localStorage.getItem(CO_OCCURRENCE_KEY) || '{}')
    } catch {
        return {}
    }
}

/** Record co-occurrences from a completed sale */
export function recordCoOccurrence(items: { title: string }[]): void {
    if (items.length < 2) return
    const map = getCoOccurrenceMap()

    for (let i = 0; i < items.length; i++) {
        for (let j = 0; j < items.length; j++) {
            if (i === j) continue
            const a = items[i].title
            const b = items[j].title
            if (!map[a]) map[a] = {}
            map[a][b] = (map[a][b] || 0) + 1
        }
    }

    localStorage.setItem(CO_OCCURRENCE_KEY, JSON.stringify(map))
}

/** Build initial co-occurrence data from sales history */
export function buildCoOccurrenceFromHistory(sales: POSSaleRecord[]): void {
    const map: CoOccurrenceMap = {}
    for (const sale of sales) {
        if (sale.items.length < 2) continue
        for (let i = 0; i < sale.items.length; i++) {
            for (let j = 0; j < sale.items.length; j++) {
                if (i === j) continue
                const a = sale.items[i].title
                const b = sale.items[j].title
                if (!map[a]) map[a] = {}
                map[a][b] = (map[a][b] || 0) + 1
            }
        }
    }
    localStorage.setItem(CO_OCCURRENCE_KEY, JSON.stringify(map))
}

// ── Component ──

interface POSRecommendationsProps {
    cartItems: POSCartItem[]
    onAddItem: (item: POSCartItem) => void
    /** All available products — raw Medusa format (prices in variant.calculated_price) */
    allProducts: any[]
    labels: Record<string, string>
    defaultCurrency: string
    maxSuggestions?: number
}

interface Recommendation {
    product: any           // raw Medusa product
    cartItem: POSCartItem  // pre-built cart item with safe price
    score: number          // co-occurrence count
    reason: string         // "Comprado con X"
}

export default function POSRecommendations({
    cartItems,
    onAddItem,
    allProducts,
    labels,
    defaultCurrency,
    maxSuggestions = 4,
}: POSRecommendationsProps) {
    const [dismissed, setDismissed] = useState<Set<string>>(new Set())

    const formatCurrency = useCallback((amount: number) =>
        formatPOSCurrency(amount, defaultCurrency),
    [defaultCurrency])

    const recommendations = useMemo((): Recommendation[] => {
        if (cartItems.length === 0) return []
        const map = getCoOccurrenceMap()
        const cartTitles = new Set(cartItems.map(i => i.title))
        const scored = new Map<string, { score: number; reason: string }>()

        for (const item of cartItems) {
            const coMap = map[item.title]
            if (!coMap) continue

            for (const [coTitle, count] of Object.entries(coMap)) {
                if (cartTitles.has(coTitle)) continue
                if (dismissed.has(coTitle)) continue

                const existing = scored.get(coTitle)
                if (!existing || count > existing.score) {
                    scored.set(coTitle, {
                        score: count,
                        reason: `${labels['panel.pos.boughtWith'] || 'Comprado con'} ${item.title}`,
                    })
                }
            }
        }

        // Map to products and sort by score
        // Extract price safely from raw Medusa product variants
        return Array.from(scored.entries())
            .map(([title, { score, reason }]) => {
                const product = allProducts.find((p: any) => p.title === title)
                if (!product) return null
                const variant = product.variants?.[0]
                if (!variant) return null
                const { unit_price, currency_code } = safeVariantPrice(variant, defaultCurrency)
                const cartItem: POSCartItem = {
                    id: variant.id,
                    product_id: product.id,
                    title: product.title,
                    variant_title: product.variants.length > 1 ? variant.title : null,
                    thumbnail: product.thumbnail,
                    sku: variant.sku || null,
                    unit_price,
                    quantity: 1,
                    currency_code,
                }
                return { product, cartItem, score, reason }
            })
            .filter((r): r is Recommendation => r !== null)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxSuggestions)
    }, [cartItems, allProducts, dismissed, labels, maxSuggestions, defaultCurrency])

    if (recommendations.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5"
        >
            {/* Header */}
            <div className="flex items-center gap-1.5 px-0.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] font-bold text-tx-faint uppercase tracking-wider">
                    {labels['panel.pos.suggestions'] || 'Sugerencias'}
                </span>
                <div className="flex-1 h-px bg-sf-2" />
            </div>

            {/* Compact horizontal pill recommendations */}
            <div className="flex flex-wrap gap-1.5">
                <AnimatePresence initial={false}>
                    {recommendations.map((rec, idx) => (
                        <motion.button
                            key={rec.cartItem.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ delay: idx * 0.04, type: 'spring', damping: 20, stiffness: 200 }}
                            onClick={() => onAddItem(rec.cartItem)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                                       border border-sf-2 bg-sf-0 hover:border-brand-soft hover:bg-brand-subtle
                                       transition-all duration-200 group text-left"
                            aria-label={`${labels['panel.pos.add'] || 'Add'} ${rec.cartItem.title}`}
                        >
                            <span className="text-[11px] font-medium text-tx truncate max-w-[100px]">
                                {rec.cartItem.title}
                            </span>
                            <span className="text-[10px] font-bold text-tx-muted tabular-nums shrink-0">
                                {formatCurrency(rec.cartItem.unit_price)}
                            </span>
                            <Plus className="w-3 h-3 text-brand shrink-0 group-hover:scale-110 transition-transform" />
                        </motion.button>
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
