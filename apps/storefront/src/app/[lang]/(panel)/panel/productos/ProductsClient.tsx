'use client'

/**
 * ProductsClient — Owner Panel Products Grid (SOTA rewrite)
 *
 * SOTA upgrades:
 * - confirm() → PanelConfirmDialog
 * - Emoji buttons (🟢📝✏️🗑️) → lucide icons (Eye/EyeOff, Pencil, Trash2)
 * - No animation → PageEntrance + ListStagger
 * - Static bulk bar → AnimatePresence with slide-in
 * - Inline status badge → PanelStatusBadge-style colors with dark mode
 * - whileTap on action buttons
 */

import { useState, useTransition, useOptimistic, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { Package, Plus, Search, X, Download, CheckSquare, Square, Trash2, Loader2, Pencil, Eye, EyeOff } from 'lucide-react'
import { updateProduct, removeProduct, bulkUpdateStatus, bulkDeleteProducts, exportProductsCsv } from './actions'
import type { AdminProductFull } from '@/lib/medusa/admin'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'
import PanelConfirmDialog, { useConfirmDialog } from '@/components/panel/PanelConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'
import { SotaFeatureGateWrapper } from '@/components/panel/sota/SotaFeatureGateWrapper'
import { SotaBentoGrid, SotaBentoItem } from '@/components/panel/sota/SotaBentoGrid'
import { SotaGlassCard } from '@/components/panel/sota/SotaGlassCard'

const ProductFormSlideOver = lazy(() => import('./ProductFormSlideOver'))

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
    stockMode?: string
    maxImagesPerProduct?: number
}

