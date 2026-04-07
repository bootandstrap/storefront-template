'use client'

/**
 * POSProductGrid — Touch-optimized product grid for POS (SOTA v2)
 *
 * Enhancements over v1:
 * - Premium card design with depth shadows and green border-pulse on add
 * - Stock badge (low stock / out of stock) with inventory_quantity awareness
 * - Display Config popover replaces simple density toggle (sound, grid size, stock mode)
 * - Improved search bar with focus transition
 * - Mobile-first responsive grid
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Package, Search, CheckCircle2, X, Settings2, Grid3X3, LayoutGrid, Columns3, Volume2, VolumeX, Eye, EyeOff, AlertTriangle, DollarSign } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AdminProductFull } from '@/lib/medusa/admin'
import type { POSCartItem } from '@/lib/pos/pos-config'
import { safeVariantPrice, type VariantPriceResult } from '@/lib/pos/pos-config'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'
import { posLabel } from '@/lib/pos/pos-i18n'
import POSVariantPicker from './POSVariantPicker'
import POSQuickPriceModal from './POSQuickPriceModal'

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
    loading?: boolean
    /** Callback when a price is set via quick-price modal — triggers data refresh */
    onPriceSet?: () => void
}

// ---------------------------------------------------------------------------
// Grid density config
// ---------------------------------------------------------------------------

