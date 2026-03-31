'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, ShoppingBag, ChevronLeft, ChevronRight, Expand } from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import { useI18n } from '@/lib/i18n/provider'
import { useCart } from '@/contexts/CartContext'
import { addToCartAction } from '@/app/[lang]/(shop)/cart/actions'
import type { MedusaProduct } from '@/lib/medusa/client'

interface ProductQuickViewProps {
    product: MedusaProduct
    isOpen: boolean
    onClose: () => void
}

/**
 * ProductQuickView — modal preview of a product
 *
 * Triggered from ProductCard (eye icon overlay).
 * Features: mini-gallery with lightbox, variant selector, add-to-cart, "View full details" link.
 * Lazy-loaded via dynamic import to avoid bundle penalty.
 */
export default function ProductQuickView({ product, isOpen, onClose }: ProductQuickViewProps) {
    const { t, locale, localizedHref } = useI18n()
    const { cartId, setCart, openDrawer } = useCart()
    const [isAdding, setIsAdding] = useState(false)
    const [added, setAdded] = useState(false)
    const [selectedImageIdx, setSelectedImageIdx] = useState(0)
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
    const modalRef = useRef<HTMLDivElement>(null)

    // Build images array
    const images = [
        ...(product.thumbnail ? [{ url: product.thumbnail }] : []),
        ...(product.images?.filter((img) => img.url !== product.thumbnail) || []),
    ]

    const activeVariant = selectedVariantId
        ? product.variants?.find((v) => v.id === selectedVariantId)
        : product.variants?.[0]
    const price = activeVariant?.prices?.[0]
    const currency = price?.currency_code || 'USD'

    const formatPrice = (amount: number) =>
        new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 0,
        }).format(amount / 100)

    const handleAddToCart = async () => {
        if (!activeVariant?.id || isAdding || !cartId) return
        setIsAdding(true)
        try {
            const result = await addToCartAction(cartId, activeVariant.id)
            if (result?.cart) {
                setCart(result.cart)
                setAdded(true)
                setTimeout(() => {
                    setAdded(false)
                    onClose()
                    openDrawer()
                }, 800)
            }
        } catch {
            // Error handled by toast
        } finally {
            setIsAdding(false)
        }
    }

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', handler)
            document.body.style.overflow = ''
        }
    }, [isOpen, onClose])

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setSelectedImageIdx(0)
            setSelectedVariantId(null)
            setAdded(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    // Deduplicate variant option values for a simple variant selector
    const hasMultipleVariants = (product.variants?.length ?? 0) > 1

    return (
        <div
            className="quick-view-overlay"
            onClick={onClose}
        >
            <div
                ref={modalRef}
                className="quick-view-modal animate-slide-up"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={product.title}
            >
                <button
                    onClick={onClose}
                    className="quick-view-close"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="quick-view-content">
                    {/* Mini-Gallery */}
                    <div className="quick-view-image">
                        <div className="relative w-full h-full">
                            {images.length > 0 ? (
                                <>
                                    <Image
                                        src={images[selectedImageIdx]?.url || ''}
                                        alt={product.title}
                                        fill
                                        className="object-cover rounded-xl"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                    />
                                    {/* Expand button for lightbox */}
                                    <button
                                        onClick={() => setLightboxOpen(true)}
                                        className="absolute top-3 right-3 p-2 rounded-lg bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
                                        aria-label="Expand image"
                                    >
                                        <Expand className="w-4 h-4" />
                                    </button>
                                    {/* Navigation arrows */}
                                    {images.length > 1 && (
                                        <>
                                            <button
                                                onClick={() => setSelectedImageIdx((i) => (i - 1 + images.length) % images.length)}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
                                                aria-label="Previous image"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setSelectedImageIdx((i) => (i + 1) % images.length)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
                                                aria-label="Next image"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="image-fallback rounded-xl">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <path d="M21 15l-5-5L5 21" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Thumbnail strip */}
                        {images.length > 1 && (
                            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                                {images.map((img, idx) => (
                                    <button
                                        key={img.url}
                                        onClick={() => setSelectedImageIdx(idx)}
                                        className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                                            idx === selectedImageIdx
                                                ? 'border-brand ring-1 ring-brand/30'
                                                : 'border-transparent hover:border-sf-3'
                                        }`}
                                    >
                                        <Image
                                            src={img.url}
                                            alt={`${product.title} ${idx + 1}`}
                                            fill
                                            sizes="56px"
                                            className="object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="quick-view-info">
                        <h3 className="text-xl font-bold font-display text-tx mb-2">
                            {product.title}
                        </h3>

                        {price && (
                            <p className="text-2xl font-bold text-brand mb-4">
                                {formatPrice(price.amount)}
                            </p>
                        )}

                        {product.description && (
                            <p className="text-sm text-tx-sec mb-4 line-clamp-3">
                                {product.description}
                            </p>
                        )}

                        {/* Variant selector */}
                        {hasMultipleVariants && (
                            <div className="mb-4">
                                <label className="text-xs text-tx-muted font-medium mb-1.5 block">
                                    {t('product.selectVariant')}
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {product.variants?.map((variant) => {
                                        const isSelected = variant.id === (selectedVariantId || product.variants?.[0]?.id)
                                        const label = variant.title || variant.options?.map((o) => o.value).join(' / ') || variant.id
                                        return (
                                            <button
                                                key={variant.id}
                                                onClick={() => setSelectedVariantId(variant.id)}
                                                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                                                    isSelected
                                                        ? 'bg-brand text-white border-brand'
                                                        : 'border-sf-3 text-tx-sec hover:border-brand'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3">
                            <button
                                onClick={handleAddToCart}
                                disabled={isAdding || !activeVariant?.id}
                                className="btn btn-primary w-full"
                            >
                                <ShoppingBag className="w-4 h-4" />
                                {added
                                    ? t('product.added')
                                    : isAdding
                                        ? t('product.adding')
                                        : t('product.addToCart')
                                }
                            </button>

                            <Link
                                href={`${localizedHref('products')}/${product.handle}`}
                                onClick={onClose}
                                className="btn btn-secondary w-full text-center"
                            >
                                {t('product.viewDetails')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                index={selectedImageIdx}
                slides={images.map((img) => ({ src: img.url }))}
                plugins={[Zoom]}
                on={{ view: ({ index }) => setSelectedImageIdx(index) }}
            />
        </div>
    )
}
