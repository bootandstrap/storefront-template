'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Package, Check, Share2, Link as LinkIcon } from 'lucide-react'
import type { MedusaProduct, MedusaVariant } from '@/lib/medusa/client'
import { getPrice, formatPrice } from '@/lib/medusa/price'
import { useI18n } from '@/lib/i18n/provider'
import { useSwipe } from '@/hooks/useSwipe'
import { useShare } from '@/hooks/useShare'
import AddToCartButton from './AddToCartButton'
import WishlistButton from './WishlistButton'
import ImageZoom from './ImageZoom'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductDetailClientProps {
    product: MedusaProduct
    wishlistEnabled: boolean
    lowStockThreshold?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProductDetailClient({
    product,
    wishlistEnabled,
    lowStockThreshold = 5,
}: ProductDetailClientProps) {
    const { t, locale } = useI18n()
    const { share, copied } = useShare()
    const variants = product.variants || []
    const images = product.images || []
    const allImages = product.thumbnail
        ? [{ id: 'thumb', url: product.thumbnail }, ...images.filter(img => img.url !== product.thumbnail)]
        : images

    // ── State ──────────────────────────────────────────────────────────────
    const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id || '')
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const [showStickyCta, setShowStickyCta] = useState(false)
    const ctaRef = useRef<HTMLDivElement>(null)

    // ── Swipe gestures for image gallery ────────────────────────────────
    const handleSwipeLeft = useCallback(() => {
        setSelectedImageIndex(prev => prev < allImages.length - 1 ? prev + 1 : 0)
    }, [allImages.length])

    const handleSwipeRight = useCallback(() => {
        setSelectedImageIndex(prev => prev > 0 ? prev - 1 : allImages.length - 1)
    }, [allImages.length])

    const swipeHandlers = useSwipe({
        onSwipeLeft: handleSwipeLeft,
        onSwipeRight: handleSwipeRight,
        threshold: 50,
    })

    // Sticky CTA: observe when main CTA scrolls out of view
    useEffect(() => {
        const el = ctaRef.current
        if (!el) return
        const observer = new IntersectionObserver(
            ([entry]) => setShowStickyCta(!entry.isIntersecting),
            { threshold: 0 }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [selectedVariantId])

    const selectedVariant = useMemo(
        () => variants.find(v => v.id === selectedVariantId) || variants[0],
        [variants, selectedVariantId]
    )

    const resolved = getPrice(selectedVariant)
    const hasMultipleVariants = variants.length > 1

    // Group options by option type (e.g., "Size", "Weight", "Color")
    const optionGroups = useMemo(() => {
        if (!hasMultipleVariants) return []

        // Each variant has options array: [{value: "S"}, {value: "Red"}]
        // Medusa v2 variants have options but not always named groups
        // We derive option labels from the variant title structure
        const groups: { label: string; values: { value: string; variantId: string; available: boolean }[] }[] = []

        // If variants have option values, group them by position
        const maxOptions = Math.max(...variants.map(v => (v.options || []).length), 0)

        for (let i = 0; i < maxOptions; i++) {
            const uniqueValues = new Map<string, { variantId: string; available: boolean }>()
            for (const v of variants) {
                const optVal = v.options?.[i]?.value
                if (optVal && !uniqueValues.has(optVal)) {
                    uniqueValues.set(optVal, {
                        variantId: v.id,
                        available: (v.inventory_quantity ?? 1) > 0,
                    })
                }
            }
            if (uniqueValues.size > 0) {
                groups.push({
                    label: `${t('product.option') || 'Option'} ${i + 1}`,
                    values: Array.from(uniqueValues.entries()).map(([value, meta]) => ({
                        value,
                        ...meta,
                    })),
                })
            }
        }

        return groups
    }, [variants, hasMultipleVariants, t])

    // Stock status
    const inStock = (selectedVariant?.inventory_quantity ?? 1) > 0
    const lowStock = (selectedVariant?.inventory_quantity ?? 100) > 0 &&
        (selectedVariant?.inventory_quantity ?? 100) <= lowStockThreshold

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* ── Image Gallery ─────────────────────────────────────────── */}
            <div className="space-y-3">
                {/* Main image */}
                <div
                    className="relative aspect-square rounded-2xl overflow-hidden bg-sf-1 touch-pan-y"
                    {...swipeHandlers}
                >
                    {allImages[selectedImageIndex]?.url ? (
                        <ImageZoom
                            src={allImages[selectedImageIndex].url}
                            alt={product.title}
                            width={800}
                            height={800}
                            className="w-full h-full"
                            images={allImages.map(img => ({ url: img.url, alt: product.title }))}
                            imageIndex={selectedImageIndex}
                        />
                    ) : (
                        <div className="image-fallback">
                            <Package className="!w-16 !h-16" strokeWidth={1} />
                        </div>
                    )}

                    {/* Wishlist + Share buttons */}
                    <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                        {wishlistEnabled && (
                            <WishlistButton productId={product.id} />
                        )}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                share({
                                    title: product.title,
                                    text: product.description || product.title,
                                })
                            }}
                            className="w-9 h-9 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-white dark:hover:bg-black/70 transition-all hover:scale-110 shadow-sm"
                            aria-label="Share product"
                        >
                            {copied
                                ? <LinkIcon className="w-4 h-4 text-green-500" />
                                : <Share2 className="w-4 h-4 text-tx" />
                            }
                        </button>
                    </div>

                    {/* Image counter (mobile) */}
                    {allImages.length > 1 && (
                        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full md:hidden">
                            {selectedImageIndex + 1} / {allImages.length}
                        </div>
                    )}
                </div>

                {/* Thumbnail strip — clickable */}
                {allImages.length > 1 && (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {allImages.slice(0, 5).map((img, idx) => (
                            <button
                                key={img.id}
                                type="button"
                                onClick={() => setSelectedImageIndex(idx)}
                                className={`relative aspect-square rounded-xl overflow-hidden bg-sf-1 transition-all ${selectedImageIndex === idx
                                    ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface-0'
                                    : 'hover:ring-2 hover:ring-med opacity-70 hover:opacity-100'
                                    }`}
                            >
                                <Image
                                    src={img.url}
                                    alt={`${product.title} ${idx + 1}`}
                                    fill
                                    sizes="(max-width: 768px) 20vw, 10vw"
                                    className="object-cover"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Product Info ──────────────────────────────────────────── */}
            <div className="flex flex-col">
                {/* Category badge */}
                {product.categories?.[0] && (
                    <span className="text-xs font-medium text-brand bg-brand-subtle px-3 py-1 rounded-full w-fit mb-3">
                        {product.categories[0].name}
                    </span>
                )}

                <h1 className="text-2xl md:text-3xl font-bold font-display text-tx mb-2">
                    {product.title}
                </h1>

                {product.subtitle && (
                    <p className="text-tx-muted mb-4">{product.subtitle}</p>
                )}

                {/* Price */}
                {resolved && (
                    <p className="text-3xl font-bold text-brand mb-4">
                        {formatPrice(resolved.amount, resolved.currency, locale)}
                    </p>
                )}

                {/* Stock indicator */}
                <div className="mb-4">
                    {inStock ? (
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${lowStock ? 'bg-amber-500' : 'bg-green-500'}`} />
                            <span className={`text-sm font-medium ${lowStock ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                                {lowStock
                                    ? (t('product.lowStock') || 'Only a few left')
                                    : (t('product.inStock') || 'In stock')}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                {t('product.outOfStock') || 'Out of stock'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Variant selector */}
                {hasMultipleVariants && (
                    <div className="space-y-4 mb-6">
                        {optionGroups.length > 0 ? (
                            // Option-based selector (buttons)
                            optionGroups.map((group, gIdx) => (
                                <div key={gIdx}>
                                    <label className="text-sm font-medium text-tx-sec block mb-2">
                                        {group.label}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {group.values.map((opt) => {
                                            const isSelected = selectedVariantId === opt.variantId
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    disabled={!opt.available}
                                                    onClick={() => setSelectedVariantId(opt.variantId)}
                                                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                                                        ${isSelected
                                                            ? 'border-brand bg-brand-subtle text-brand ring-1 ring-brand'
                                                            : opt.available
                                                                ? 'border-sf-3 text-tx-sec hover:border-brand hover:text-brand'
                                                                : 'border-sf-3 text-tx-faint line-through cursor-not-allowed'
                                                        }`}
                                                >
                                                    {isSelected && <Check className="w-3.5 h-3.5 inline mr-1.5" />}
                                                    {opt.value}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Fallback: dropdown selector by variant title
                            <div>
                                <label className="text-sm font-medium text-tx-sec block mb-2">
                                    {t('product.selectVariant') || 'Select option'}
                                </label>
                                <select
                                    value={selectedVariantId}
                                    onChange={(e) => setSelectedVariantId(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-sf-3 bg-sf-0 text-sm focus:outline-none focus:ring-2 focus:ring-soft focus:border-brand transition-all"
                                >
                                    {variants.map((v) => {
                                        const vPrice = getPrice(v)
                                        return (
                                            <option key={v.id} value={v.id}>
                                                {v.title}
                                                {vPrice ? ` — ${formatPrice(vPrice.amount, vPrice.currency, locale)}` : ''}
                                            </option>
                                        )
                                    })}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* Description */}
                {product.description && (
                    <div className="prose prose-sm text-tx-sec mb-6 max-w-none">
                        <p>{product.description}</p>
                    </div>
                )}

                {/* Add to cart */}
                {selectedVariant && inStock && (
                    <div ref={ctaRef}>
                        <AddToCartButton
                            variantId={selectedVariant.id}
                            productTitle={product.title}
                            className="mb-6"
                        />
                    </div>
                )}

                {/* Out of stock message */}
                {!inStock && (
                    <div className="mb-6 py-3 px-4 rounded-xl bg-sf-1 text-sm text-tx-muted text-center">
                        {t('product.outOfStockMessage') || 'This product is currently unavailable'}
                    </div>
                )}
            </div>

            {/* Sticky CTA for mobile — appears when main CTA scrolls out of view */}
            {selectedVariant && inStock && showStickyCta && (
                <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-glass-heavy backdrop-blur-sm border-t border-sf-3 safe-area-bottom animate-slide-up">
                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="min-w-0">
                            <p className="text-xs text-tx-muted truncate">{product.title}</p>
                            {resolved && (
                                <p className="text-lg font-bold text-brand">
                                    {formatPrice(resolved.amount, resolved.currency, locale)}
                                </p>
                            )}
                        </div>
                        <AddToCartButton
                            variantId={selectedVariant.id}
                            productTitle={product.title}
                            className="shrink-0"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
