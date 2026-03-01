'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, X, ShoppingBag } from 'lucide-react'
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
 * Shows image, title, price, description, add-to-cart, and "View full details" link.
 * Lazy-loaded via dynamic import to avoid bundle penalty.
 */
export default function ProductQuickView({ product, isOpen, onClose }: ProductQuickViewProps) {
    const { t, locale } = useI18n()
    const { cartId, setCart, openDrawer } = useCart()
    const [isAdding, setIsAdding] = useState(false)
    const [added, setAdded] = useState(false)
    const modalRef = useRef<HTMLDivElement>(null)

    const defaultVariant = product.variants?.[0]
    const price = defaultVariant?.prices?.[0]
    const currency = price?.currency_code || 'USD'

    const formatPrice = (amount: number) =>
        new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 0,
        }).format(amount / 100)

    const handleAddToCart = async () => {
        if (!defaultVariant?.id || isAdding || !cartId) return
        setIsAdding(true)
        try {
            const result = await addToCartAction(cartId, defaultVariant.id)
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

    if (!isOpen) return null

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
                    {/* Image */}
                    <div className="quick-view-image">
                        {product.thumbnail ? (
                            <Image
                                src={product.thumbnail}
                                alt={product.title}
                                fill
                                className="object-cover rounded-xl"
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
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

                    {/* Info */}
                    <div className="quick-view-info">
                        <h3 className="text-xl font-bold font-display text-text-primary mb-2">
                            {product.title}
                        </h3>

                        {price && (
                            <p className="text-2xl font-bold text-primary mb-4">
                                {formatPrice(price.amount)}
                            </p>
                        )}

                        {product.description && (
                            <p className="text-sm text-text-secondary mb-6 line-clamp-3">
                                {product.description}
                            </p>
                        )}

                        {/* Variant count hint */}
                        {(product.variants?.length ?? 0) > 1 && (
                            <p className="text-xs text-text-muted mb-4">
                                {product.variants!.length} {t('product.variantsAvailable')}
                            </p>
                        )}

                        {/* Actions */}
                        <div className="space-y-3">
                            <button
                                onClick={handleAddToCart}
                                disabled={isAdding || !defaultVariant?.id}
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
                                href={`/${locale}/productos/${product.handle}`}
                                onClick={onClose}
                                className="btn btn-secondary w-full text-center"
                            >
                                {t('product.viewDetails')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
