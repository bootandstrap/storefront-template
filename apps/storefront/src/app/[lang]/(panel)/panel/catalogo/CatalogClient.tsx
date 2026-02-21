'use client'

/**
 * CatalogClient — Tabbed Products + Categories with inline badges
 *
 * Products tab: product grid with badge toggle chips per card
 * Categories tab: category cards with CRUD
 */

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { Package, Plus, Search, X, Layers, ChevronDown, ChevronUp, Upload, Trash2, ImageIcon } from 'lucide-react'
import { createProduct, updateProduct, removeProduct, uploadProductImage, removeProductImage } from '../productos/actions'
import { createCategory, editCategory, removeCategory } from '../categorias/actions'
import { toggleBadge } from '../insignias/actions'
import { AVAILABLE_BADGES, type BadgeId } from '../insignias/badges'
import type { AdminProductFull } from '@/lib/medusa/admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryItem {
    id: string
    name: string
    handle: string
    description: string | null
}

interface CatalogLabels {
    catalogTitle: string
    catalogSubtitle: string
    tabProducts: string
    tabCategories: string
    addProduct: string
    editProduct: string
    noProducts: string
    name: string
    description: string
    price: string
    category: string
    noCategory: string
    status: string
    published: string
    draft: string
    all: string
    searchPlaceholder: string
    products: string
    confirmDelete: string
    addCategory: string
    editCategory: string
    noCategories: string
    categoryName: string
    categoryDescription: string
    confirmDeleteCategory: string
    categories: string
    badgesLabel: string
    badgesAvailable: string
    save: string
    cancel: string
    create: string
    delete: string
    edit: string
    previous: string
    next: string
    maxReached: string
    images: string
    dropzone: string
    dropzoneHint: string
    uploading: string
    imageAdded: string
    saveFirst: string
}

interface Props {
    products: AdminProductFull[]
    categories: CategoryItem[]
    badgeMap: Record<string, string[]>
    productCount: number
    maxProducts: number
    canAddProduct: boolean
    categoryCount: number
    maxCategories: number
    canAddCategory: boolean
    currentPage: number
    pageSize: number
    initialSearch: string
    initialStatus: 'all' | 'published' | 'draft'
    initialTab: 'productos' | 'categorias'
    defaultCurrency: string
    labels: CatalogLabels
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CatalogClient({
    products,
    categories,
    badgeMap,
    productCount,
    maxProducts,
    canAddProduct,
    categoryCount,
    maxCategories,
    canAddCategory,
    currentPage,
    pageSize,
    initialSearch,
    initialStatus,
    initialTab,
    defaultCurrency,
    labels,
}: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const toast = useToast()

    // Tab state (server-driven initial value)
    const [activeTab, setActiveTab] = useState<'productos' | 'categorias'>(initialTab)

    // -------------------------------------------------------------------------
    // Product state
    // -------------------------------------------------------------------------
    const [search, setSearch] = useState(initialSearch)
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>(initialStatus)
    const [showProductForm, setShowProductForm] = useState(false)
    const [editingProduct, setEditingProduct] = useState<AdminProductFull | null>(null)
    const [productError, setProductError] = useState<string | null>(null)
    const [formTitle, setFormTitle] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formPrice, setFormPrice] = useState('')
    const [formCategory, setFormCategory] = useState('')
    const [formStatus, setFormStatus] = useState<'published' | 'draft'>('published')
    const [expandedBadges, setExpandedBadges] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [dragOver, setDragOver] = useState(false)

    // -------------------------------------------------------------------------
    // Category state
    // -------------------------------------------------------------------------
    const [showCategoryForm, setShowCategoryForm] = useState(false)
    const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
    const [categoryError, setCategoryError] = useState<string | null>(null)
    const [catName, setCatName] = useState('')
    const [catDescription, setCatDescription] = useState('')

    const totalPages = Math.max(1, Math.ceil(productCount / pageSize))
    const canGoPrev = currentPage > 1
    const canGoNext = currentPage < totalPages

    const updateQuery = (updates: Record<string, string | undefined>) => {
        const next = new URLSearchParams(searchParams.toString())
        for (const [key, value] of Object.entries(updates)) {
            if (!value) {
                next.delete(key)
            } else {
                next.set(key, value)
            }
        }
        const query = next.toString()
        router.push(query ? `${pathname}?${query}` : pathname)
    }

    const applyProductSearch = () => {
        const q = search.trim()
        updateQuery({
            q: q || undefined,
            page: '1',
            tab: 'productos',
        })
    }

