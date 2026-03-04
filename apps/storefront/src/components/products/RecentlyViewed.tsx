'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n/provider'
import { Clock } from 'lucide-react'

const STORAGE_KEY = 'recently-viewed'
const MAX_ITEMS = 10

interface RecentProduct {
    handle: string
    title: string
    thumbnail: string | null
    price?: string
}

/**
 * Track a product view in localStorage.
 * Call from PDP (ProductDetailClient or page.tsx).
 */
export function trackProductView(product: RecentProduct) {
    if (typeof window === 'undefined') return
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as RecentProduct[]
        // Remove duplicate + add to front
        const filtered = stored.filter((p) => p.handle !== product.handle)
        filtered.unshift(product)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)))
    } catch {
        // localStorage unavailable (SSR, private browsing, etc.)
    }
}

/**
 * Get recently viewed products from localStorage.
 */
export function getRecentlyViewed(): RecentProduct[] {
    if (typeof window === 'undefined') return []
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as RecentProduct[]
    } catch {
        return []
    }
}

/**
 * RecentlyViewed — horizontal scrollable section showing last viewed products.
 * Placed below related products on PDP or optionally on homepage.
 */
export default function RecentlyViewed({
    currentHandle,
}: {
    /** Exclude the current product from the list */
    currentHandle?: string
}) {
    const { t, locale } = useI18n()
    const [items, setItems] = useState<RecentProduct[]>([])

    useEffect(() => {
        const all = getRecentlyViewed()
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(currentHandle ? all.filter((p) => p.handle !== currentHandle) : all)
    }, [currentHandle])

    if (items.length === 0) return null

    return (
        <section className="mt-12">
            <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-text-muted" />
                <h3 className="text-lg font-bold font-display text-text-primary">
                    {t('product.recentlyViewed')}
                </h3>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                {items.map((product) => (
                    <Link
                        key={product.handle}
                        href={`/${locale}/productos/${product.handle}`}
                        className="flex-none w-40 group"
                    >
                        <div className="aspect-square relative rounded-xl overflow-hidden bg-surface-1 mb-2">
                            {product.thumbnail ? (
                                <Image
                                    src={product.thumbnail}
                                    alt={product.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    sizes="160px"
                                />
                            ) : (
                                <div className="image-fallback">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <path d="M21 15l-5-5L5 21" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <p className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-primary transition-colors">
                            {product.title}
                        </p>
                        {product.price && (
                            <p className="text-sm text-text-muted mt-0.5">{product.price}</p>
                        )}
                    </Link>
                ))}
            </div>
        </section>
    )
}
