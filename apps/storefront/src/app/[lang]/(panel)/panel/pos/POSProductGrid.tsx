'use client'

/**
 * POSProductGrid — Touch-optimized product grid for POS (SOTA)
 *
 * Senior UI patterns applied:
 * - Shimmer skeleton with gradient animation (not plain animate-pulse)
 * - Grid density toggle: Compact / Default / Spacious
 * - Category pills with fade-edge scroll indicators
 * - Image lazy-load with shimmer → reveal transition
 * - Framer-motion tap animation with CheckCircle feedback
 * - Product count badge during search/filter
 * - Touch-optimized: min-h-[44px] on interactive elements
 * - Accessible: aria-labels on icon-only buttons
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Package, Search, CheckCircle2, X, Grid3X3, LayoutGrid } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AdminProductFull } from '@/lib/medusa/admin'
import type { POSCartItem } from '@/lib/pos/pos-config'
import { posLabel } from '@/lib/pos/pos-i18n'
import POSVariantPicker from './POSVariantPicker'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GridDensity = 'compact' | 'default' | 'spacious'

interface POSProductGridProps {
    products: AdminProductFull[]
    categories: { id: string; name: string }[]
    defaultCurrency: string
    onAddToCart: (item: POSCartItem) => void
    labels: Record<string, string>
    /** When true, renders skeleton cards instead of actual products */
    loading?: boolean
}

// ---------------------------------------------------------------------------
// Grid density config — Senior pattern: 8px grid-aligned gap + col count
// ---------------------------------------------------------------------------