    // -------------------------------------------------------------------------
    // Product helpers
    // -------------------------------------------------------------------------

    const resetProductForm = () => {
        setFormTitle('')
        setFormDescription('')
        setFormPrice('')
        setFormCategory('')
        setFormStatus('published')
        setEditingProduct(null)
        setShowProductForm(false)
        setProductError(null)
    }

    const openEditProduct = (product: AdminProductFull) => {
        setFormTitle(product.title)
        setFormDescription(product.description ?? '')
        const price = product.variants?.[0]?.prices?.[0]?.amount
        setFormPrice(price ? String(price / 100) : '')
        setFormCategory(product.categories?.[0]?.id ?? '')
        setFormStatus(product.status as 'published' | 'draft')
        setEditingProduct(product)
        setShowProductForm(true)
    }

    const handleProductSubmit = () => {
        startTransition(async () => {
            setProductError(null)
            if (editingProduct) {
                const result = await updateProduct(editingProduct.id, {
                    title: formTitle,
                    description: formDescription,
                    status: formStatus,
                    categoryId: formCategory || null,
                    price: formPrice ? parseFloat(formPrice) : undefined,
                    currency: defaultCurrency,
                    variantId: editingProduct.variants?.[0]?.id,
                })
                if (result.success) { resetProductForm(); router.refresh(); toast.success('✓') }
                else { setProductError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
            } else {
                const result = await createProduct({
                    title: formTitle,
                    description: formDescription,
                    price: parseFloat(formPrice) || 0,
                    currency: defaultCurrency,
                    categoryId: formCategory || undefined,
                    status: formStatus,
                })
                if (result.success) { resetProductForm(); router.refresh(); toast.success('✓') }
                else { setProductError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
            }
        })
    }

    const handleDeleteProduct = (id: string) => {
        if (!confirm(labels.confirmDelete)) return
        startTransition(async () => {
            const result = await removeProduct(id)
            if (result.success) { router.refresh(); toast.success('✓') }
            else { setProductError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
        })
    }

    const handleToggleStatus = (product: AdminProductFull) => {
        startTransition(async () => {
            const newStatus = product.status === 'published' ? 'draft' : 'published'
            const result = await updateProduct(product.id, { status: newStatus })
            if (result.success) router.refresh()
        })
    }

    const handleToggleBadge = (productId: string, badgeId: BadgeId, currentlyEnabled: boolean) => {
        startTransition(async () => {
            const result = await toggleBadge(productId, badgeId, !currentlyEnabled)
            if (result.success) router.refresh()
            else setProductError(result.error ?? 'Error')
        })
    }

    const getPrice = (product: AdminProductFull) => {
        const price = product.variants?.[0]?.prices?.[0]
        if (!price) return '—'
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: price.currency_code,
        }).format(price.amount / 100)
    }

    // Image upload handlers
    const handleImageUpload = async (file: File) => {
        if (!editingProduct) return
        setIsUploading(true)
        setProductError(null)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const result = await uploadProductImage(editingProduct.id, formData)
            if (result.success) {
                router.refresh()
                toast.success(labels.imageAdded)
            } else {
                setProductError(result.error ?? 'Upload failed')
                toast.error(result.error ?? 'Upload failed')
            }
        } finally {
            setIsUploading(false)
        }
    }

