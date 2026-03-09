'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { Package, Plus, Search, X, Download, CheckSquare, Square, Trash2 } from 'lucide-react'
import { createProduct, updateProduct, removeProduct, bulkUpdateStatus, bulkDeleteProducts, exportProductsCsv } from './actions'
import type { AdminProductFull } from '@/lib/medusa/admin'

interface ProductLabels {
    title: string
    subtitle: string
    addProduct: string
    editProduct: string
    noProducts: string
    addProductHint?: string
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
    save: string
    cancel: string
    create: string
    delete: string
    edit: string
    maxReached: string
    selectAll: string
    deselectAll: string
    bulkPublish: string
    bulkDraft: string
    bulkDelete: string
    exportCsv: string
    selected: string
}

interface Props {
    products: AdminProductFull[]
    categories: { id: string; name: string }[]
    productCount: number
    maxProducts: number
    canAdd: boolean
    defaultCurrency: string
    labels: ProductLabels
}

export default function ProductsClient({
    products,
    categories,
    productCount,
    maxProducts,
    canAdd,
    defaultCurrency,
    labels,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const toast = useToast()

    // Filters
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')

    // Modal state
    const [showForm, setShowForm] = useState(false)
    const [editingProduct, setEditingProduct] = useState<AdminProductFull | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Form fields
    const [formTitle, setFormTitle] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formPrice, setFormPrice] = useState('')
    const [formCategory, setFormCategory] = useState('')
    const [formStatus, setFormStatus] = useState<'published' | 'draft'>('published')

    const resetForm = () => {
        setFormTitle('')
        setFormDescription('')
        setFormPrice('')
        setFormCategory('')
        setFormStatus('published')
        setEditingProduct(null)
        setShowForm(false)
        setError(null)
    }

    // Bulk helpers
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }
    const selectAll = () => setSelectedIds(new Set(filtered.map(p => p.id)))
    const deselectAll = () => setSelectedIds(new Set())
    const hasSelection = selectedIds.size > 0

    const handleBulkStatus = (status: 'published' | 'draft') => {
        startTransition(async () => {
            const result = await bulkUpdateStatus([...selectedIds], status)
            if (result.success) {
                toast.success(`${result.updated} updated`)
                deselectAll()
                router.refresh()
            } else {
                toast.error(result.error ?? 'Error')
            }
        })
    }

    const handleBulkDelete = () => {
        if (!confirm(`${labels.bulkDelete} (${selectedIds.size})?`)) return
        startTransition(async () => {
            const result = await bulkDeleteProducts([...selectedIds])
            if (result.success) {
                toast.success(`${result.deleted} deleted`)
                deselectAll()
                router.refresh()
            } else {
                toast.error(result.error ?? 'Error')
            }
        })
    }

    const handleExportCsv = () => {
        startTransition(async () => {
            const result = await exportProductsCsv()
            if (result.csv) {
                const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `products-${Date.now()}.csv`
                a.click()
                URL.revokeObjectURL(url)
                toast.success('CSV exported')
            } else {
                toast.error(result.error ?? 'Export failed')
            }
        })
    }

    const openEdit = (product: AdminProductFull) => {
        setFormTitle(product.title)
        setFormDescription(product.description ?? '')
        const price = product.variants?.[0]?.prices?.[0]?.amount
        setFormPrice(price ? String(price / 100) : '')
        setFormCategory(product.categories?.[0]?.id ?? '')
        setFormStatus(product.status as 'published' | 'draft')
        setEditingProduct(product)
        setShowForm(true)
    }

    const handleSubmit = () => {
        startTransition(async () => {
            setError(null)
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
                if (result.success) {
                    resetForm()
                    router.refresh()
                    toast.success('✓')
                } else {
                    setError(result.error ?? 'Error')
                    toast.error(result.error ?? 'Error')
                }
            } else {
                const result = await createProduct({
                    title: formTitle,
                    description: formDescription,
                    price: parseFloat(formPrice) || 0,
                    currency: defaultCurrency,
                    categoryId: formCategory || undefined,
                    status: formStatus,
                })
                if (result.success) {
                    resetForm()
                    router.refresh()
                    toast.success('✓')
                } else {
                    setError(result.error ?? 'Error')
                    toast.error(result.error ?? 'Error')
                }
            }
        })
    }

    const handleDelete = (id: string) => {
        if (!confirm(labels.confirmDelete)) return
        startTransition(async () => {
            const result = await removeProduct(id)
            if (result.success) { router.refresh(); toast.success('✓') }
            else { setError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
        })
    }

    const handleToggleStatus = (product: AdminProductFull) => {
        startTransition(async () => {
            const newStatus = product.status === 'published' ? 'draft' : 'published'
            const result = await updateProduct(product.id, { status: newStatus })
            if (result.success) router.refresh()
        })
    }

    // Filter products locally
    const filtered = products.filter(p => {
        const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const getPrice = (product: AdminProductFull) => {
        const price = product.variants?.[0]?.prices?.[0]
        if (!price) return '—'
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: price.currency_code,
        }).format(price.amount / 100)
    }

    const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'
    const labelClass = 'block text-sm font-medium text-text-secondary mb-1'

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
                        <Package className="w-6 h-6 text-primary" />
                        {labels.title}
                        <span className="ml-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                            {productCount}
                        </span>
                    </h1>
                    <p className="text-text-muted mt-1">{labels.subtitle} · {productCount} / {maxProducts} {labels.products}</p>
                </div>
                <button
                    className="btn btn-primary flex items-center gap-2"
                    disabled={!canAdd || isPending}
                    onClick={() => { resetForm(); setShowForm(true) }}
                >
                    <Plus className="w-4 h-4" />
                    {labels.addProduct}
                </button>
            </div>

            {/* Bulk action bar */}
            {hasSelection && (
                <div className="glass-strong rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap animate-fade-in">
                    <span className="text-sm font-medium text-text-primary">
                        {selectedIds.size} {labels.selected}
                    </span>
                    <div className="flex gap-2 ml-auto">
                        <button
                            onClick={() => handleBulkStatus('published')}
                            disabled={isPending}
                            className="btn btn-ghost text-xs text-green-600"
                        >
                            🟢 {labels.bulkPublish}
                        </button>
                        <button
                            onClick={() => handleBulkStatus('draft')}
                            disabled={isPending}
                            className="btn btn-ghost text-xs text-yellow-600"
                        >
                            📝 {labels.bulkDraft}
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            disabled={isPending}
                            className="btn btn-ghost text-xs text-red-500"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> {labels.bulkDelete}
                        </button>
                        <button
                            onClick={deselectAll}
                            className="btn btn-ghost text-xs"
                        >
                            <X className="w-3.5 h-3.5" /> {labels.deselectAll}
                        </button>
                    </div>
                </div>
            )}

            {/* Counter + limit */}
            <p className="text-xs text-text-muted">
                {productCount} / {maxProducts} {labels.products}
                {!canAdd && <span className="text-red-500 ml-2">— {labels.maxReached}</span>}
            </p>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="text"
                        placeholder={labels.searchPlaceholder}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className={`${inputClass} pl-10`}
                    />
                </div>
                <div className="flex gap-1 rounded-xl border border-surface-3 overflow-hidden">
                    {(['all', 'published', 'draft'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-2 text-sm font-medium transition-colors ${statusFilter === s
                                ? 'bg-primary text-white'
                                : 'text-text-secondary hover:bg-surface-1'
                                }`}
                        >
                            {s === 'all' ? labels.all : s === 'published' ? labels.published : labels.draft}
                        </button>
                    ))}
                </div>
                {/* Select-all + Export */}
                <button onClick={selectAll} className="btn btn-ghost text-xs" title={labels.selectAll}>
                    <CheckSquare className="w-4 h-4" />
                </button>
                <button onClick={handleExportCsv} disabled={isPending} className="btn btn-ghost text-xs" title={labels.exportCsv}>
                    <Download className="w-4 h-4" />
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            {/* Modal form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="glass-strong rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-lg text-text-primary">
                                {editingProduct ? labels.editProduct : labels.addProduct}
                            </h2>
                            <button onClick={resetForm} className="p-1 hover:bg-surface-1 rounded-lg">
                                <X className="w-5 h-5 text-text-muted" />
                            </button>
                        </div>
                        <div>
                            <label className={labelClass}>{labels.name} *</label>
                            <input
                                value={formTitle}
                                onChange={e => setFormTitle(e.target.value)}
                                className={inputClass}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className={labelClass}>{labels.description}</label>
                            <textarea
                                value={formDescription}
                                onChange={e => setFormDescription(e.target.value)}
                                className={`${inputClass} min-h-[80px] resize-y`}
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>{labels.price} ({defaultCurrency.toUpperCase()})</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formPrice}
                                    onChange={e => setFormPrice(e.target.value)}
                                    className={inputClass}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>{labels.category}</label>
                                <select
                                    value={formCategory}
                                    onChange={e => setFormCategory(e.target.value)}
                                    className={inputClass}
                                >
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
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleSubmit}
                                disabled={isPending || !formTitle.trim()}
                                className="btn btn-primary flex-1"
                            >
                                {isPending ? '...' : editingProduct ? labels.save : labels.create}
                            </button>
                            <button onClick={resetForm} className="btn btn-ghost">
                                {labels.cancel}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Product grid */}
            {filtered.length === 0 ? (
                <div className="glass rounded-2xl">
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Package className="w-8 h-8 text-text-muted" />
                        </div>
                        <h3 className="text-lg font-bold font-display text-text-primary mb-2">
                            {labels.noProducts}
                        </h3>
                        <p className="text-sm text-text-secondary leading-relaxed mb-6">
                            {labels.addProductHint || 'Create your first product to start selling. Add photos, prices, and descriptions.'}
                        </p>
                        <button
                            className="btn btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
                            disabled={!canAdd || isPending}
                            onClick={() => { resetForm(); setShowForm(true) }}
                        >
                            <Plus className="w-4 h-4" />
                            {labels.addProduct}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(product => (
                        <div key={product.id} className={`glass rounded-2xl overflow-hidden group hover:shadow-lg transition-shadow ${selectedIds.has(product.id) ? 'ring-2 ring-primary' : ''}`}>
                            {/* Thumbnail */}
                            <div className="aspect-[4/3] bg-surface-1 relative flex items-center justify-center">
                                {/* Selection checkbox */}
                                <button
                                    onClick={() => toggleSelect(product.id)}
                                    className="absolute top-2 left-2 z-10 p-1 rounded-md bg-surface-0/80 backdrop-blur-sm"
                                >
                                    {selectedIds.has(product.id)
                                        ? <CheckSquare className="w-4 h-4 text-primary" />
                                        : <Square className="w-4 h-4 text-text-muted" />
                                    }
                                </button>
                                {product.thumbnail ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={product.thumbnail}
                                        alt={product.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Package className="w-10 h-10 text-text-muted/40" />
                                )}
                                <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${product.status === 'published'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {product.status === 'published' ? labels.published : labels.draft}
                                </span>
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
                                {product.description && (
                                    <p className="text-xs text-text-muted mt-2 line-clamp-2">
                                        {product.description}
                                    </p>
                                )}
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
                                        onClick={() => openEdit(product)}
                                        className="btn btn-ghost text-xs flex-1"
                                        disabled={isPending}
                                    >
                                        ✏️ {labels.edit}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        className="btn btn-ghost text-xs text-red-500"
                                        disabled={isPending}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}
