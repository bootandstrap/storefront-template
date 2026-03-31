'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, X, SlidersHorizontal, ChevronLeft, ChevronRight, LayoutGrid, List, Package, Check } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { MedusaProduct, MedusaCategory } from '@/lib/medusa/client'
import { useI18n } from '@/lib/i18n/provider'
import { getPrice, formatPrice } from '@/lib/medusa/price'
import ProductCard from './ProductCard'

interface ProductGridProps {
    products: MedusaProduct[]
    categories: MedusaCategory[]
    totalCount: number
    badgesEnabled?: boolean
    compareEnabled?: boolean
    quickAddEnabled?: boolean
    currentPage?: number
    totalPages?: number
}

export default function ProductGrid({
    products,
    categories,
    totalCount,
    badgesEnabled = true,
    compareEnabled = false,
    quickAddEnabled = false,
    currentPage = 1,
    totalPages = 1,
}: ProductGridProps) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const { t } = useI18n()

    const currentCategory = searchParams.get('category') || ''
    const currentSort = searchParams.get('sort') || ''
    const currentQuery = searchParams.get('q') || ''
    const currentView = searchParams.get('view') || 'grid'

    const [searchInput, setSearchInput] = useState(currentQuery)
    const [showFilters, setShowFilters] = useState(false)
    const [priceMin, setPriceMin] = useState('')
    const [priceMax, setPriceMax] = useState('')
    const [inStockOnly, setInStockOnly] = useState(false)

    // Client-side price + availability filtering
    const filteredProducts = useMemo(() => {
        let result = products

        // Price filter
        const min = priceMin ? parseFloat(priceMin) : 0
        const max = priceMax ? parseFloat(priceMax) : Infinity
        if (min > 0 || max < Infinity) {
            result = result.filter((p) => {
                const resolved = getPrice(p.variants?.[0])
                if (!resolved) return true
                const price = resolved.amount / 100
                return price >= min && price <= max
            })
        }

        // In-stock filter
        if (inStockOnly) {
            result = result.filter((p) => {
                const variant = p.variants?.[0] as unknown as Record<string, unknown> | undefined
                if (!variant) return false
                const qty = variant.inventory_quantity as number | undefined
                return qty === undefined || qty === null || qty > 0
            })
        }

        return result
    }, [products, priceMin, priceMax, inStockOnly])

    // Debounced search
    useEffect(() => {
        const timeout = setTimeout(() => {
            updateParams({ q: searchInput })
        }, 300)
        return () => clearTimeout(timeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput])

    const updateParams = useCallback(
        (updates: Record<string, string>) => {
            const params = new URLSearchParams(searchParams.toString())
            Object.entries(updates).forEach(([key, value]) => {
                if (value) {
                    params.set(key, value)
                } else {
                    params.delete(key)
                }
            })
            router.push(`${pathname}?${params.toString()}`, { scroll: false })
        },
        [searchParams, router, pathname]
    )

    const SORT_LABELS: Record<string, string> = {
        '-created_at': t('product.sortNewest'),
        'title': 'A-Z',
        '-title': 'Z-A',
    }

    const activeFilters = [
        currentCategory && { key: 'category', label: categories.find((c) => c.handle === currentCategory)?.name || currentCategory },
        currentSort && { key: 'sort', label: SORT_LABELS[currentSort] || currentSort },
        currentQuery && { key: 'q', label: `"${currentQuery}"` },
        priceMin && { key: 'priceMin', label: `${t('product.priceMin')} ${priceMin}` },
        priceMax && { key: 'priceMax', label: `${t('product.priceMax')} ${priceMax}` },
        inStockOnly && { key: 'inStock', label: t('product.inStock') },
    ].filter(Boolean) as { key: string; label: string }[]

    return (
        <div>
            {/* Search + filter bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted" />
                    <input
                        type="text"
                        placeholder={t('product.searchPlaceholder')}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sf-3 bg-sf-0 text-sm focus:outline-none focus:ring-2 focus:ring-soft focus:border-brand transition-all"
                    />
                    {searchInput && (
                        <button
                            onClick={() => setSearchInput('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                            <X className="w-4 h-4 text-tx-muted hover:text-tx" />
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    <select
                        value={currentSort}
                        onChange={(e) => updateParams({ sort: e.target.value })}
                        className="px-3 py-2.5 rounded-xl border border-sf-3 bg-sf-0 text-sm focus:outline-none focus:ring-2 focus:ring-soft"
                    >
                        <option value="">{t('product.sort')}</option>
                        <option value="-created_at">{t('product.sortNewest')}</option>
                        <option value="title">A-Z</option>
                        <option value="-title">Z-A</option>
                    </select>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn btn-ghost px-3 py-2.5 rounded-xl border border-sf-3 text-sm ${showFilters ? 'bg-brand-subtle border-brand' : ''}`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('product.filter')}</span>
                    </button>

                    {/* View toggle */}
                    <div className="hidden sm:flex border border-sf-3 rounded-xl overflow-hidden">
                        <button
                            onClick={() => updateParams({ view: 'grid' })}
                            className={`p-2.5 transition-colors ${currentView === 'grid' ? 'bg-brand text-white' : 'bg-sf-0 text-tx-muted hover:text-tx'}`}
                            aria-label="Grid view"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => updateParams({ view: 'list' })}
                            className={`p-2.5 transition-colors ${currentView === 'list' ? 'bg-brand text-white' : 'bg-sf-0 text-tx-muted hover:text-tx'}`}
                            aria-label="List view"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Category filters */}
            {showFilters && categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6 animate-slide-up">
                    <button
                        onClick={() => updateParams({ category: '' })}
                        className={`text-sm px-3 py-1.5 rounded-full border transition-all ${!currentCategory ? 'bg-brand text-white border-brand' : 'border-sf-3 hover:border-brand'}`}
                    >
                        {t('product.allCategories')}
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => updateParams({ category: cat.handle })}
                            className={`text-sm px-3 py-1.5 rounded-full border transition-all ${currentCategory === cat.handle ? 'bg-brand text-white border-brand' : 'border-sf-3 hover:border-brand'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Price + Availability filters */}
            {showFilters && (
                <div className="flex flex-wrap items-end gap-4 mb-6 animate-slide-up">
                    {/* Price range */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-tx-muted whitespace-nowrap">{t('product.priceRange')}:</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder={t('product.priceMin')}
                            value={priceMin}
                            onChange={(e) => setPriceMin(e.target.value)}
                            className="w-20 px-2 py-1.5 text-xs rounded-lg border border-sf-3 bg-sf-0 focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                        <span className="text-xs text-tx-faint">—</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder={t('product.priceMax')}
                            value={priceMax}
                            onChange={(e) => setPriceMax(e.target.value)}
                            className="w-20 px-2 py-1.5 text-xs rounded-lg border border-sf-3 bg-sf-0 focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                    </div>

                    {/* In stock toggle */}
                    <button
                        onClick={() => setInStockOnly(!inStockOnly)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                            inStockOnly
                                ? 'bg-brand text-white border-brand'
                                : 'border-sf-3 text-tx-sec hover:border-brand'
                        }`}
                    >
                        <Check className={`w-3 h-3 ${inStockOnly ? 'opacity-100' : 'opacity-0'}`} />
                        {t('product.inStock')}
                    </button>
                </div>
            )}

            {/* Active filter pills */}
            {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {activeFilters.map((filter) => (
                        <span
                            key={filter.key}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-brand-subtle text-brand"
                        >
                            {filter.label}
                            <button onClick={() => {
                                if (filter.key === 'priceMin') setPriceMin('')
                                else if (filter.key === 'priceMax') setPriceMax('')
                                else if (filter.key === 'inStock') setInStockOnly(false)
                                else updateParams({ [filter.key]: '' })
                            }}>
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                    <button
                        onClick={() => {
                            setPriceMin('')
                            setPriceMax('')
                            setInStockOnly(false)
                            router.push(pathname)
                        }}
                        className="text-xs text-tx-muted hover:text-brand transition-colors"
                    >
                        {t('product.clearFilters')}
                    </button>
                </div>
            )}

            {/* Results count */}
            <p className="text-sm text-tx-muted mb-4">
                {t('product.resultCount', { count: String(filteredProducts.length) })}
            </p>

            {/* Grid / List */}
            {filteredProducts.length > 0 ? (
                currentView === 'list' ? (
                    /* List View */
                    <div className="space-y-3">
                        {filteredProducts.map((product) => {
                            const variant = product.variants?.[0]
                            const resolved = getPrice(variant)
                            return (
                                <Link
                                    key={product.id}
                                    href={`${pathname.replace(/\/productos$/, '')}/productos/${product.handle}`}
                                    className="flex gap-4 p-3 rounded-xl border border-sf-3 hover:border-brand bg-sf-0 hover:bg-sf-1 transition-all group"
                                >
                                    <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-sf-1 shrink-0">
                                        {product.thumbnail ? (
                                            <Image
                                                src={product.thumbnail}
                                                alt={product.title}
                                                fill
                                                sizes="128px"
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="image-fallback">
                                                <Package strokeWidth={1.5} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 py-1">
                                        <h3 className="text-sm font-semibold text-tx line-clamp-2 group-hover:text-brand transition-colors">
                                            {product.title}
                                        </h3>
                                        {product.description && (
                                            <p className="text-xs text-tx-muted line-clamp-2 mt-1">
                                                {product.description}
                                            </p>
                                        )}
                                        {resolved && (
                                            <p className="text-base font-bold text-brand mt-2">
                                                {formatPrice(resolved.amount, resolved.currency)}
                                            </p>
                                        )}
                                        {product.variants && product.variants.length > 1 && (
                                            <p className="text-xs text-tx-muted mt-1">
                                                {t('product.options', { count: String(product.variants.length) })}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                ) : (
                    /* Grid View (default) */
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {filteredProducts.map((product) => (
                            <ProductCard key={product.id} product={product} badgesEnabled={badgesEnabled} compareEnabled={compareEnabled} quickAddEnabled={quickAddEnabled} />
                        ))}
                    </div>
                )
            ) : (
                <div className="text-center py-16">
                    <p className="text-4xl mb-4">🔍</p>
                    <h3 className="text-lg font-semibold text-tx mb-2">
                        {t('product.noResults')}
                    </h3>
                    <p className="text-sm text-tx-muted">
                        {t('product.noResultsHint')}
                    </p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <nav aria-label="Pagination" className="flex items-center justify-center gap-2 mt-10">
                    <button
                        onClick={() => updateParams({ page: String(currentPage - 1) })}
                        disabled={currentPage <= 1}
                        className="p-2 rounded-xl border border-sf-3 transition-all hover:border-brand disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label={t('product.prevPage') || 'Previous page'}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .reduce<(number | 'dots')[]>((acc, p, idx, arr) => {
                            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('dots')
                            acc.push(p)
                            return acc
                        }, [])
                        .map((item, idx) =>
                            item === 'dots' ? (
                                <span key={`dots-${idx}`} className="px-1 text-tx-muted">…</span>
                            ) : (
                                <button
                                    key={item}
                                    onClick={() => updateParams({ page: String(item) })}
                                    className={`w-9 h-9 text-sm rounded-xl border transition-all ${currentPage === item
                                        ? 'bg-brand text-white border-brand'
                                        : 'border-sf-3 hover:border-brand text-tx-sec'
                                        }`}
                                >
                                    {item}
                                </button>
                            )
                        )}

                    <button
                        onClick={() => updateParams({ page: String(currentPage + 1) })}
                        disabled={currentPage >= totalPages}
                        className="p-2 rounded-xl border border-sf-3 transition-all hover:border-brand disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label={t('product.nextPage') || 'Next page'}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </nav>
            )}
        </div>
    )
}