    const handleImageDelete = async (imageUrl: string) => {
        if (!editingProduct) return
        startTransition(async () => {
            const result = await removeProductImage(editingProduct.id, imageUrl)
            if (result.success) { router.refresh(); toast.success('✓') }
            else { setProductError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
        })
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleImageUpload(file)
        e.target.value = '' // reset for re-upload
    }

    const filtered = products

    // -------------------------------------------------------------------------
    // Category helpers
    // -------------------------------------------------------------------------

    const resetCategoryForm = () => {
        setCatName('')
        setCatDescription('')
        setEditingCategory(null)
        setShowCategoryForm(false)
        setCategoryError(null)
    }

    const openEditCategory = (cat: CategoryItem) => {
        setCatName(cat.name)
        setCatDescription(cat.description ?? '')
        setEditingCategory(cat)
        setShowCategoryForm(true)
    }

    const handleCategorySubmit = () => {
        startTransition(async () => {
            setCategoryError(null)
            if (editingCategory) {
                const result = await editCategory(editingCategory.id, {
                    name: catName,
                    description: catDescription,
                })
                if (result.success) { resetCategoryForm(); router.refresh(); toast.success('✓') }
                else { setCategoryError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
            } else {
                const result = await createCategory({
                    name: catName,
                    description: catDescription,
                })
                if (result.success) { resetCategoryForm(); router.refresh(); toast.success('✓') }
                else { setCategoryError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
            }
        })
    }

    const handleDeleteCategory = (id: string) => {
        if (!confirm(labels.confirmDeleteCategory)) return
        startTransition(async () => {
            const result = await removeCategory(id)
            if (result.success) { router.refresh(); toast.success('✓') }
            else { setCategoryError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
        })
    }

    // -------------------------------------------------------------------------
    // Shared styles
    // -------------------------------------------------------------------------

    const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'
    const labelClass = 'block text-sm font-medium text-text-secondary mb-1'

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------

    return (
        <>
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold font-display text-text-primary">
                    {labels.catalogTitle}
                </h1>
                <p className="text-text-muted mt-1">{labels.catalogSubtitle}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl border border-surface-3 overflow-hidden w-fit">
                <button
                    onClick={() => {
                        setActiveTab('productos')
                        updateQuery({ tab: 'productos' })
                    }}
                    className={`px-5 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'productos'
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:bg-surface-1'
                        }`}
                >
                    <Package className="w-4 h-4" />
                    {labels.tabProducts}
                    <span className="text-xs opacity-70">({productCount})</span>
                </button>
                <button
                    onClick={() => {
                        setActiveTab('categorias')
                        updateQuery({ tab: 'categorias' })
                    }}
                    className={`px-5 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'categorias'
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:bg-surface-1'
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    {labels.tabCategories}
                    <span className="text-xs opacity-70">({categoryCount})</span>
                </button>
            </div>

            {/* ============================================================= */}
            {/* PRODUCTS TAB                                                   */}
            {/* ============================================================= */}
            {activeTab === 'productos' && (
                <>
                    {/* Toolbar */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <p className="text-xs text-text-muted">
                            {productCount} / {maxProducts} {labels.products}
                            {!canAddProduct && <span className="text-red-500 ml-2">— {labels.maxReached}</span>}
                        </p>
                        <button
                            className="btn btn-primary flex items-center gap-2"
                            disabled={!canAddProduct || isPending}
                            onClick={() => { resetProductForm(); setShowProductForm(true) }}
                        >
                            <Plus className="w-4 h-4" />
                            {labels.addProduct}
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-3 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="text"
                                placeholder={labels.searchPlaceholder}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') applyProductSearch()
                                }}
                                className={`${inputClass} pl-10`}
                            />
                        </div>
                        <div className="flex gap-1 rounded-xl border border-surface-3 overflow-hidden">
                            {(['all', 'published', 'draft'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => {
                                        setStatusFilter(s)
                                        updateQuery({
                                            status: s === 'all' ? undefined : s,
                                            page: '1',
                                            tab: 'productos',
                                        })
                                    }}
                                    className={`px-3 py-2 text-sm font-medium transition-colors ${statusFilter === s
                                        ? 'bg-primary text-white'
                                        : 'text-text-secondary hover:bg-surface-1'
                                        }`}
                                >
                                    {s === 'all' ? labels.all : s === 'published' ? labels.published : labels.draft}
                                </button>
                            ))}
                        </div>
                    </div>

                    {productError && (
                        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{productError}</div>
                    )}

                    {/* Product grid with inline badges */}
                    {filtered.length === 0 ? (
                        <div className="glass rounded-2xl p-12 text-center">
                            <Package className="w-12 h-12 mx-auto text-text-muted mb-3" />
                            <p className="text-text-muted">{labels.noProducts}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filtered.map(product => {
                                const productBadges = badgeMap[product.id] || []
                                const isExpanded = expandedBadges === product.id

                                return (
                                    <div key={product.id} className="glass rounded-2xl overflow-hidden group hover:shadow-lg transition-shadow">
                                        {/* Thumbnail */}
                                        <div className="aspect-[4/3] bg-surface-1 relative flex items-center justify-center">
                                            {product.thumbnail ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="w-10 h-10 text-text-muted/40" />
                                            )}
                                            <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${product.status === 'published'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
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
                                            <h3 className="font-bold text-text-primary truncate">{product.title}</h3>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-lg font-bold text-primary">{getPrice(product)}</span>
                                                <span className="text-xs text-text-muted">
                                                    {product.categories?.[0]?.name || labels.noCategory}
                                                </span>
                                            </div>

                                            {/* Badge toggles (collapsible) */}
                                            <div className="mt-3 pt-3 border-t border-surface-2">
                                                <button
                                                    onClick={() => setExpandedBadges(isExpanded ? null : product.id)}
                                                    className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors w-full"
                                                >
                                                    🏷️ {labels.badgesLabel}
                                                    <span className="text-text-muted/60">
                                                        ({productBadges.length})
                                                    </span>
                                                    {isExpanded
                                                        ? <ChevronUp className="w-3 h-3 ml-auto" />
                                                        : <ChevronDown className="w-3 h-3 ml-auto" />
                                                    }
                                                </button>
                                                {isExpanded && (
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {AVAILABLE_BADGES.map(badge => {
                                                            const isEnabled = productBadges.includes(badge.id)
                                                            return (
                                                                <button
                                                                    key={badge.id}
                                                                    onClick={() => handleToggleBadge(product.id, badge.id, isEnabled)}
                                                                    disabled={isPending}
                                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer ${isEnabled
                                                                        ? badge.color + ' ring-1 ring-offset-1 ring-current/20'
                                                                        : 'bg-surface-1 text-text-muted hover:bg-surface-2'
                                                                        } ${isPending ? 'opacity-50' : ''}`}
                                                                >
                                                                    {badge.emoji} {badge.label}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-surface-2">
                                                <button
                                                    onClick={() => handleToggleStatus(product)}
                                                    className="btn btn-ghost text-xs flex-1"
                                                    disabled={isPending}
                                                >
                                                    {product.status === 'published' ? '📝' : '🟢'}
                                                    {' '}
                                                    {product.status === 'published' ? labels.draft : labels.published}
                                                </button>
                                                <button
                                                    onClick={() => openEditProduct(product)}
                                                    className="btn btn-ghost text-xs flex-1"
                                                    disabled={isPending}
                                                >
                                                    ✏️ {labels.edit}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProduct(product.id)}
                                                    className="btn btn-ghost text-xs text-red-500"
                                                    disabled={isPending}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {productCount > pageSize && (
                        <div className="flex items-center justify-between pt-2">
                            <button
                                onClick={() => updateQuery({ page: String(currentPage - 1), tab: 'productos' })}
                                disabled={!canGoPrev}
                                className="btn btn-ghost disabled:opacity-50"
                            >
                                {labels.previous}
                            </button>
                            <p className="text-sm text-text-muted">
                                {currentPage} / {totalPages}
                            </p>
                            <button
                                onClick={() => updateQuery({ page: String(currentPage + 1), tab: 'productos' })}
                                disabled={!canGoNext}
                                className="btn btn-ghost disabled:opacity-50"
                            >
                                {labels.next}
                            </button>
                        </div>
                    )}

                    {/* Product form modal */}
                    {showProductForm && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="glass-strong rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-bold text-lg text-text-primary">
                                        {editingProduct ? labels.editProduct : labels.addProduct}
                                    </h2>
                                    <button onClick={resetProductForm} className="p-1 hover:bg-surface-1 rounded-lg">
                                        <X className="w-5 h-5 text-text-muted" />
                                    </button>
                                </div>
                                <div>
                                    <label className={labelClass}>{labels.name} *</label>
                                    <input value={formTitle} onChange={e => setFormTitle(e.target.value)} className={inputClass} autoFocus />
                                </div>
                                <div>
                                    <label className={labelClass}>{labels.description}</label>
                                    <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} className={`${inputClass} min-h-[80px] resize-y`} rows={3} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>{labels.price} ({defaultCurrency.toUpperCase()})</label>
                                        <input type="number" step="0.01" min="0" value={formPrice} onChange={e => setFormPrice(e.target.value)} className={inputClass} placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>{labels.category}</label>
                                        <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className={inputClass}>
                                            <option value="">{labels.noCategory}</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>{labels.status}</label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormStatus('published')}
                                            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${formStatus === 'published'
                                                ? 'bg-green-50 border-green-300 text-green-700'
                                                : 'border-surface-3 text-text-secondary hover:bg-surface-1'
                                                }`}
                                        >
                                            🟢 {labels.published}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormStatus('draft')}
                                            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${formStatus === 'draft'
                                                ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                                                : 'border-surface-3 text-text-secondary hover:bg-surface-1'
                                                }`}
                                        >
                                            📝 {labels.draft}
                                        </button>
                                    </div>
                                </div>

                                {/* Image upload section — only for editing (needs productId) */}
                                {editingProduct && (
                                    <div>
                                        <label className={labelClass}>{labels.images}</label>

                                        {/* Existing images */}
                                        {editingProduct.images && editingProduct.images.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {editingProduct.images.map(img => (
                                                    <div key={img.id} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-surface-3">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleImageDelete(img.url)}
                                                            disabled={isPending}
                                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
                                                                       flex items-center justify-center transition-opacity"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-white" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Dropzone */}
                                        <div
                                            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                                            onDragLeave={() => setDragOver(false)}
                                            onDrop={handleDrop}
                                            className={`relative border-2 border-dashed rounded-xl p-4 text-center
                                                        transition-colors cursor-pointer
                                                        ${dragOver
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-surface-3 hover:border-primary/40'
                                                }
                                                        ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                                        >
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/gif"
                                                onChange={handleFileSelect}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                disabled={isUploading}
                                            />
                                            <Upload className="w-6 h-6 mx-auto text-text-muted mb-1" />
                                            <p className="text-sm text-text-secondary">
                                                {isUploading ? labels.uploading : labels.dropzone}
                                            </p>
                                            <p className="text-xs text-text-muted mt-0.5">{labels.dropzoneHint}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Hint for new products */}
                                {!editingProduct && (
                                    <p className="text-xs text-text-muted flex items-center gap-1.5">
                                        <ImageIcon className="w-3.5 h-3.5" />
                                        {labels.saveFirst}
                                    </p>
                                )}
                                <div className="flex gap-3 pt-2">
                                    <button onClick={handleProductSubmit} disabled={isPending || !formTitle.trim()} className="btn btn-primary flex-1">
                                        {isPending ? '...' : editingProduct ? labels.save : labels.create}
                                    </button>
                                    <button onClick={resetProductForm} className="btn btn-ghost">{labels.cancel}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ============================================================= */}
            {/* CATEGORIES TAB                                                 */}
            {/* ============================================================= */}
            {activeTab === 'categorias' && (
                <>
                    {/* Toolbar */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <p className="text-xs text-text-muted">
                            {categoryCount} / {maxCategories} {labels.categories}
                            {!canAddCategory && <span className="text-red-500 ml-2">— {labels.maxReached}</span>}
                        </p>
                        <button
                            className="btn btn-primary flex items-center gap-2"
                            disabled={!canAddCategory || isPending}
                            onClick={() => { resetCategoryForm(); setShowCategoryForm(true) }}
                        >
                            <Plus className="w-4 h-4" />
                            {labels.addCategory}
                        </button>
                    </div>

                    {categoryError && (
                        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{categoryError}</div>
                    )}

                    {/* Category grid */}
                    {categories.length === 0 ? (
                        <div className="glass rounded-2xl p-12 text-center">
                            <Layers className="w-12 h-12 mx-auto text-text-muted mb-3" />
                            <p className="text-text-muted">{labels.noCategories}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categories.map(cat => (
                                <div key={cat.id} className="glass rounded-2xl p-5 hover:shadow-lg transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                                <Layers className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-text-primary">{cat.name}</h3>
                                                <p className="text-xs text-text-muted mt-0.5">/{cat.handle}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {cat.description && (
                                        <p className="text-sm text-text-muted mt-3 line-clamp-2">{cat.description}</p>
                                    )}
                                    <div className="flex gap-2 mt-4 pt-3 border-t border-surface-2">
                                        <button onClick={() => openEditCategory(cat)} className="btn btn-ghost text-xs flex-1" disabled={isPending}>
                                            ✏️ {labels.edit}
                                        </button>
                                        <button onClick={() => handleDeleteCategory(cat.id)} className="btn btn-ghost text-xs text-red-500 flex-1" disabled={isPending}>
                                            🗑️ {labels.delete}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Category form modal */}
                    {showCategoryForm && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="glass-strong rounded-2xl p-6 w-full max-w-md space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-bold text-lg text-text-primary">
                                        {editingCategory ? labels.editCategory : labels.addCategory}
                                    </h2>
                                    <button onClick={resetCategoryForm} className="p-1 hover:bg-surface-1 rounded-lg">
                                        <X className="w-5 h-5 text-text-muted" />
                                    </button>
                                </div>
                                <div>
                                    <label className={labelClass}>{labels.categoryName} *</label>
                                    <input value={catName} onChange={e => setCatName(e.target.value)} className={inputClass} autoFocus />
                                </div>
                                <div>
                                    <label className={labelClass}>{labels.categoryDescription}</label>
                                    <textarea value={catDescription} onChange={e => setCatDescription(e.target.value)} className={`${inputClass} min-h-[60px] resize-y`} rows={2} />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={handleCategorySubmit} disabled={isPending || !catName.trim()} className="btn btn-primary flex-1">
                                        {isPending ? '...' : editingCategory ? labels.save : labels.create}
                                    </button>
                                    <button onClick={resetCategoryForm} className="btn btn-ghost">{labels.cancel}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    )
}
