'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { Search, X, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import type { MedusaProduct, MedusaCategory } from '@/lib/medusa/client'
import { useI18n } from '@/lib/i18n/provider'
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

    const [searchInput, setSearchInput] = useState(currentQuery)
    const [showFilters, setShowFilters] = useState(false)

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
    ].filter(Boolean) as { key: string; label: string }[]

    return (
        <div>
            {/* Search + filter bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="text"
                        placeholder={t('product.searchPlaceholder')}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                    {searchInput && (
                        <button
                            onClick={() => setSearchInput('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                            <X className="w-4 h-4 text-text-muted hover:text-text-primary" />
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    <select
                        value={currentSort}
                        onChange={(e) => updateParams({ sort: e.target.value })}
                        className="px-3 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                        <option value="">{t('product.sort')}</option>
                        <option value="-created_at">{t('product.sortNewest')}</option>
                        <option value="title">A-Z</option>
                        <option value="-title">Z-A</option>
                    </select>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn btn-ghost px-3 py-2.5 rounded-xl border border-surface-3 text-sm ${showFilters ? 'bg-primary/10 border-primary' : ''}`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('product.filter')}</span>
                    </button>
                </div>
            </div>

            {/* Category filters */}
            {showFilters && categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6 animate-slide-up">
                    <button
                        onClick={() => updateParams({ category: '' })}
                        className={`text-sm px-3 py-1.5 rounded-full border transition-all ${!currentCategory ? 'bg-primary text-white border-primary' : 'border-surface-3 hover:border-primary'}`}
                    >
                        {t('product.allCategories')}
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => updateParams({ category: cat.handle })}
                            className={`text-sm px-3 py-1.5 rounded-full border transition-all ${currentCategory === cat.handle ? 'bg-primary text-white border-primary' : 'border-surface-3 hover:border-primary'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Active filter pills */}
            {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {activeFilters.map((filter) => (
                        <span
                            key={filter.key}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary"
                        >
                            {filter.label}
                            <button onClick={() => updateParams({ [filter.key]: '' })}>
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                    <button
                        onClick={() => router.push(pathname)}
                        className="text-xs text-text-muted hover:text-primary transition-colors"
                    >
                        {t('product.clearFilters')}
                    </button>
                </div>
            )}

            {/* Results count */}
            <p className="text-sm text-text-muted mb-4">
                {t('product.resultCount', { count: String(totalCount) })}
            </p>

            {/* Grid */}
            {products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} badgesEnabled={badgesEnabled} compareEnabled={compareEnabled} quickAddEnabled={quickAddEnabled} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <p className="text-4xl mb-4">🔍</p>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                        {t('product.noResults')}
                    </h3>
                    <p className="text-sm text-text-muted">
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
                        className="p-2 rounded-xl border border-surface-3 transition-all hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed"
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
                                <span key={`dots-${idx}`} className="px-1 text-text-muted">…</span>
                            ) : (
                                <button
                                    key={item}
                                    onClick={() => updateParams({ page: String(item) })}
                                    className={`w-9 h-9 text-sm rounded-xl border transition-all ${currentPage === item
                                        ? 'bg-primary text-white border-primary'
                                        : 'border-surface-3 hover:border-primary text-text-secondary'
                                        }`}
                                >
                                    {item}
                                </button>
                            )
                        )}

                    <button
                        onClick={() => updateParams({ page: String(currentPage + 1) })}
                        disabled={currentPage >= totalPages}
                        className="p-2 rounded-xl border border-surface-3 transition-all hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label={t('product.nextPage') || 'Next page'}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </nav>
            )}
        </div>
    )
}
