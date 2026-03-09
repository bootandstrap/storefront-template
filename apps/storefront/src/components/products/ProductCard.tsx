'use client'

import Image from 'next/image'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Package, ShoppingCart, Loader2, Check, Eye } from 'lucide-react'
import { useState, useTransition, useCallback, lazy, Suspense } from 'react'
import type { MedusaProduct } from '@/lib/medusa/client'
import { getPrice, formatPrice } from '@/lib/medusa/price'
import { useI18n } from '@/lib/i18n/provider'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/components/ui/Toaster'
import { addToCartAction } from '@/app/[lang]/(shop)/cart/actions'
import { trackEvent } from '@/lib/analytics'
import CompareButton from './CompareButton'

// Lazily load QuickView modal to keep initial bundle lean
const ProductQuickView = lazy(() => import('./ProductQuickView'))

interface ProductCardProps {
    product: MedusaProduct
    badgesEnabled?: boolean
    compareEnabled?: boolean
    quickAddEnabled?: boolean
    quickViewEnabled?: boolean
}

// Badge type → CSS class mapping
const BADGE_CLASSES: Record<string, string> = {
    nuevo: 'product-badge product-badge-new',
    new: 'product-badge product-badge-new',
    oferta: 'product-badge product-badge-offer',
    sale: 'product-badge product-badge-offer',
    agotado: 'product-badge product-badge-soldout',
    'sold out': 'product-badge product-badge-soldout',
}

export default function ProductCard({ product, badgesEnabled = true, compareEnabled = false, quickAddEnabled = false, quickViewEnabled = true }: ProductCardProps) {
    const variant = product.variants?.[0]
    const resolved = getPrice(variant)
    const category = product.categories?.[0]
    const badges: string[] = badgesEnabled ? ((product.metadata?.badges as string[]) || []) : []
    const { t, localizedHref } = useI18n()
    const { cartId, setCart, setCartId, openDrawer } = useCart()
    const { success, error } = useToast()
    const [isPending, startTransition] = useTransition()
    const [justAdded, setJustAdded] = useState(false)
    const [quickViewOpen, setQuickViewOpen] = useState(false)
    const router = useRouter()
    const productHref = `${localizedHref('products')}/${product.handle}`

    const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Don't navigate if the click was on an interactive child (button, link, input)
        const target = e.target as HTMLElement
        if (target.closest('button, a, input, [role="button"]')) return
        router.push(productHref)
    }, [router, productHref])

    const canQuickAdd = quickAddEnabled && variant && (variant.inventory_quantity ?? 1) > 0

    function handleQuickAdd(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        if (!variant || isPending) return

        startTransition(async () => {
            try {
                const result = await addToCartAction(cartId, variant.id)
                if (result.cart) {
                    setCart(result.cart)
                    if (result.cartId) setCartId(result.cartId)
                    setJustAdded(true)
                    setTimeout(() => setJustAdded(false), 2000)
                    success(`${product.title} ${t('product.addedToCart')}`, {
                        action: {
                            label: t('cart.view') || 'Ver carrito',
                            onClick: openDrawer,
                        },
                    })
                    trackEvent('add_to_cart', { variant_id: variant.id, product_title: product.title, source: 'quick_add' })
                } else {
                    error(t('product.addToCartError'))
                }
            } catch {
                error(t('product.addToCartError'))
            }
        })
    }

    return (
        <>
            <div onClick={handleCardClick} data-testid="product-card" className="product-card group block cursor-pointer" role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') router.push(productHref) }}>
                {/* Image */}
                <div className="product-card-image relative aspect-square">
                    {product.thumbnail ? (
                        <Image
                            src={product.thumbnail}
                            alt={product.title}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover"
                        />
                    ) : (
                        <div className="image-fallback">
                            <Package strokeWidth={1.5} />
                        </div>
                    )}

                    {/* Product badges from metadata (Owner Panel managed) — gated by enable_product_badges */}
                    {badges.length > 0 && (
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                            {badges.map((badge) => (
                                <span
                                    key={badge}
                                    className={BADGE_CLASSES[badge.toLowerCase()] || 'product-badge product-badge-new'}
                                >
                                    {badge}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Category label */}
                    {category && (
                        <span className="absolute bottom-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-sm text-text-secondary">
                            {category.name}
                        </span>
                    )}

                    {/* Compare button */}
                    {compareEnabled && (
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <CompareButton productId={product.id} />
                        </div>
                    )}

                    {/* QuickView button overlay */}
                    {quickViewEnabled && (
                        <button
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setQuickViewOpen(true)
                            }}
                            className="absolute top-3 opacity-0 group-hover:opacity-100 transition-opacity
                            w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm
                            flex items-center justify-center hover:bg-white hover:scale-110
                            transition-all duration-200"
                            style={{ right: compareEnabled ? '2.75rem' : '0.75rem' }}
                            aria-label={t('product.quickView')}
                        >
                            <Eye className="w-4 h-4 text-text-primary" />
                        </button>
                    )}

                    {/* Quick-Add button overlay */}
                    {canQuickAdd && (
                        <button
                            onClick={handleQuickAdd}
                            disabled={isPending}
                            className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-primary text-white shadow-lg flex items-center justify-center
                            opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100
                            translate-y-2 group-hover:translate-y-0
                            transition-all duration-200 ease-out
                            hover:bg-primary-light hover:scale-110 active:scale-95
                            disabled:opacity-50 disabled:cursor-not-allowed
                            touch-target"
                            aria-label={t('product.addToCart')}
                        >
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : justAdded ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <ShoppingCart className="w-4 h-4" />
                            )}
                        </button>
                    )}
                </div>

                {/* Info */}
                <div className="p-4">
                    <h3 className="text-sm font-semibold text-text-primary line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                        {product.title}
                    </h3>
                    {resolved && (
                        <p className="text-lg font-bold text-primary">
                            {formatPrice(resolved.amount, resolved.currency)}
                        </p>
                    )}
                    {product.variants && product.variants.length > 1 && (
                        <p className="text-xs text-text-muted mt-0.5">
                            {t('product.options', { count: String(product.variants.length) })}
                        </p>
                    )}
                </div>
            </div>

            {/* QuickView Modal — portaled to body to escape overflow:hidden */}
            {quickViewOpen && typeof document !== 'undefined' && createPortal(
                <Suspense fallback={null}>
                    <ProductQuickView
                        product={product}
                        isOpen={quickViewOpen}
                        onClose={() => setQuickViewOpen(false)}
                    />
                </Suspense>,
                document.body
            )}
        </>
    )
}