const gridConfig: Record<GridDensity, { cols: string; gap: string; imageAspect: string }> = {
    compact:  { cols: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8', gap: 'gap-2', imageAspect: 'aspect-square' },
    default:  { cols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6', gap: 'gap-3', imageAspect: 'aspect-[4/3]' },
    spacious: { cols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5', gap: 'gap-4', imageAspect: 'aspect-[4/3]' },
}

// ---------------------------------------------------------------------------
// Stock Helpers
// ---------------------------------------------------------------------------

function getStockInfo(product: AdminProductFull): { status: 'in_stock' | 'low_stock' | 'out_of_stock'; quantity: number | null; managed: boolean } {
    const variants = product.variants ?? []
    if (variants.length === 0) return { status: 'in_stock', quantity: null, managed: false }

    const managed = variants.some(v => v.manage_inventory)
    if (!managed) return { status: 'in_stock', quantity: null, managed: false }

    const totalQty = variants.reduce((sum, v) => {
        if (!v.manage_inventory) return sum
        return sum + (v.inventory_quantity ?? 0)
    }, 0)

    if (totalQty <= 0) return { status: 'out_of_stock', quantity: 0, managed: true }
    if (totalQty <= 3)  return { status: 'low_stock', quantity: totalQty, managed: true }
    return { status: 'in_stock', quantity: totalQty, managed: true }
}

// ---------------------------------------------------------------------------
// Shimmer Skeleton
// ---------------------------------------------------------------------------

function ProductSkeleton({ density }: { density: GridDensity }) {
    const cfg = gridConfig[density]
    return (
        <div className="flex flex-col bg-sf-0 rounded-2xl border border-sf-2 overflow-hidden shadow-xs">
            <div className={`${cfg.imageAspect} bg-sf-1 relative overflow-hidden`}>
                <div
                    className="absolute inset-0 -translate-x-full animate-[shimmer-slide_1.5s_ease-in-out_infinite]"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }}
                />
            </div>
            <div className="p-3 flex flex-col gap-2">
                <div className="h-3 w-3/4 bg-glass rounded relative overflow-hidden">
                    <div
                        className="absolute inset-0 -translate-x-full animate-[shimmer-slide_1.5s_ease-in-out_infinite_0.1s]"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}
                    />
                </div>
                <div className="h-4 w-1/2 bg-glass rounded relative overflow-hidden">
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
// Lazy Image
// ---------------------------------------------------------------------------

function LazyProductImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
    const [loaded, setLoaded] = useState(false)
    return (
        <>
            {!loaded && (
                <div className="absolute inset-0 bg-sf-1 overflow-hidden">
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
// Stock Badge
// ---------------------------------------------------------------------------

function StockBadge({ status, quantity }: { status: 'in_stock' | 'low_stock' | 'out_of_stock'; quantity: number | null }) {
    if (status === 'in_stock') return null

    return (
        <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-bold backdrop-blur-sm z-10 ${
            status === 'out_of_stock'
                ? 'bg-red-500/90 text-white'
                : 'bg-amber-500/90 text-white'
        }`}>
            {status === 'out_of_stock' ? '⊘ Agotado' : `⚠ ${quantity} left`}
        </span>
    )
}

// ---------------------------------------------------------------------------
// Display Config Popover
// ---------------------------------------------------------------------------

function DisplayConfigPopover({
    density,
    setDensity,
    showStock,
    setShowStock,
    soundEnabled,
    setSoundEnabled,
    onClose,
    labels,
}: {
    density: GridDensity
    setDensity: (d: GridDensity) => void
    showStock: boolean
    setShowStock: (v: boolean) => void
    soundEnabled: boolean
    setSoundEnabled: (v: boolean) => void
    onClose: () => void
    labels: Record<string, string>
}) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [onClose])

    const densities: { key: GridDensity; icon: typeof Grid3X3; label: string }[] = [
        { key: 'compact', icon: Grid3X3, label: 'Compacto' },
        { key: 'default', icon: LayoutGrid, label: 'Normal' },
        { key: 'spacious', icon: Columns3, label: 'Grande' },
    ]

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="pos-display-popover"
        >
            {/* Grid size */}
            <div className="mb-3">
                <p className="text-[10px] font-bold text-tx-muted uppercase tracking-wider mb-2">
                    {posLabel('panel.pos.gridSize', labels) || 'Grid Size'}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                    {densities.map(d => (
                        <button
                            key={d.key}
                            onClick={() => setDensity(d.key)}
                            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                                density === d.key
                                    ? 'bg-brand/10 text-brand-dark ring-1 ring-brand/20'
                                    : 'bg-sf-1 text-tx-sec hover:bg-sf-2'
                            }`}
                        >
                            <d.icon className="w-4 h-4" />
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-sf-2 my-2" />

            {/* Toggles */}
            <div className="space-y-2">
                {/* Stock visibility toggle */}
                <button
                    onClick={() => setShowStock(!showStock)}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-xl hover:bg-sf-1 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        {showStock ? <Eye className="w-4 h-4 text-brand" /> : <EyeOff className="w-4 h-4 text-tx-faint" />}
                        <span className="text-xs font-medium text-tx">
                            {posLabel('panel.pos.showStock', labels) || 'Show Stock'}
                        </span>
                    </div>
                    <div className={`w-8 h-[18px] rounded-full transition-colors relative ${showStock ? 'bg-brand' : 'bg-sf-3'}`}>
                        <motion.div
                            className="absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-sm"
                            animate={{ x: showStock ? 16 : 2 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                    </div>
                </button>

                {/* Sound toggle */}
                <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-xl hover:bg-sf-1 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        {soundEnabled ? <Volume2 className="w-4 h-4 text-brand" /> : <VolumeX className="w-4 h-4 text-tx-faint" />}
                        <span className="text-xs font-medium text-tx">
                            {posLabel('panel.pos.soundEffects', labels) || 'Sound'}
                        </span>
                    </div>
                    <div className={`w-8 h-[18px] rounded-full transition-colors relative ${soundEnabled ? 'bg-brand' : 'bg-sf-3'}`}>
                        <motion.div
                            className="absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-sm"
                            animate={{ x: soundEnabled ? 16 : 2 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                    </div>
                </button>
            </div>
        </motion.div>
    )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function POSProductGrid({
    products,
    categories,
    defaultCurrency,
    onAddToCart,
    labels,
    loading = false,
    onPriceSet,
}: POSProductGridProps) {
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState<string | null>(null)
    const [variantPickerProduct, setVariantPickerProduct] = useState<AdminProductFull | null>(null)
    const [tappedId, setTappedId] = useState<string | null>(null)
    const [density, setDensity] = useState<GridDensity>('default')
    const [showStock, setShowStock] = useState(true)
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [configOpen, setConfigOpen] = useState(false)
    const [searchFocused, setSearchFocused] = useState(false)
    // Multi-currency: quick-price modal state
    const [quickPriceProduct, setQuickPriceProduct] = useState<{
        product: AdminProductFull
        availablePrices: { amount: number; currency_code: string }[]
    } | null>(null)

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

    // ── Currency-aware price check (memoized per product) ──
    const getProductPriceInfo = useCallback((product: AdminProductFull): VariantPriceResult => {
        const variant = product.variants?.[0]
        return safeVariantPrice(variant, defaultCurrency)
    }, [defaultCurrency])

    const handleProductTap = useCallback((product: AdminProductFull) => {
        // Check stock if managed
        const stock = getStockInfo(product)
        if (showStock && stock.status === 'out_of_stock') return

        // Check if product has a price in the target currency
        const priceInfo = getProductPriceInfo(product)
        if (!priceInfo.has_price) {
            // Open quick-price modal instead of adding to cart
            setQuickPriceProduct({ product, availablePrices: priceInfo.available_prices })
            return
        }

        if ((product.variants?.length ?? 0) > 1) {
            setVariantPickerProduct(product)
            return
        }

        const variant = product.variants?.[0]
        if (!variant) return

        const item: POSCartItem = {
            id: variant.id,
            product_id: product.id,
            title: product.title,
            variant_title: product.variants.length > 1 ? variant.title : null,
            thumbnail: product.thumbnail,
            sku: variant.sku || null,
            unit_price: priceInfo.unit_price,
            quantity: 1,
            currency_code: priceInfo.currency_code,
        }

        setTappedId(product.id)
        setTimeout(() => setTappedId(null), 500)
        onAddToCart(item)
    }, [defaultCurrency, onAddToCart, showStock, getProductPriceInfo])

    const handleVariantSelect = useCallback((item: POSCartItem) => {
        setVariantPickerProduct(null)
        onAddToCart(item)
    }, [onAddToCart])

    // Quick-price modal handler
    const handleQuickPriceSet = useCallback(() => {
        setQuickPriceProduct(null)
        onPriceSet?.()
    }, [onPriceSet])

    const formatProductPrice = (product: AdminProductFull) => {
        const priceInfo = getProductPriceInfo(product)
        if (!priceInfo.has_price) {
            // Show first available price with currency hint
            if (priceInfo.available_prices.length > 0) {
                const first = priceInfo.available_prices[0]
                return formatPOSCurrency(first.amount, first.currency_code)
            }
            return '—'
        }
        return formatPOSCurrency(priceInfo.unit_price, priceInfo.currency_code)
    }

    const cfg = gridConfig[density]

    return (
        <div className="flex flex-col h-full">
            {/* ── Search bar + Display Config ── */}
            <div className="p-3 pb-2 flex gap-2">
                <div className={`relative flex-1 transition-all duration-300 ${searchFocused ? 'flex-[2]' : ''}`}>
                    <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 pointer-events-none transition-colors ${
                        searchFocused ? 'text-brand' : 'text-tx-muted'
                    }`} />
                    <input
                        type="text"
                        data-pos-search="true"
                        placeholder={posLabel('panel.pos.search', labels)}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="w-full pl-11 pr-10 py-3 rounded-2xl bg-sf-1 text-sm
                                   placeholder:text-tx-faint border border-transparent
                                   focus:outline-none focus:bg-sf-0 focus:ring-2 focus:ring-brand/20 focus:border-brand/30
                                   transition-all duration-200"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            aria-label={posLabel('panel.pos.clearSearch', labels)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-tx-muted hover:text-tx
                                       w-7 h-7 flex items-center justify-center rounded-full bg-sf-2
                                       hover:bg-sf-3 transition-colors active:scale-90"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Display Config button (replaces old density toggle) */}
                <div className="relative">
                    <button
                        onClick={() => setConfigOpen(!configOpen)}
                        aria-label="Display settings"
                        className={`min-w-[44px] h-[44px] rounded-2xl border transition-all duration-200
                                   flex items-center justify-center
                                   focus-visible:ring-2 focus-visible:ring-brand/20 ${
                            configOpen
                                ? 'bg-brand/10 border-brand/20 text-brand-dark'
                                : 'bg-sf-1 border-transparent hover:bg-sf-2 text-tx-muted hover:text-tx'
                        }`}
                    >
                        <Settings2 className="w-4.5 h-4.5" />
                    </button>

                    <AnimatePresence>
                        {configOpen && (
                            <DisplayConfigPopover
                                density={density}
                                setDensity={setDensity}
                                showStock={showStock}
                                setShowStock={setShowStock}
                                soundEnabled={soundEnabled}
                                setSoundEnabled={setSoundEnabled}
                                onClose={() => setConfigOpen(false)}
                                labels={labels}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Category chips ── */}
            <div className="relative">
                {showLeftFade && (
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-sf-0 to-transparent z-10 pointer-events-none" />
                )}
                {showRightFade && (
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-sf-0 to-transparent z-10 pointer-events-none" />
                )}

                <div
                    ref={scrollRef}
                    className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-hide"
                    style={{ scrollbarWidth: 'none' }}
                >
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200
                                   min-h-[40px] active:scale-95 ${
                            !activeCategory
                                ? 'bg-brand text-white shadow-md shadow-brand/20'
                                : 'bg-sf-1 text-tx-sec hover:bg-sf-2 hover:text-tx'
                        }`}
                    >
                        {posLabel('panel.pos.allCategories', labels)}
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200
                                       min-h-[40px] active:scale-95 ${
                                activeCategory === cat.id
                                    ? 'bg-brand text-white shadow-md shadow-brand/20'
                                    : 'bg-sf-1 text-tx-sec hover:bg-sf-2 hover:text-tx'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Filter result count ── */}
            {(search || activeCategory) && !loading && filtered.length > 0 && (
                <div className="px-4 py-1">
                    <span className="text-[11px] font-medium text-tx-muted tabular-nums">
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
                    <div className="flex flex-col items-center justify-center h-full text-tx-muted gap-3">
                        <motion.div
                            className="w-16 h-16 rounded-2xl bg-sf-1 flex items-center justify-center"
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
                                className="text-xs text-brand font-medium hover:underline underline-offset-2
                                           px-3 py-1.5 rounded-lg hover:bg-brand/10 transition-colors"
                            >
                                {posLabel('panel.pos.clearSearch', labels)}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={`grid ${cfg.cols} ${cfg.gap}`}>
                        {filtered.map(product => {
                            const stock = getStockInfo(product)
                            const isOutOfStock = showStock && stock.status === 'out_of_stock'
                            const isTapped = tappedId === product.id
                            const priceInfo = getProductPriceInfo(product)
                            const missingPrice = !priceInfo.has_price
                            const isDisabled = isOutOfStock

                            return (
                                <motion.button
                                    key={product.id}
                                    onClick={() => handleProductTap(product)}
                                    disabled={isDisabled}
                                    animate={isTapped
                                        ? { scale: [1, 0.92, 1.02, 1] }
                                        : { scale: 1 }
                                    }
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                    className={`group flex flex-col bg-sf-0 rounded-2xl border overflow-hidden text-left cursor-pointer
                                               transition-all duration-200 relative
                                               focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:outline-none
                                               ${isTapped ? 'ring-2 ring-brand' : ''}
                                               ${isOutOfStock
                                                   ? 'border-sf-2 opacity-50 cursor-not-allowed grayscale'
                                                   : missingPrice
                                                       ? 'border-amber-300/60 opacity-65 shadow-xs'
                                                       : 'border-sf-2 shadow-xs hover:shadow-lg hover:shadow-brand/10 hover:border-brand/40 active:scale-[0.96]'
                                               }`}
                                >
                                    {/* Product image */}
                                    <div className={`${cfg.imageAspect} bg-sf-1 flex items-center justify-center relative overflow-hidden`}>
                                        {product.thumbnail ? (
                                            <LazyProductImage
                                                src={product.thumbnail}
                                                alt={product.title}
                                                className={`group-hover:scale-105 transition-transform duration-300 ${missingPrice ? 'grayscale-[50%]' : ''}`}
                                            />
                                        ) : (
                                            <Package className="w-10 h-10 text-tx-faint" />
                                        )}

                                        {/* Stock badge */}
                                        {showStock && stock.managed && (
                                            <StockBadge status={stock.status} quantity={stock.quantity} />
                                        )}

                                        {/* Currency missing badge */}
                                        {missingPrice && (
                                            <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5
                                                             rounded-full bg-amber-500/90 text-white backdrop-blur-sm font-bold z-10
                                                             flex items-center gap-1">
                                                <DollarSign className="w-2.5 h-2.5" />
                                                {defaultCurrency.toUpperCase()}
                                            </span>
                                        )}

                                        {/* Variant count badge */}
                                        {!missingPrice && (product.variants?.length ?? 0) > 1 && (
                                            <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5
                                                             rounded-full bg-black/60 text-white backdrop-blur-sm font-bold z-10">
                                                {product.variants.length} var
                                            </span>
                                        )}

                                        {/* Add feedback flash */}
                                        <AnimatePresence>
                                            {isTapped && (
                                                <motion.div
                                                    className="absolute inset-0 bg-brand/15 flex items-center justify-center"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        exit={{ scale: 0 }}
                                                        transition={{ type: 'spring', damping: 12, stiffness: 300 }}
                                                    >
                                                        <CheckCircle2 className="w-9 h-9 text-brand drop-shadow-md" />
                                                    </motion.div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Product info */}
                                    <div className={`p-3 flex-1 flex flex-col justify-between gap-1 ${density === 'compact' ? 'p-2' : ''}`}>
                                        <p className={`font-semibold line-clamp-2 leading-snug ${density === 'compact' ? 'text-[11px]' : 'text-xs'} ${missingPrice ? 'text-tx-muted' : 'text-tx'}`}>
                                            {product.title}
                                        </p>
                                        {missingPrice ? (
                                            <div className="flex items-center gap-1">
                                                <span className={`font-bold text-amber-600 tabular-nums ${density === 'compact' ? 'text-[10px]' : 'text-[11px]'}`}>
                                                    💱 {posLabel('panel.pos.setPrice', labels) || 'Set price'}
                                                </span>
                                            </div>
                                        ) : (
                                            <p className={`font-black text-brand-dark tabular-nums ${density === 'compact' ? 'text-xs' : 'text-sm'}`}>
                                                {formatProductPrice(product)}
                                            </p>
                                        )}
                                    </div>
                                </motion.button>
                            )
                        })}
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

            {/* ── Quick Price Modal (multi-currency) ── */}
            {quickPriceProduct && (
                <POSQuickPriceModal
                    product={quickPriceProduct.product}
                    targetCurrency={defaultCurrency}
                    availablePrices={quickPriceProduct.availablePrices}
                    onClose={() => setQuickPriceProduct(null)}
                    onPriceSet={handleQuickPriceSet}
                    labels={labels}
                />
            )}
        </div>
    )
}