export default function ProductsClient({
    products,
    categories,
    productCount,
    maxProducts,
    canAdd,
    defaultCurrency,
    labels,
    stockMode = 'simple',
    maxImagesPerProduct = 10,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const toast = useToast()

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
    const [showForm, setShowForm] = useState(false)
    const [editingProduct, setEditingProduct] = useState<AdminProductFull | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())


    const deleteDialog = useConfirmDialog({
        title: labels.confirmDelete,
        description: labels.confirmDelete,
        confirmLabel: labels.delete,
        variant: 'danger',
    })

    const bulkDeleteDialog = useConfirmDialog({
        title: labels.bulkDelete,
        description: `${labels.bulkDelete} (${selectedIds.size})`,
        confirmLabel: labels.delete,
        variant: 'danger',
    })

    // ── useOptimistic: instant status toggle feedback ──
    // Tracks status overrides per product ID for instant UI updates
    const [optimisticStatuses, addOptimisticStatus] = useOptimistic(
        {} as Record<string, string>,
        (current: Record<string, string>, update: { id: string; status: string }) => ({
            ...current,
            [update.id]: update.status,
        })
    )

    // Helper: get effective status (optimistic override or original)
    const getEffectiveStatus = (product: AdminProductFull) =>
        optimisticStatuses[product.id] || product.status

    const filtered = products.filter(p => {
        const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase())
        const effectiveStatus = getEffectiveStatus(p)
        const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter
        return matchesSearch && matchesStatus
    })

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
        bulkDeleteDialog.confirm(() => {
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

    const openCreate = () => { setEditingProduct(null); setShowForm(true) }
    const openEdit = (product: AdminProductFull) => { setEditingProduct(product); setShowForm(true) }

    const handleDelete = (id: string) => {
        deleteDialog.confirm(() => {
            startTransition(async () => {
                const result = await removeProduct(id)
                if (result.success) { router.refresh(); toast.success('✓') }
                else { toast.error(result.error ?? 'Error') }
            })
        })
    }

    const handleToggleStatus = (product: AdminProductFull) => {
        const newStatus = getEffectiveStatus(product) === 'published' ? 'draft' : 'published'
        // Optimistic: update badge immediately
        addOptimisticStatus({ id: product.id, status: newStatus })

        startTransition(async () => {
            const result = await updateProduct(product.id, { status: newStatus })
            if (result.success) {
                router.refresh()
            } else {
                // useOptimistic auto-reverts when transition ends
                toast.error('Error updating status')
            }
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

    const formLabels = {
        createProduct: labels.addProduct,
        editProduct: labels.editProduct,
        save: labels.save,
        saveDraft: labels.draft,
        publish: labels.published,
        cancel: labels.cancel,
        delete: labels.delete,
        confirmDelete: labels.confirmDelete,
        media: '📷 Media',
        dragDrop: 'Arrastra imágenes aquí',
        orClick: 'o haz clic para seleccionar',
        maxSize: 'JPEG, PNG, WebP · Máx 10 MB',
        uploadingImage: 'Subiendo imagen...',
        basicInfo: 'Información básica',
        productName: labels.name,
        productNamePlaceholder: 'Nombre del producto',
        description: labels.description,
        descriptionPlaceholder: 'Describe tu producto...',
        status: labels.status,
        published: labels.published,
        draft: labels.draft,
        pricingVariants: 'Precios',
        price: labels.price,
        compareAtPrice: 'Precio comparativo',
        addOption: '+ Añadir opción',
        optionName: 'Nombre de opción',
        optionValues: 'Valores',
        optionPlaceholder: 'Ej: Talla, Color',
        sku: 'SKU',
        stock: 'Stock',
        manageStock: 'Gestionar inventario',
        details: 'Detalles',
        category: labels.category,
        noCategory: labels.noCategory,
        weight: 'Peso',
        weightUnit: 'kg',
        tags: 'Etiquetas',
        tagsPlaceholder: 'Añadir etiqueta...',
        seo: 'SEO',
        metaTitle: 'Meta título',
        metaDescription: 'Meta descripción',
        urlHandle: 'URL',
    }

    const inputClass = 'w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-inner text-sm focus:outline-none focus:ring-2 focus:ring-soft transition-all'

    return (
        <PageEntrance className="space-y-8">
            <PanelPageHeader
                title={labels.title}
                subtitle={`${labels.subtitle} · ${productCount} / ${maxProducts} ${labels.products}`}
                icon={<Package className="w-5 h-5" />}
                badge={productCount}
                action={
                    <SotaFeatureGateWrapper isLocked={!canAdd} flag="max_products_limit" variant="badge">
                        <button
                            className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                            disabled={isPending || !canAdd}
                            onClick={openCreate}
                        >
                            <Plus className="w-4 h-4" />
                            {labels.addProduct}
                        </button>
                    </SotaFeatureGateWrapper>
                }
            />

            <SotaBentoGrid>
                <SotaBentoItem colSpan={12}>
                    <div className="space-y-4">

            {/* ── Bulk action bar ── */}
            <AnimatePresence>
                {hasSelection && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                    >
                        <SotaGlassCard glowColor="none" className="px-4 py-3 flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-medium text-tx">
                            {selectedIds.size} {labels.selected}
                        </span>
                        <div className="flex gap-2 ml-auto">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleBulkStatus('published')}
                                disabled={isPending}
                                aria-label={labels.bulkPublish}
                                className="btn btn-ghost text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
                            >
                                <Eye className="w-3.5 h-3.5" /> {labels.bulkPublish}
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleBulkStatus('draft')}
                                disabled={isPending}
                                aria-label={labels.bulkDraft}
                                className="btn btn-ghost text-xs text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                            >
                                <EyeOff className="w-3.5 h-3.5" /> {labels.bulkDraft}
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleBulkDelete}
                                disabled={isPending}
                                aria-label={labels.bulkDelete}
                                className="btn btn-ghost text-xs text-red-500 inline-flex items-center gap-1 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> {labels.bulkDelete}
                            </motion.button>
                            <button onClick={deselectAll} aria-label={labels.deselectAll} className="btn btn-ghost text-xs inline-flex items-center gap-1 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med">
                                <X className="w-3.5 h-3.5" /> {labels.deselectAll}
                            </button>
                        </div>
                        </SotaGlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Counter + limit ── */}
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-tx-muted">
                {productCount} / {maxProducts} {labels.products}
                {!canAdd && <span className="text-red-500 ml-2">— {labels.maxReached}</span>}
            </motion.p>

            {/* ── Filters ── */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted" />
                    <input
                        type="text"
                        placeholder={labels.searchPlaceholder}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className={`${inputClass} pl-10`}
                    />
                </div>
                <div className="flex gap-1 bg-sf-0/50 backdrop-blur-md rounded-xl overflow-hidden p-1 border border-sf-3/30 shadow-inner">
                    {(['all', 'published', 'draft'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            aria-pressed={statusFilter === s}
                            className={`px-3 py-2 min-h-[40px] text-sm font-medium rounded-lg transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med ${statusFilter === s
                                ? 'text-white'
                                : 'text-tx-sec hover:bg-sf-1'
                                }`}
                        >
                            {statusFilter === s && (
                                <motion.div
                                    layoutId="product-status-filter"
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
                <button onClick={selectAll} aria-label={labels.selectAll} className="btn btn-ghost text-xs min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med" title={labels.selectAll}>
                    <CheckSquare className="w-4 h-4" />
                </button>
                <button onClick={handleExportCsv} disabled={isPending} aria-label={labels.exportCsv} className="btn btn-ghost text-xs min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med" title={labels.exportCsv}>
                    <Download className="w-4 h-4" />
                </button>
            </div>

            {/* ── Slide-over form ── */}
            {showForm && (
                <Suspense fallback={
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                }>
                    <ProductFormSlideOver
                        product={editingProduct}
                        categories={categories}
                        defaultCurrency={defaultCurrency}
                        labels={formLabels}
                        onClose={() => { setShowForm(false); setEditingProduct(null) }}
                        maxImagesPerProduct={maxImagesPerProduct}
                        stockMode={stockMode}
                    />
                </Suspense>
            )}

            {/* ── Product grid ── */}
            {filtered.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <SotaGlassCard glowColor="none" className="py-16">
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <Package className="w-8 h-8 text-tx-muted" strokeWidth={1.5} />
                            </div>
                        <h3 className="text-lg font-bold font-display text-tx mb-2">
                            {labels.noProducts}
                        </h3>
                        <p className="text-sm text-tx-sec leading-relaxed mb-6">
                            {labels.addProductHint || 'Create your first product to start selling.'}
                        </p>
                        <SotaFeatureGateWrapper isLocked={!canAdd} flag="max_products_limit" variant="badge">
                            <button
                                className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                                disabled={isPending || !canAdd}
                                onClick={openCreate}
                            >
                                <Plus className="w-4 h-4" />
                                {labels.addProduct}
                            </button>
                        </SotaFeatureGateWrapper>
                    </div>
                    </SotaGlassCard>
                </motion.div>
            ) : (
                <ListStagger className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(product => (
                        <StaggerItem key={product.id}>
                            <motion.div
                                whileHover={{ y: -2 }}
                            >
                                <SotaGlassCard glowColor="none" overflowHidden className="p-0 transition-shadow hover:shadow-lg h-full flex flex-col group">
                                    {/* Thumbnail */}
                                    <div
                                        className="aspect-[4/3] bg-sf-1 relative flex items-center justify-center cursor-pointer"
                                    onClick={() => openEdit(product)}
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleSelect(product.id) }}
                                        aria-label={selectedIds.has(product.id) ? labels.deselectAll : labels.selectAll}
                                        className="absolute top-2 left-2 z-10 p-1.5 rounded-md bg-sf-0/80 backdrop-blur-sm shadow-sm hover:bg-sf-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                    >
                                        {selectedIds.has(product.id)
                                            ? <CheckSquare className="w-4 h-4 text-brand" />
                                            : <Square className="w-4 h-4 text-tx-muted" />
                                        }
                                    </button>
                                    {product.thumbnail ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <Package className="w-10 h-10 text-tx-faint" />
                                    )}
                                    {(product.images?.length ?? 0) > 1 && (
                                        <span className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium bg-black/60 text-white backdrop-blur-sm">
                                            {product.images.length} imgs
                                        </span>
                                    )}
                                    <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${getEffectiveStatus(product) === 'published'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}>
                                        {getEffectiveStatus(product) === 'published' ? labels.published : labels.draft}
                                    </span>
                                </div>
                                {/* Info */}
                                <div className="p-4">
                                    <h3
                                        className="font-bold text-tx truncate cursor-pointer hover:text-brand transition-colors"
                                        onClick={() => openEdit(product)}
                                    >
                                        {product.title}
                                    </h3>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-lg font-bold text-brand">{getPrice(product)}</span>
                                        <span className="text-xs text-tx-muted">
                                            {product.categories?.[0]?.name || labels.noCategory}
                                        </span>
                                    </div>
                                    {product.description && (
                                        <p className="text-xs text-tx-muted mt-2 line-clamp-2">{product.description}</p>
                                    )}
                                    {(product.variants?.length ?? 0) > 1 && (
                                        <p className="text-xs text-brand mt-1">
                                            {product.variants.length} variantes
                                        </p>
                                    )}
                                    {/* Actions */}
                                    <div className="flex gap-1 mt-3 pt-3 border-t border-sf-2">
                                        <motion.button
                                            whileTap={{ scale: 0.93 }}
                                            onClick={() => handleToggleStatus(product)}
                                            className="p-2 min-h-[40px] rounded-lg hover:bg-sf-1 text-tx-muted hover:text-brand transition-colors flex-1 flex items-center justify-center gap-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                            disabled={isPending}
                                            aria-label={getEffectiveStatus(product) === 'published' ? labels.draft : labels.published}
                                        >
                                            {getEffectiveStatus(product) === 'published'
                                                ? <><EyeOff className="w-3.5 h-3.5" /> {labels.draft}</>
                                                : <><Eye className="w-3.5 h-3.5" /> {labels.published}</>
                                            }
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.93 }}
                                            onClick={() => openEdit(product)}
                                            className="p-2 min-h-[40px] rounded-lg hover:bg-sf-1 text-tx-muted hover:text-brand transition-colors flex-1 flex items-center justify-center gap-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                            disabled={isPending}
                                            aria-label={labels.edit}
                                        >
                                            <Pencil className="w-3.5 h-3.5" /> {labels.edit}
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.93 }}
                                            onClick={() => handleDelete(product.id)}
                                            className="p-2 min-h-[40px] rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-tx-muted hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                                            disabled={isPending}
                                            aria-label={labels.delete}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </motion.button>
                                    </div>
                                </div>
                                </SotaGlassCard>
                            </motion.div>
                        </StaggerItem>
                    ))}
                </ListStagger>
            )}

                    </div>
                </SotaBentoItem>
            </SotaBentoGrid>

            <PanelConfirmDialog {...deleteDialog.dialogProps} />
            <PanelConfirmDialog {...bulkDeleteDialog.dialogProps} />
        </PageEntrance>
    )
}
