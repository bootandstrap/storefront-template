'use client'

/**
 * CatalogClient — Tabbed Products + Categories with inline badges (SOTA rewrite)
 *
 * SOTA upgrades:
 * - confirm() → PanelConfirmDialog
 * - Emoji buttons (📝🟢✏️🗑️) → lucide icons (Eye/EyeOff, Pencil, Trash2, Tag)
 * - No animation → PageEntrance + ListStagger
 * - Static tab bar → animated tabs with layoutId
 * - Inline `fixed` modals → SlideOver
 * - Static error div → AnimatePresence error/success banners
 * - Basic empty state → premium empty state
 * - Static badge area → AnimatePresence collapsible
 * - Status badges → dark mode compatible
 */

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { useLimitGuard } from '@/hooks/useLimitGuard'
import {
    Package, Plus, Search, X, Layers, ChevronDown, ChevronUp,
    Upload, Trash2, ImageIcon, Eye, EyeOff, Pencil, Tag, Loader2,
    ChevronLeft, ChevronRight, Barcode,
} from 'lucide-react'
import { createProduct, updateProduct, removeProduct, uploadProductImage, removeProductImage } from '../productos/actions'
import { createCategory, editCategory, removeCategory } from '../categorias/actions'
import { toggleBadge } from '../insignias/actions'
import { AVAILABLE_BADGES, type BadgeId } from '../insignias/badges'
import type { AdminProductFull } from '@/lib/medusa/admin'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'
import PanelConfirmDialog, { useConfirmDialog } from '@/components/panel/PanelConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'
import { SlideOver } from '@/components/panel/PanelAnimations'
import PriceLabelSheet, { type PriceLabelItem } from '@/components/panel/PriceLabelSheet'
import ClientFeatureGate from '@/components/ui/ClientFeatureGate'

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
    const { handleLimitError } = useLimitGuard()

    const [activeTab, setActiveTab] = useState<'productos' | 'categorias'>(initialTab)

    // ── Product state ──
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
    const [showLabels, setShowLabels] = useState(false)

    // ── Category state ──
    const [showCategoryForm, setShowCategoryForm] = useState(false)
    const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
    const [categoryError, setCategoryError] = useState<string | null>(null)
    const [catName, setCatName] = useState('')
    const [catDescription, setCatDescription] = useState('')

    // ── Gate state ──
    const [gateData, setGateData] = useState({ isOpen: false, flag: '' })

    const handleFeatureClick = (canAccess: boolean, flag: string, action: () => void) => {
        if (!canAccess) {
            setGateData({ isOpen: true, flag })
        } else {
            action()
        }
    }

    // ── Confirm dialogs ──
    const productDeleteDialog = useConfirmDialog({
        title: labels.confirmDelete,
        description: labels.confirmDelete,
        confirmLabel: labels.delete,
        variant: 'danger',
    })
    const categoryDeleteDialog = useConfirmDialog({
        title: labels.confirmDeleteCategory,
        description: labels.confirmDeleteCategory,
        confirmLabel: labels.delete,
        variant: 'danger',
    })

    const totalPages = Math.max(1, Math.ceil(productCount / pageSize))
    const canGoPrev = currentPage > 1
    const canGoNext = currentPage < totalPages

    const updateQuery = (updates: Record<string, string | undefined>) => {
        const next = new URLSearchParams(searchParams.toString())
        for (const [key, value] of Object.entries(updates)) {
            if (!value) next.delete(key)
            else next.set(key, value)
        }
        const query = next.toString()
        router.push(query ? `${pathname}?${query}` : pathname)
    }

    const applyProductSearch = () => {
        const q = search.trim()
        updateQuery({ q: q || undefined, page: '1', tab: 'productos' })
    }

    // ── Product helpers ──

    const resetProductForm = () => {
        setFormTitle(''); setFormDescription(''); setFormPrice('')
        setFormCategory(''); setFormStatus('published')
        setEditingProduct(null); setShowProductForm(false); setProductError(null)
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
                    title: formTitle, description: formDescription, status: formStatus,
                    categoryId: formCategory || null, price: formPrice ? parseFloat(formPrice) : undefined,
                    currency: defaultCurrency, variantId: editingProduct.variants?.[0]?.id,
                })
                if (result.success) { resetProductForm(); router.refresh(); toast.success('✓') }
                else {
                    const err = result.error ?? 'Error'
                    setProductError(err)
                    if (!handleLimitError(err, (k) => k)) toast.error(err)
                }
            } else {
                const result = await createProduct({
                    title: formTitle, description: formDescription,
                    price: parseFloat(formPrice) || 0, currency: defaultCurrency,
                    categoryId: formCategory || undefined, status: formStatus,
                })
                if (result.success) { resetProductForm(); router.refresh(); toast.success('✓') }
                else {
                    const err = result.error ?? 'Error'
                    setProductError(err)
                    if (!handleLimitError(err, (k) => k)) toast.error(err)
                }
            }
        })
    }

    const handleDeleteProduct = (id: string) => {
        productDeleteDialog.confirm(() => {
            startTransition(async () => {
                const result = await removeProduct(id)
                if (result.success) { router.refresh(); toast.success('✓') }
                else { setProductError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
            })
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
            style: 'currency', currency: price.currency_code,
        }).format(price.amount / 100)
    }

    // ── Image handlers ──
    const handleImageUpload = async (file: File) => {
        if (!editingProduct) return
        setIsUploading(true); setProductError(null)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const result = await uploadProductImage(editingProduct.id, formData)
            if (result.success) { router.refresh(); toast.success(labels.imageAdded) }
            else {
                    const err = result.error ?? 'Upload failed'
                    setProductError(err)
                    if (!handleLimitError(err, (k) => k)) toast.error(err)
                }
        } finally { setIsUploading(false) }
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
        e.preventDefault(); setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file && file.type.startsWith('image/')) handleImageUpload(file)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleImageUpload(file)
        e.target.value = ''
    }

    const filtered = products

    // ── Category helpers ──

    const resetCategoryForm = () => {
        setCatName(''); setCatDescription('')
        setEditingCategory(null); setShowCategoryForm(false); setCategoryError(null)
    }

    const openEditCategory = (cat: CategoryItem) => {
        setCatName(cat.name); setCatDescription(cat.description ?? '')
        setEditingCategory(cat); setShowCategoryForm(true)
    }

    const handleCategorySubmit = () => {
        startTransition(async () => {
            setCategoryError(null)
            if (editingCategory) {
                const result = await editCategory(editingCategory.id, {
                    name: catName, description: catDescription,
                })
                if (result.success) { resetCategoryForm(); router.refresh(); toast.success('✓') }
                else { setCategoryError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
            } else {
                const result = await createCategory({
                    name: catName, description: catDescription,
                })
                if (result.success) { resetCategoryForm(); router.refresh(); toast.success('✓') }
                else {
                    const err = result.error ?? 'Error'
                    setCategoryError(err)
                    if (!handleLimitError(err, (k) => k)) toast.error(err)
                }
            }
        })
    }

    const handleDeleteCategory = (id: string) => {
        categoryDeleteDialog.confirm(() => {
            startTransition(async () => {
                const result = await removeCategory(id)
                if (result.success) { router.refresh(); toast.success('✓') }
                else { setCategoryError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
            })
        })
    }

    // ── Shared styles ──
    const inputClass = 'w-full px-4 py-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-soft transition-all'
    const labelClass = 'block text-xs font-semibold text-tx-muted uppercase tracking-wide mb-1.5'

    // ── Tabs config ──
    const tabs = [
        { key: 'productos' as const, label: labels.tabProducts, icon: Package, count: productCount },
        { key: 'categorias' as const, label: labels.tabCategories, icon: Layers, count: categoryCount },
    ]

    return (
        <PageEntrance className="space-y-5">
            <ClientFeatureGate
                isOpen={gateData.isOpen}
                onClose={() => setGateData({ ...gateData, isOpen: false })}
                flag={gateData.flag}
            />

            {/* ── Header ── */}
            <PanelPageHeader
                title={labels.catalogTitle}
                subtitle={labels.catalogSubtitle}
                icon={<Package className="w-5 h-5" />}
            />

            {/* ── Animated Tabs ── */}
            <div className="flex gap-1 glass rounded-xl overflow-hidden w-fit p-1">
                {tabs.map(tab => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.key}
                            onClick={() => {
                                setActiveTab(tab.key)
                                updateQuery({ tab: tab.key })
                            }}
                            aria-pressed={activeTab === tab.key}
                            className={`px-5 py-2.5 min-h-[44px] text-sm font-medium transition-colors flex items-center gap-2 rounded-lg relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-1 ${
                                activeTab === tab.key
                                    ? 'text-white'
                                    : 'text-tx-sec hover:bg-sf-1'
                            }`}
                        >
                            {activeTab === tab.key && (
                                <motion.div
                                    layoutId="catalog-tab-active"
                                    className="absolute inset-0 bg-brand rounded-lg"
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                <span className="text-xs opacity-70">({tab.count})</span>
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* PRODUCTS TAB                                                   */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
                {activeTab === 'productos' && (
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
                            <p className="text-xs text-tx-muted">
                                {productCount} / {maxProducts} {labels.products}
                                {!canAddProduct && <span className="text-red-500 ml-2">— {labels.maxReached}</span>}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    className="btn glass flex items-center gap-2 min-h-[44px] text-sm font-medium text-tx-sec hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                                    disabled={products.length === 0}
                                    onClick={() => setShowLabels(true)}
                                    title="Print price labels"
                                >
                                    <Barcode className="w-4 h-4" />
                                    <span className="hidden sm:inline">Labels</span>
                                </button>
                                <button
                                    className="btn btn-primary flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                                    disabled={isPending}
                                    onClick={() => handleFeatureClick(canAddProduct, 'max_products_limit', () => { resetProductForm(); setShowProductForm(true) })}
                                >
                                    <Plus className="w-4 h-4" />
                                    {labels.addProduct}
                                </button>
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
                                    onKeyDown={e => { if (e.key === 'Enter') applyProductSearch() }}
                                    aria-label={labels.searchPlaceholder}
                                    className={`${inputClass} pl-10 min-h-[44px]`}
                                />
                            </div>
                            <div className="flex gap-1 glass rounded-xl overflow-hidden p-1">
                                {(['all', 'published', 'draft'] as const).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => {
                                            setStatusFilter(s)
                                            updateQuery({ status: s === 'all' ? undefined : s, page: '1', tab: 'productos' })
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
                        {filtered.length === 0 ? (
                            <div className="glass rounded-2xl">
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
                                    <button
                                        className="btn btn-primary inline-flex items-center gap-2"
                                        disabled={isPending}
                                        onClick={() => handleFeatureClick(canAddProduct, 'max_products_limit', () => { resetProductForm(); setShowProductForm(true) })}
                                    >
                                        <Plus className="w-4 h-4" />
                                        {labels.addProduct}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <ListStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filtered.map(product => {
                                    const productBadges = badgeMap[product.id] || []
                                    const isExpanded = expandedBadges === product.id

                                    return (
                                        <StaggerItem key={product.id}>
                                            <motion.div
                                                whileHover={{ y: -2 }}
                                                className="glass rounded-2xl overflow-hidden group transition-shadow hover:shadow-lg"
                                            >
                                                {/* Thumbnail */}
                                                <div className="aspect-[4/3] bg-sf-1 relative flex items-center justify-center cursor-pointer" onClick={() => openEditProduct(product)}>
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
                                                    <h3 className="font-bold text-tx truncate cursor-pointer hover:text-brand transition-colors" onClick={() => openEditProduct(product)}>{product.title}</h3>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <span className="text-lg font-bold text-brand">{getPrice(product)}</span>
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
                                                                                    onClick={() => handleToggleBadge(product.id, badge.id, isEnabled)}
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
                                                            onClick={() => handleToggleStatus(product)}
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
                                                            onClick={() => openEditProduct(product)}
                                                            className="p-2 min-h-[40px] rounded-lg hover:bg-sf-1 text-tx-muted hover:text-brand transition-colors flex-1 flex items-center justify-center gap-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                                            disabled={isPending}
                                                            aria-label={labels.edit}
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" /> {labels.edit}
                                                        </motion.button>
                                                        <motion.button
                                                            whileTap={{ scale: 0.93 }}
                                                            onClick={() => handleDeleteProduct(product.id)}
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
                        {productCount > pageSize && (
                            <div className="flex items-center justify-between pt-2">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => updateQuery({ page: String(currentPage - 1), tab: 'productos' })}
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
                                    onClick={() => updateQuery({ page: String(currentPage + 1), tab: 'productos' })}
                                    disabled={!canGoNext}
                                    className="btn btn-ghost inline-flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {labels.next}
                                    <ChevronRight className="w-4 h-4" />
                                </motion.button>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* CATEGORIES TAB                                                 */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                {activeTab === 'categorias' && (
                    <motion.div
                        key="categories"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                    >
                        {/* Toolbar */}
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <p className="text-xs text-tx-muted">
                                {categoryCount} / {maxCategories} {labels.categories}
                                {!canAddCategory && <span className="text-red-500 ml-2">— {labels.maxReached}</span>}
                            </p>
                            <button
                                className="btn btn-primary flex items-center gap-2"
                                disabled={isPending}
                                onClick={() => handleFeatureClick(canAddCategory, 'max_categories_limit', () => { resetCategoryForm(); setShowCategoryForm(true) })}
                            >
                                <Plus className="w-4 h-4" />
                                {labels.addCategory}
                            </button>
                        </div>

                        {/* Error banner */}
                        <AnimatePresence>
                            {categoryError && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between"
                                >
                                    <span>{categoryError}</span>
                                    <button onClick={() => setCategoryError(null)} aria-label="Dismiss error" className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                                        <X className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Category grid */}
                        {categories.length === 0 ? (
                            <div className="glass rounded-2xl">
                                <div className="empty-state">
                                    <div className="empty-state-icon">
                                        <Layers className="w-8 h-8 text-tx-muted" strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-lg font-bold font-display text-tx mb-2">
                                        {labels.noCategories}
                                    </h3>
                                    <p className="text-sm text-tx-sec leading-relaxed mb-6">
                                        {labels.noCategories}
                                    </p>
                                    <button
                                        className="btn btn-primary inline-flex items-center gap-2"
                                        disabled={isPending}
                                        onClick={() => handleFeatureClick(canAddCategory, 'max_categories_limit', () => { resetCategoryForm(); setShowCategoryForm(true) })}
                                    >
                                        <Plus className="w-4 h-4" />
                                        {labels.addCategory}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <ListStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {categories.map(cat => (
                                    <StaggerItem key={cat.id}>
                                        <motion.div
                                            whileHover={{ y: -2 }}
                                            className="glass rounded-2xl p-5 transition-shadow hover:shadow-lg"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 rounded-xl bg-brand-subtle text-brand">
                                                        <Layers className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-tx">{cat.name}</h3>
                                                        <p className="text-xs text-tx-muted mt-0.5">/{cat.handle}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            {cat.description && (
                                                <p className="text-sm text-tx-muted mt-3 line-clamp-2">{cat.description}</p>
                                            )}
                                            <div className="flex gap-1 mt-4 pt-3 border-t border-sf-2">
                                                <motion.button
                                                    whileTap={{ scale: 0.93 }}
                                                    onClick={() => openEditCategory(cat)}
                                                    className="p-2 min-h-[40px] rounded-lg hover:bg-sf-1 text-tx-muted hover:text-brand transition-colors flex-1 flex items-center justify-center gap-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                                    disabled={isPending}
                                                    aria-label={`${labels.edit} ${cat.name}`}
                                                >
                                                    <Pencil className="w-3.5 h-3.5" /> {labels.edit}
                                                </motion.button>
                                                <motion.button
                                                    whileTap={{ scale: 0.93 }}
                                                    onClick={() => handleDeleteCategory(cat.id)}
                                                    className="p-2 min-h-[40px] rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-tx-muted hover:text-red-500 transition-colors flex-1 flex items-center justify-center gap-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                                                    disabled={isPending}
                                                    aria-label={`${labels.delete} ${cat.name}`}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> {labels.delete}
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    </StaggerItem>
                                ))}
                            </ListStagger>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Product Form SlideOver ── */}
            <SlideOver isOpen={showProductForm} onClose={resetProductForm} title={editingProduct ? labels.editProduct : labels.addProduct}>
                <div className="space-y-4">
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
                                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all inline-flex items-center justify-center gap-2 ${
                                    formStatus === 'published'
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-800'
                                        : 'glass text-tx-sec hover:bg-sf-1'
                                }`}
                            >
                                <Eye className="w-4 h-4" />
                                {labels.published}
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormStatus('draft')}
                                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all inline-flex items-center justify-center gap-2 ${
                                    formStatus === 'draft'
                                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 ring-1 ring-amber-300 dark:ring-amber-800'
                                        : 'glass text-tx-sec hover:bg-sf-1'
                                }`}
                            >
                                <EyeOff className="w-4 h-4" />
                                {labels.draft}
                            </button>
                        </div>
                    </div>

                    {/* Image upload section — only when editing */}
                    {editingProduct && (
                        <div>
                            <label className={labelClass}>{labels.images}</label>
                            {editingProduct.images && editingProduct.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {editingProduct.images.map(img => (
                                        <div key={img.id} className="relative group w-20 h-20 rounded-lg overflow-hidden glass">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handleImageDelete(img.url)}
                                                disabled={isPending}
                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div
                                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
                                    dragOver ? 'border-brand bg-brand-subtle' : 'border-sf-3 hover:border-brand'
                                } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={isUploading}
                                />
                                <Upload className="w-6 h-6 mx-auto text-tx-muted mb-1" />
                                <p className="text-sm text-tx-sec">
                                    {isUploading ? labels.uploading : labels.dropzone}
                                </p>
                                <p className="text-xs text-tx-muted mt-0.5">{labels.dropzoneHint}</p>
                            </div>
                        </div>
                    )}

                    {!editingProduct && (
                        <p className="text-xs text-tx-muted flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5" />
                            {labels.saveFirst}
                        </p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button onClick={handleProductSubmit} disabled={isPending || !formTitle.trim()} className="btn btn-primary flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2">
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {isPending ? '...' : editingProduct ? labels.save : labels.create}
                        </button>
                        <button onClick={resetProductForm} className="btn btn-ghost min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med">{labels.cancel}</button>
                    </div>
                </div>
            </SlideOver>

            {/* ── Category Form SlideOver ── */}
            <SlideOver isOpen={showCategoryForm} onClose={resetCategoryForm} title={editingCategory ? labels.editCategory : labels.addCategory}>
                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>{labels.categoryName} *</label>
                        <input value={catName} onChange={e => setCatName(e.target.value)} className={inputClass} autoFocus />
                    </div>
                    <div>
                        <label className={labelClass}>{labels.categoryDescription}</label>
                        <textarea value={catDescription} onChange={e => setCatDescription(e.target.value)} className={`${inputClass} min-h-[60px] resize-y`} rows={2} />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleCategorySubmit} disabled={isPending || !catName.trim()} className="btn btn-primary flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2">
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {isPending ? '...' : editingCategory ? labels.save : labels.create}
                        </button>
                        <button onClick={resetCategoryForm} className="btn btn-ghost min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med">{labels.cancel}</button>
                    </div>
                </div>
            </SlideOver>

            {/* ── Price Label SlideOver ── */}
            <SlideOver
                isOpen={showLabels}
                onClose={() => setShowLabels(false)}
                title="Price Labels"
            >
                <PriceLabelSheet
                    items={products.map((p): PriceLabelItem => {
                        const variant = p.variants?.[0]
                        const price = variant?.prices?.[0]
                        return {
                            name: p.title,
                            price: price ? new Intl.NumberFormat(undefined, { style: 'currency', currency: price.currency_code }).format(price.amount / 100) : '—',
                            sku: variant?.sku ?? '',
                            variant: variant?.title && variant.title !== 'Default Variant' ? variant.title : undefined,
                        }
                    })}
                    onPrint={() => setShowLabels(false)}
                />
            </SlideOver>

            {/* ── Confirm Dialogs ── */}
            <PanelConfirmDialog {...productDeleteDialog.dialogProps} />
            <PanelConfirmDialog {...categoryDeleteDialog.dialogProps} />
        </PageEntrance>
    )
}
