'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Package, ShoppingBag, Trash2, ExternalLink } from 'lucide-react'
import { useWishlist } from '@/contexts/WishlistContext'
import { useI18n } from '@/lib/i18n/provider'
import { getRuntimeEnv } from '@/lib/runtime-env'

// ---------------------------------------------------------------------------
// Lightweight product type for display (fetched client-side from Medusa)
// ---------------------------------------------------------------------------
interface WishlistProduct {
    id: string
    title: string
    handle: string
    thumbnail: string | null
    variants: {
        calculated_price?: {
            calculated_amount: number
            currency_code: string
        }
        prices: { amount: number; currency_code: string }[]
    }[]
}

// ---------------------------------------------------------------------------
// Price display helper
// ---------------------------------------------------------------------------
function displayPrice(product: WishlistProduct): string {
    const variant = product.variants?.[0]
    if (variant?.calculated_price) {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: variant.calculated_price.currency_code,
        }).format(variant.calculated_price.calculated_amount / 100)
    }
    if (variant?.prices?.[0]) {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: variant.prices[0].currency_code,
        }).format(variant.prices[0].amount / 100)
    }
    return ''
}

// ---------------------------------------------------------------------------
// Client Component
// ---------------------------------------------------------------------------
export default function FavoritosClient() {
    const { items, removeItem, isLoading: wishlistLoading } = useWishlist()
    const { t, localizedHref } = useI18n()
    const [products, setProducts] = useState<WishlistProduct[]>([])
    const [loading, setLoading] = useState(true)

    // Fetch product details for all wishlisted IDs
    useEffect(() => {
        if (wishlistLoading) return

        if (items.length === 0) {
            // Defer to avoid synchronous setState in effect body
            const t = setTimeout(() => { setProducts([]); setLoading(false) }, 0)
            return () => clearTimeout(t)
        }

        // Fetch each product by ID from Medusa Store API
        const MEDUSA_URL = getRuntimeEnv('MEDUSA_BACKEND_URL')
        const API_KEY = getRuntimeEnv('MEDUSA_PUBLISHABLE_KEY')

        // Batch fetch — Medusa v2 supports id[] filter
        const params = new URLSearchParams()
        items.forEach(id => params.append('id[]', id))
        params.set('fields', '+variants.prices')
        params.set('limit', String(items.length))

        // Use a microtask to avoid synchronous setState in effect body
        const controller = new AbortController()
        fetch(`${MEDUSA_URL}/store/products?${params.toString()}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(API_KEY ? { 'x-publishable-api-key': API_KEY } : {}),
            },
            signal: controller.signal,
        })
            .then(res => res.json())
            .then(data => {
                setProducts(data.products || [])
            })
            .catch(err => {
                if (!controller.signal.aborted) {
                    console.error('[wishlist] Failed to fetch products:', err)
                    setProducts([])
                }
            })
            .finally(() => setLoading(false))
        return () => controller.abort()
    }, [items, wishlistLoading])

    // ── Loading skeleton ──────────────────────────────────────
    if (loading || wishlistLoading) {
        return (
            <div className="space-y-6">
                <div className="glass rounded-xl p-6">
                    <div className="h-7 w-40 bg-text-muted/10 rounded mb-2 animate-pulse" />
                    <div className="h-4 w-64 bg-text-muted/10 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass rounded-xl overflow-hidden animate-pulse">
                            <div className="aspect-square bg-text-muted/10" />
                            <div className="p-4 space-y-2">
                                <div className="h-4 w-3/4 bg-text-muted/10 rounded" />
                                <div className="h-5 w-1/3 bg-text-muted/10 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // ── Empty state ───────────────────────────────────────────
    if (items.length === 0) {
        return (
            <div className="space-y-6">
                <div className="glass rounded-xl p-6">
                    <h1 className="text-2xl font-bold font-display text-text-primary">
                        {t('account.wishlist') || 'Favoritos'}
                    </h1>
                </div>
                <div className="glass rounded-xl p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                        <Heart className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-text-primary mb-2">
                        {t('wishlist.emptyTitle') || 'Tu lista de favoritos está vacía'}
                    </h2>
                    <p className="text-text-muted text-sm mb-6 max-w-sm mx-auto">
                        {t('wishlist.emptyDescription') || 'Explora nuestro catálogo y guarda los productos que más te gusten.'}
                    </p>
                    <Link
                        href={localizedHref('products')}
                        className="btn btn-primary inline-flex items-center gap-2"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        {t('wishlist.browseProducts') || 'Explorar productos'}
                    </Link>
                </div>
            </div>
        )
    }

    // ── Products grid ─────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="glass rounded-xl p-6">
                <h1 className="text-2xl font-bold font-display text-text-primary">
                    {t('account.wishlist') || 'Favoritos'}
                </h1>
                <p className="text-text-muted text-sm mt-1">
                    {items.length} {items.length === 1
                        ? (t('wishlist.itemSingular') || 'producto guardado')
                        : (t('wishlist.itemPlural') || 'productos guardados')}
                </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(product => (
                    <div
                        key={product.id}
                        className="glass rounded-xl overflow-hidden group hover:shadow-lg transition-shadow"
                    >
                        {/* Image + Remove button */}
                        <div className="relative aspect-square bg-surface-1">
                            {product.thumbnail ? (
                                <Image
                                    src={product.thumbnail}
                                    alt={product.title}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-12 h-12 text-text-muted/30" />
                                </div>
                            )}
                            <button
                                onClick={() => removeItem(product.id)}
                                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-surface-0/90 dark:bg-surface-2/90 backdrop-blur-sm flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-sm hover:shadow-md"
                                aria-label={t('wishlist.remove') || 'Quitar de favoritos'}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Info */}
                        <div className="p-4">
                            <h3 className="font-semibold text-text-primary text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                                {product.title}
                            </h3>
                            {displayPrice(product) && (
                                <p className="text-lg font-bold text-primary">
                                    {displayPrice(product)}
                                </p>
                            )}
                            <Link
                                href={`${localizedHref('products')}/${product.handle}`}
                                className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                {t('wishlist.viewProduct') || 'Ver producto'}
                            </Link>
                        </div>
                    </div>
                ))}

                {/* Show placeholders for products that failed to load */}
                {items.filter(id => !products.find(p => p.id === id)).map(missingId => (
                    <div
                        key={missingId}
                        className="glass rounded-xl overflow-hidden opacity-60"
                    >
                        <div className="aspect-square bg-surface-1 flex items-center justify-center">
                            <Package className="w-12 h-12 text-text-muted/20" />
                        </div>
                        <div className="p-4 flex items-center justify-between">
                            <p className="text-xs text-text-muted">
                                {t('wishlist.productUnavailable') || 'Producto no disponible'}
                            </p>
                            <button
                                onClick={() => removeItem(missingId)}
                                className="text-xs text-red-500 hover:underline"
                            >
                                {t('wishlist.remove') || 'Quitar'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
