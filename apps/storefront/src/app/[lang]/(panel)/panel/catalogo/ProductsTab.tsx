'use client'

/**
 * ProductsTab — Products grid with filters, badges, pagination
 *
 * Extracted from CatalogClient monolith.
 * Handles product listing, search/filter, inline badge toggles,
 * status toggle, and server-side pagination.
 *
 * @module ProductsTab
 * @locked 🟡 YELLOW — extracted component, stable interface
 */

import { useState } from 'react'
import {
    Package, Plus, Search, X, ChevronDown, ChevronUp,
    Barcode, Eye, EyeOff, Pencil, Tag, Trash2, AlertTriangle,
    ChevronLeft, ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'
import { SotaFeatureGateWrapper } from '@/components/panel/sota/SotaFeatureGateWrapper'
import LimitAwareCTA from '@/components/panel/LimitAwareCTA'
import { AVAILABLE_BADGES, type BadgeId } from '../insignias/badges'
import type { AdminProductFull } from '@/lib/medusa/admin'
import type { LimitCheckResult } from '@/lib/limits'
import { isZeroDecimal } from '@/lib/i18n/currencies'
import ResourceBadge from '@/components/panel/ResourceBadge'

interface ProductsTabLabels {
    products: string
    addProduct: string
    noProducts: string
    published: string
    draft: string
    all: string
    searchPlaceholder: string
    noCategory: string
    edit: string
    delete: string
    maxReached: string
    previous: string
    next: string
    badgesLabel: string
    badgesAvailable: string
}

interface Props {
    products: AdminProductFull[]
    badgeMap: Record<string, string[]>
    productCount: number
    maxProducts: number
    canAddProduct: boolean
    productLimitResult?: LimitCheckResult
    activeCurrencies: string[]
    search: string
    setSearch: (v: string) => void
    statusFilter: 'all' | 'published' | 'draft'
    setStatusFilter: (v: 'all' | 'published' | 'draft') => void
    onApplySearch: () => void
    onAddClick: () => void
    onEditClick: (product: AdminProductFull) => void
    onDeleteClick: (id: string) => void
    onToggleStatus: (product: AdminProductFull) => void
    onToggleBadge: (productId: string, badgeId: BadgeId, currentlyEnabled: boolean) => void
    onShowLabels: () => void
    productError: string | null
    setProductError: (v: string | null) => void
    // Pagination
    currentPage: number
    totalPages: number
    canGoPrev: boolean
    canGoNext: boolean
    onPageChange: (page: number) => void
    onFilterChange: (updates: Record<string, string | undefined>) => void
    isPending: boolean
    labels: ProductsTabLabels
}

const inputClass = 'w-full px-4 py-2.5 rounded-xl bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-soft transition-all'

export default function ProductsTab({
    products,
    badgeMap,
    productCount,
    maxProducts,
    canAddProduct,
    productLimitResult,
    activeCurrencies,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    onApplySearch,
    onAddClick,
    onEditClick,
    onDeleteClick,
    onToggleStatus,
    onToggleBadge,
    onShowLabels,
    productError,
    setProductError,
    currentPage,
    totalPages,
    canGoPrev,
    canGoNext,
    onPageChange,
    onFilterChange,
    isPending,
    labels,
}: Props) {
    // Expanded badge state is local to this tab
    const [expandedBadges, setExpandedBadges] = useState<string | null>(null)

    const getPrice = (product: AdminProductFull) => {
        const price = product.variants?.[0]?.prices?.[0]
        if (!price) return '—'
        const code = price.currency_code.toLowerCase()
        const displayAmount = isZeroDecimal(code) ? price.amount : price.amount / 100
        return new Intl.NumberFormat(undefined, {
            style: 'currency', currency: price.currency_code,
            minimumFractionDigits: 0,
            maximumFractionDigits: isZeroDecimal(code) ? 0 : 2,
        }).format(displayAmount)
    }

    const getMissingPriceCount = (product: AdminProductFull): number => {
        const variantPrices = product.variants?.[0]?.prices ?? []
        const configuredCurrencies = new Set(variantPrices.map(p => p.currency_code.toLowerCase()))
        return activeCurrencies.filter(c => !configuredCurrencies.has(c)).length
    }

    return (
        <motion.div
            key="products"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                {productLimitResult ? (
                    <ResourceBadge limitResult={productLimitResult} label={labels.products} showProgress />
                ) : (
                    <p className="text-xs text-tx-muted">
                        {productCount} / {maxProducts} {labels.products}
                        {!canAddProduct && <span className="text-red-500 ml-2">— {labels.maxReached}</span>}
                    </p>
                )}
                <div className="flex items-center gap-2">
                    <button
                        className="btn border border-sf-3/30 bg-sf-0/50 backdrop-blur-md shadow-sm flex items-center gap-2 min-h-[44px] text-sm font-medium text-tx-sec hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                        disabled={products.length === 0}
                        onClick={onShowLabels}
                        title="Print price labels"
                    >
                        <Barcode className="w-4 h-4" />
                        <span className="hidden sm:inline">Labels</span>
                    </button>
                    {productLimitResult ? (
                        <LimitAwareCTA
                            label={labels.addProduct}
                            icon={<Plus className="w-4 h-4" />}
                            limitResult={productLimitResult}
                            onClick={onAddClick}
                            upgradeHref="modulos"
                            isLoading={isPending}
                            showCounter
                        />
                    ) : (
                        <SotaFeatureGateWrapper isLocked={!canAddProduct} flag="max_products_limit" variant="badge">
                            <button
                                className="btn btn-primary flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                                disabled={isPending || !canAddProduct}
                                onClick={onAddClick}
                            >
                                <Plus className="w-4 h-4" />
                                {labels.addProduct}
                            </button>
                        </SotaFeatureGateWrapper>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted" />
                    <input
                        type="text"
                        placeholder={labels.searchPlaceholder}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') onApplySearch() }}
                        aria-label={labels.searchPlaceholder}
                        className={`${inputClass} pl-10 min-h-[44px]`}
                    />
                </div>
                <div className="flex gap-1 bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-xl overflow-hidden p-1">
                    {(['all', 'published', 'draft'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => {
                                setStatusFilter(s)
                                onFilterChange({ status: s === 'all' ? undefined : s, page: '1', tab: 'productos' })
                            }}
                            aria-pressed={statusFilter === s}
                            className={`px-3 py-2 min-h-[40px] text-sm font-medium rounded-lg transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med ${
                                statusFilter === s ? 'text-white' : 'text-tx-sec hover:bg-sf-1'
                            }`}
                        >
                            {statusFilter === s && (
                                <motion.div
                                    layoutId="catalog-status-filter"
                                    className="absolute inset-0 bg-brand rounded-lg"
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">
                                {s === 'all' ? labels.all : s === 'published' ? labels.published : labels.draft}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Error banner */}
            <AnimatePresence>
                {productError && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between"
                    >
                        <span>{productError}</span>
                        <button onClick={() => setProductError(null)} aria-label="Dismiss error" className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Product grid with inline badges */}
            {products.length === 0 ? (
                <div className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl">
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Package className="w-8 h-8 text-tx-muted" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-bold font-display text-tx mb-2">
                            {labels.noProducts}
                        </h3>
                        <p className="text-sm text-tx-sec leading-relaxed mb-6">
                            {labels.noProducts}
                        </p>
                        {productLimitResult ? (
                            <LimitAwareCTA
                                label={labels.addProduct}
                                icon={<Plus className="w-4 h-4" />}
                                limitResult={productLimitResult}
                                onClick={onAddClick}
                                upgradeHref="modulos"
                                isLoading={isPending}
                            />
                        ) : (
                            <SotaFeatureGateWrapper isLocked={!canAddProduct} flag="max_products_limit" variant="badge">
                                <button
                                    className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                                    disabled={isPending || !canAddProduct}
                                    onClick={onAddClick}
                                >
                                    <Plus className="w-4 h-4" />
                                    {labels.addProduct}
                                </button>
                            </SotaFeatureGateWrapper>
                        )}
                    </div>
                </div>
            ) : (
                <ListStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map(product => {
                        const productBadges = badgeMap[product.id] || []
                        const isExpanded = expandedBadges === product.id

                        return (
                            <StaggerItem key={product.id}>
                                <motion.div
                                    whileHover={{ y: -2 }}
                                    className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl overflow-hidden group transition-shadow hover:shadow-lg"
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-[4/3] bg-sf-1 relative flex items-center justify-center cursor-pointer" onClick={() => onEditClick(product)}>
                                        {product.thumbnail ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <Package className="w-10 h-10 text-tx-faint" />
                                        )}
                                        <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                                            product.status === 'published'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}>
                                            {product.status === 'published' ? labels.published : labels.draft}
                                        </span>
                                        {/* Active badges on thumbnail */}
                                        {productBadges.length > 0 && (
                                            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                                                {productBadges.map(bid => {
                                                    const badge = AVAILABLE_BADGES.find(b => b.id === bid)
                                                    if (!badge) return null
                                                    return (
                                                        <span key={bid} className={`text-xs px-1.5 py-0.5 rounded-full ${badge.color}`}>
                                                            {badge.emoji}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-4">
                                        <h3 className="font-bold text-tx truncate cursor-pointer hover:text-brand transition-colors" onClick={() => onEditClick(product)}>{product.title}</h3>
                                        <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-lg font-bold text-brand">{getPrice(product)}</span>
                                                {activeCurrencies.length > 1 && getMissingPriceCount(product) > 0 && (
                                                    <span
                                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                        title={`${getMissingPriceCount(product)} moneda(s) sin precio`}
                                                    >
                                                        <AlertTriangle className="w-3 h-3" />
                                                        {getMissingPriceCount(product)}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-tx-muted">
                                                {product.categories?.[0]?.name || labels.noCategory}
                                            </span>
                                        </div>

                                        {/* Badge toggles (collapsible) */}
                                        <div className="mt-3 pt-3 border-t border-sf-2">
                                            <button
                                                onClick={() => setExpandedBadges(isExpanded ? null : product.id)}
                                                className="flex items-center gap-1.5 text-xs text-tx-muted hover:text-tx-sec transition-colors w-full"
                                            >
                                                <Tag className="w-3 h-3" />
                                                {labels.badgesLabel}
                                                <span className="text-tx-faint">({productBadges.length})</span>
                                                {isExpanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                                            </button>
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {AVAILABLE_BADGES.map(badge => {
                                                                const isEnabled = productBadges.includes(badge.id)
                                                                return (
                                                                    <motion.button
                                                                        key={badge.id}
                                                                        whileTap={{ scale: 0.93 }}
                                                                        onClick={() => onToggleBadge(product.id, badge.id, isEnabled)}
                                                                        disabled={isPending}
                                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                                                                            isEnabled
                                                                                ? badge.color + ' ring-1 ring-offset-1 ring-current/20'
                                                                                : 'bg-sf-1 text-tx-muted hover:bg-sf-2'
                                                                        } ${isPending ? 'opacity-50' : ''}`}
                                                                    >
                                                                        {badge.emoji} {badge.label}
                                                                    </motion.button>
                                                                )
                                                            })}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-1 mt-3 pt-3 border-t border-sf-2">
                                            <motion.button
                                                whileTap={{ scale: 0.93 }}
                                                onClick={() => onToggleStatus(product)}
                                                className="p-2 min-h-[40px] rounded-lg hover:bg-sf-1 text-tx-muted hover:text-brand transition-colors flex-1 flex items-center justify-center gap-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                                disabled={isPending}
                                                aria-label={product.status === 'published' ? labels.draft : labels.published}
                                            >
                                                {product.status === 'published'
                                                    ? <><EyeOff className="w-3.5 h-3.5" /> {labels.draft}</>
                                                    : <><Eye className="w-3.5 h-3.5" /> {labels.published}</>
                                                }
                                            </motion.button>
                                            <motion.button
                                                whileTap={{ scale: 0.93 }}
                                                onClick={() => onEditClick(product)}
                                                className="p-2 min-h-[40px] rounded-lg hover:bg-sf-1 text-tx-muted hover:text-brand transition-colors flex-1 flex items-center justify-center gap-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                                disabled={isPending}
                                                aria-label={labels.edit}
                                            >
                                                <Pencil className="w-3.5 h-3.5" /> {labels.edit}
                                            </motion.button>
                                            <motion.button
                                                whileTap={{ scale: 0.93 }}
                                                onClick={() => onDeleteClick(product.id)}
                                                className="p-2 min-h-[40px] rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-tx-muted hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                                                disabled={isPending}
                                                aria-label={labels.delete}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </motion.button>
                                        </div>
                                    </div>
                                </motion.div>
                            </StaggerItem>
                        )
                    })}
                </ListStagger>
            )}

            {/* Pagination */}
            {productCount > 12 && (
                <div className="flex items-center justify-between pt-2">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={!canGoPrev}
                        className="btn btn-ghost inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {labels.previous}
                    </motion.button>
                    <p className="text-sm text-tx-muted tabular-nums">
                        {currentPage} / {totalPages}
                    </p>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={!canGoNext}
                        className="btn btn-ghost inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {labels.next}
                        <ChevronRight className="w-4 h-4" />
                    </motion.button>
                </div>
            )}
        </motion.div>
    )
}

