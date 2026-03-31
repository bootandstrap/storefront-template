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
import { Plus, Sparkles, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { POSCartItem, POSSaleRecord } from '@/lib/pos/pos-config'
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
    /** All available products to pick recommendations from */
    allProducts: POSCartItem[]
    labels: Record<string, string>
    defaultCurrency: string
    maxSuggestions?: number
}

interface Recommendation {
    product: POSCartItem
    score: number        // co-occurrence count
    reason: string       // "Comprado con X"
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
        new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: defaultCurrency,
        }).format(amount / 100),
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
        return Array.from(scored.entries())
            .map(([title, { score, reason }]) => {
                const product = allProducts.find(p => p.title === title)
                if (!product) return null
                return { product, score, reason }
            })
            .filter((r): r is Recommendation => r !== null)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxSuggestions)
    }, [cartItems, allProducts, dismissed, labels, maxSuggestions])

    if (recommendations.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-bold text-tx-sec uppercase tracking-wider">
                    {labels['panel.pos.suggestions'] || 'Sugerencias'}
                </span>
                <div className="flex-1 h-px bg-sf-2" />
            </div>

            {/* Recommendations horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
                <AnimatePresence initial={false}>
                    {recommendations.map((rec, idx) => (
                        <motion.div
                            key={rec.product.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9, x: 20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.8, x: -20 }}
                            transition={{ delay: idx * 0.06, type: 'spring', damping: 20, stiffness: 200 }}
                            className="flex-shrink-0 w-[140px] rounded-2xl border border-sf-2 bg-glass
                                       hover:border-brand-soft hover:shadow-sm transition-all duration-300 group overflow-hidden"
                        >
                            {/* Product thumbnail */}
                            {rec.product.thumbnail && (
                                <div className="h-16 bg-sf-1 overflow-hidden">
                                    <img
                                        src={rec.product.thumbnail}
                                        alt={rec.product.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                            )}

                            <div className="p-2.5 space-y-1.5">
                                <div className="text-[11px] font-semibold text-tx leading-tight line-clamp-2">
                                    {rec.product.title}
                                </div>

                                {/* Score badge */}
                                <div className="flex items-center gap-1 text-[9px] text-tx-muted">
                                    <TrendingUp className="w-2.5 h-2.5" />
                                    {rec.score}× juntos
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-tx tabular-nums">
                                        {formatCurrency(rec.product.unit_price)}
                                    </span>
                                    <button
                                        onClick={() => onAddItem(rec.product)}
                                        className="w-7 h-7 rounded-lg bg-brand-subtle text-brand
                                                   flex items-center justify-center
                                                   hover:bg-brand hover:text-white
                                                   transition-all duration-200"
                                        aria-label={`${labels['panel.pos.add'] || 'Add'} ${rec.product.title}`}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