const gridConfig: Record<GridDensity, { cols: string; gap: string; imageAspect: string }> = {
    compact:  { cols: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8', gap: 'gap-2', imageAspect: 'aspect-square' },
    default:  { cols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6', gap: 'gap-3', imageAspect: 'aspect-[4/3]' },
    spacious: { cols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5', gap: 'gap-4', imageAspect: 'aspect-[4/3]' },
}

// ---------------------------------------------------------------------------
// Shimmer Skeleton — gradient animation instead of plain pulse
// ---------------------------------------------------------------------------

function ProductSkeleton({ density }: { density: GridDensity }) {
    const cfg = gridConfig[density]
    return (
        <div className="flex flex-col bg-surface-0 rounded-xl border border-surface-2/50 overflow-hidden">
            <div className={`${cfg.imageAspect} bg-surface-1 relative overflow-hidden`}>
                <div
                    className="absolute inset-0 -translate-x-full animate-[shimmer-slide_1.5s_ease-in-out_infinite]"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }}
                />
            </div>
            <div className="p-3 flex flex-col gap-2">
                <div className="h-3 w-3/4 bg-surface-2/60 rounded relative overflow-hidden">
                    <div
                        className="absolute inset-0 -translate-x-full animate-[shimmer-slide_1.5s_ease-in-out_infinite_0.1s]"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}
                    />
                </div>
                <div className="h-4 w-1/2 bg-surface-2/60 rounded relative overflow-hidden">
                    <div
                        className="absolute inset-0 -translate-x-full animate-[shimmer-slide_1.5s_ease-in-out_infinite_0.2s]"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}
                    />
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Lazy image with shimmer → reveal
// ---------------------------------------------------------------------------

function LazyProductImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
    const [loaded, setLoaded] = useState(false)
    return (
        <>
            {!loaded && (
                <div className="absolute inset-0 bg-surface-1 overflow-hidden">
                    <div
                        className="absolute inset-0 -translate-x-full animate-[shimmer-slide_1.5s_ease-in-out_infinite]"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }}
                    />
                </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={alt}
                loading="lazy"
                onLoad={() => setLoaded(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className ?? ''}`}
            />
        </>
    )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function POSProductGrid({
    products,
    categories,
    defaultCurrency,
    onAddToCart,
    labels,
    loading = false,
}: POSProductGridProps) {
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState<string | null>(null)
    const [variantPickerProduct, setVariantPickerProduct] = useState<AdminProductFull | null>(null)
    const [tappedId, setTappedId] = useState<string | null>(null)
    const [density, setDensity] = useState<GridDensity>('default')

    // ── Category scroll fade indicators ──
    const scrollRef = useRef<HTMLDivElement>(null)
    const [showLeftFade, setShowLeftFade] = useState(false)
    const [showRightFade, setShowRightFade] = useState(false)

    const updateScrollFades = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        setShowLeftFade(el.scrollLeft > 8)
        setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
    }, [])

    useEffect(() => {
        updateScrollFades()
        const el = scrollRef.current
        el?.addEventListener('scroll', updateScrollFades, { passive: true })
        window.addEventListener('resize', updateScrollFades)
        return () => {
            el?.removeEventListener('scroll', updateScrollFades)
            window.removeEventListener('resize', updateScrollFades)
        }
    }, [updateScrollFades, categories])

    const filtered = useMemo(() => {
        /** Normalize text: strip diacritics + lowercase for accent-insensitive search */
        const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        const q = search ? norm(search) : ''

        return products.filter(p => {
            if (p.status !== 'published') return false
            const matchSearch = !q ||
                norm(p.title).includes(q) ||
                p.variants?.some(v => v.sku && norm(v.sku).includes(q))
            const matchCategory = !activeCategory ||
                p.categories?.some(c => c.id === activeCategory)
            return matchSearch && matchCategory
        })
    }, [products, search, activeCategory])

    const handleProductTap = useCallback((product: AdminProductFull) => {
        if ((product.variants?.length ?? 0) > 1) {
            setVariantPickerProduct(product)
            return
        }

        const variant = product.variants?.[0]
        if (!variant) return

        const calcPrice = (variant as any).calculated_price
        const fallbackPrice = variant.prices?.[0]
        const item: POSCartItem = {
            id: variant.id,
            product_id: product.id,
            title: product.title,
            variant_title: product.variants.length > 1 ? variant.title : null,
            thumbnail: product.thumbnail,
            sku: variant.sku || null,
            unit_price: calcPrice?.calculated_amount ?? fallbackPrice?.amount ?? 0,
            quantity: 1,
            currency_code: calcPrice?.currency_code ?? fallbackPrice?.currency_code ?? defaultCurrency,
        }

        setTappedId(product.id)
        setTimeout(() => setTappedId(null), 400)
        onAddToCart(item)
    }, [defaultCurrency, onAddToCart])

    const handleVariantSelect = useCallback((item: POSCartItem) => {
        setVariantPickerProduct(null)
        onAddToCart(item)
    }, [onAddToCart])

    const formatPrice = (product: AdminProductFull) => {
        const v = product.variants?.[0]
        const calc = (v as any)?.calculated_price
        const fallback = v?.prices?.[0]
        const amount = calc?.calculated_amount ?? fallback?.amount
        const currency = calc?.currency_code ?? fallback?.currency_code
        if (amount == null || !currency) return '—'
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
        }).format(amount / 100)
    }

    const cfg = gridConfig[density]

    return (
        <div className="flex flex-col h-full">
            {/* ── Search bar + density toggle ── */}
            <div className="p-3 pb-2 flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted pointer-events-none" />
                    <input
                        type="text"
                        data-pos-search="true"
                        placeholder={posLabel('panel.pos.search', labels)}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-11 pr-10 py-3 rounded-xl bg-surface-1 text-sm
                                   placeholder:text-text-muted/60 border border-transparent
                                   focus:outline-none focus:bg-surface-0 focus:ring-2 focus:ring-primary/30 focus:border-primary/40
                                   transition-all duration-200"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            aria-label={posLabel('panel.pos.clearSearch', labels)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary
                                       w-7 h-7 flex items-center justify-center rounded-full bg-surface-2
                                       hover:bg-surface-3 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Grid density toggle — 2 modes for simplicity */}
                <button
                    onClick={() => setDensity(prev => prev === 'compact' ? 'default' : prev === 'default' ? 'spacious' : 'compact')}
                    aria-label="Toggle grid density"
                    title={density === 'compact' ? 'Compact' : density === 'default' ? 'Default' : 'Spacious'}
                    className="min-w-[44px] h-[44px] rounded-xl bg-surface-1 border border-transparent
                               hover:bg-surface-2 hover:border-surface-3 text-text-muted hover:text-text-primary
                               flex items-center justify-center transition-all duration-200
                               focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    {density === 'compact' ? (
                        <Grid3X3 className="w-4.5 h-4.5" />
                    ) : (
                        <LayoutGrid className="w-4.5 h-4.5" />
                    )}
                </button>
            </div>

            {/* ── Category chips — with fade-edge scroll indicators ── */}
            <div className="relative">
                {/* Left fade */}
                {showLeftFade && (
                    <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-surface-0 to-transparent z-10 pointer-events-none" />
                )}
                {/* Right fade */}
                {showRightFade && (
                    <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-surface-0 to-transparent z-10 pointer-events-none" />
                )}

                <div
                    ref={scrollRef}
                    className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-hide"
                    style={{ scrollbarWidth: 'none' }}
                >
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200
                                   min-h-[36px] ${
                            !activeCategory
                                ? 'bg-primary text-white shadow-sm shadow-primary/25'
                                : 'bg-surface-1 text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                        }`}
                    >
                        {posLabel('panel.pos.allCategories', labels)}
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200
                                       min-h-[36px] ${
                                activeCategory === cat.id
                                    ? 'bg-primary text-white shadow-sm shadow-primary/25'
                                    : 'bg-surface-1 text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Filter result count — subtle feedback ── */}
            {(search || activeCategory) && !loading && filtered.length > 0 && (
                <div className="px-4 py-1">
                    <span className="text-[11px] font-medium text-text-muted tabular-nums">
                        {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
                    </span>
                </div>
            )}

            {/* ── Product grid ── */}
            <div className="flex-1 overflow-y-auto p-3 pt-2">
                {loading ? (
                    <div className={`grid ${cfg.cols} ${cfg.gap}`}>
                        {Array.from({ length: 12 }).map((_, i) => (
                            <ProductSkeleton key={i} density={density} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted gap-3">
                        <motion.div
                            className="w-16 h-16 rounded-2xl bg-surface-1 flex items-center justify-center"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                        >
                            <Package className="w-8 h-8 opacity-30" />
                        </motion.div>
                        <p className="text-sm font-medium">{posLabel('panel.pos.noResults', labels)}</p>
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="text-xs text-primary font-medium hover:underline underline-offset-2
                                           px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
                            >
                                {posLabel('panel.pos.clearSearch', labels)}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={`grid ${cfg.cols} ${cfg.gap}`}>
                        {filtered.map(product => (
                            <motion.button
                                key={product.id}
                                onClick={() => handleProductTap(product)}
                                animate={tappedId === product.id
                                    ? { scale: [1, 0.92, 1.02, 1] }
                                    : { scale: 1 }
                                }
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                className="group flex flex-col bg-surface-0 rounded-xl border border-surface-2/80
                                           hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5
                                           active:scale-[0.96] active:shadow-none
                                           transition-all duration-150 overflow-hidden text-left cursor-pointer"
                            >
                                {/* Product image — shimmer → reveal */}
                                <div className={`${cfg.imageAspect} bg-surface-1 flex items-center justify-center relative overflow-hidden`}>
                                    {product.thumbnail ? (
                                        <LazyProductImage
                                            src={product.thumbnail}
                                            alt={product.title}
                                            className="group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <Package className="w-10 h-10 text-text-muted/20" />
                                    )}
                                    {/* Variant count badge */}
                                    {(product.variants?.length ?? 0) > 1 && (
                                        <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5
                                                         rounded-full bg-black/60 text-white backdrop-blur-sm font-semibold">
                                            {product.variants.length} var
                                        </span>
                                    )}
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-200" />

                                    {/* Add feedback flash */}
                                    <AnimatePresence>
                                        {tappedId === product.id && (
                                            <motion.div
                                                className="absolute inset-0 bg-emerald-500/15 flex items-center justify-center"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.25 }}
                                            >
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    exit={{ scale: 0 }}
                                                    transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                                                >
                                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                                </motion.div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                {/* Product info */}
                                <div className={`p-3 flex-1 flex flex-col justify-between gap-1 ${density === 'compact' ? 'p-2' : ''}`}>
                                    <p className={`font-medium text-text-primary line-clamp-2 leading-snug ${density === 'compact' ? 'text-[11px]' : 'text-xs'}`}>
                                        {product.title}
                                    </p>
                                    <p className={`font-bold text-primary ${density === 'compact' ? 'text-xs' : 'text-sm'}`}>
                                        {formatPrice(product)}
                                    </p>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Variant Picker Modal ── */}
            {variantPickerProduct && (
                <POSVariantPicker
                    product={variantPickerProduct}
                    defaultCurrency={defaultCurrency}
                    onSelect={handleVariantSelect}
                    onClose={() => setVariantPickerProduct(null)}
                    labels={labels}
                />
            )}
        </div>
    )
}
