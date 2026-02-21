'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Package } from 'lucide-react'
import type { MedusaProduct } from '@/lib/medusa/client'
import { getPrice, formatPrice } from '@/lib/medusa/price'
import { useI18n } from '@/lib/i18n/provider'
import CompareButton from './CompareButton'

interface ProductCardProps {
    product: MedusaProduct
    badgesEnabled?: boolean
    compareEnabled?: boolean
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

export default function ProductCard({ product, badgesEnabled = true, compareEnabled = false }: ProductCardProps) {
    const variant = product.variants?.[0]
    const resolved = getPrice(variant)
    const category = product.categories?.[0]
    const badges: string[] = badgesEnabled ? ((product.metadata?.badges as string[]) || []) : []
    const { t, localizedHref } = useI18n()

    return (
        <Link href={`${localizedHref('products')}/${product.handle}`} data-testid="product-card" className="product-card group block">
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
        </Link>
    )
}
