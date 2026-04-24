'use client'

/**
 * CatalogClient — Tabbed Products + Categories orchestrator
 *
 * Decomposed from the original 1087-line monolith into focused sub-components:
 *   - ProductsTab:               Product grid, search/filter, badges, pagination
 *   - CategoriesTab:             Category grid, empty state, CRUD actions
 *   - ProductFormSlideOverInline: Product create/edit form with image upload
 *   - CategoryFormSlideOver:      Category create/edit form
 *
 * This file retains:
 *   - Tab switching + animated transitions
 *   - All state management (product, category, form state)
 *   - All action handlers (CRUD, toggle, image upload/delete)
 *   - Confirm dialogs + price label sheet
 *
 * @module CatalogClient
 * @locked 🟡 YELLOW — orchestrator layer
 */

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { useLimitGuard } from '@/hooks/useLimitGuard'
import { Package, Layers } from 'lucide-react'
import { createProduct, updateProduct, removeProduct, uploadProductImage, removeProductImage } from '../productos/actions'
import { createCategory, editCategory, removeCategory } from '../categorias/actions'
import { toggleBadge } from '../insignias/actions'
import type { BadgeId } from '../insignias/badges'
import type { AdminProductFull } from '@/lib/medusa/admin'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { PageEntrance, SlideOver } from '@/components/panel/PanelAnimations'
import PanelConfirmDialog, { useConfirmDialog } from '@/components/panel/PanelConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'
import PriceLabelSheet, { type PriceLabelItem } from '@/components/panel/PriceLabelSheet'
import { medusaPricesToForm } from '@/components/panel/MultiPriceEditor'
import { isZeroDecimal } from '@/lib/i18n/currencies'
import type { LimitCheckResult } from '@/lib/limits'

// ── Extracted sub-components ──
import ProductsTab from './ProductsTab'
import CategoriesTab from './CategoriesTab'
import ProductFormSlideOverInline from './ProductFormSlideOverInline'
import CategoryFormSlideOver from './CategoryFormSlideOver'

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
    productLimitResult?: LimitCheckResult
    categoryCount: number
    maxCategories: number
    canAddCategory: boolean
    categoryLimitResult?: LimitCheckResult
    currentPage: number
    pageSize: number
    initialSearch: string
    initialStatus: 'all' | 'published' | 'draft'
    initialTab: 'productos' | 'categorias'
    defaultCurrency: string
    activeCurrencies: string[]
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
    productLimitResult,
    categoryCount,
    maxCategories,
    canAddCategory,
    categoryLimitResult,
    currentPage,
    pageSize,
    initialSearch,
    initialStatus,
    initialTab,
    defaultCurrency,
    activeCurrencies,
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
    const [formPrices, setFormPrices] = useState<Record<string, string>>({ [defaultCurrency]: '' })
    const [formCategory, setFormCategory] = useState('')
    const [formStatus, setFormStatus] = useState<'published' | 'draft'>('published')
    const [isUploading, setIsUploading] = useState(false)
    const [showLabels, setShowLabels] = useState(false)

    // ── Category state ──
    const [showCategoryForm, setShowCategoryForm] = useState(false)
    const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
    const [categoryError, setCategoryError] = useState<string | null>(null)
    const [catName, setCatName] = useState('')
    const [catDescription, setCatDescription] = useState('')

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

    // ── Query helpers ──
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
        setFormTitle(''); setFormDescription(''); setFormPrices({ [defaultCurrency]: '' })
        setFormCategory(''); setFormStatus('published')
        setEditingProduct(null); setShowProductForm(false); setProductError(null)
    }

    const openEditProduct = (product: AdminProductFull) => {
        setFormTitle(product.title)
        setFormDescription(product.description ?? '')
        const variantPrices = product.variants?.[0]?.prices ?? []
        setFormPrices(medusaPricesToForm(variantPrices))
        setFormCategory(product.categories?.[0]?.id ?? '')
        setFormStatus(product.status as 'published' | 'draft')
        setEditingProduct(product)
        setShowProductForm(true)
    }

    const handleProductSubmit = () => {
        startTransition(async () => {
            setProductError(null)
            const pricesArray = Object.entries(formPrices)
                .filter(([, val]) => val && val.trim() !== '' && parseFloat(val) >= 0)
                .map(([code, val]) => ({ currency: code, amount: parseFloat(val) }))

            if (editingProduct) {
                const result = await updateProduct(editingProduct.id, {
                    title: formTitle, description: formDescription, status: formStatus,
                    categoryId: formCategory || null,
                    prices: pricesArray.length > 0 ? pricesArray : undefined,
                    variantId: editingProduct.variants?.[0]?.id,
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
                    prices: pricesArray,
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

    const handleImageDelete = (imageUrl: string) => {
        if (!editingProduct) return
        startTransition(async () => {
            const result = await removeProductImage(editingProduct.id, imageUrl)
            if (result.success) { router.refresh(); toast.success('✓') }
            else { setProductError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
        })
    }

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

    // ── Price helper for label sheet ──
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

    // ── Tabs config ──
    const tabs = [
        { key: 'productos' as const, label: labels.tabProducts, icon: Package, count: productCount },
        { key: 'categorias' as const, label: labels.tabCategories, icon: Layers, count: categoryCount },
    ]

    return (
        <PageEntrance className="space-y-5">

            {/* ── Header ── */}
            <PanelPageHeader
                title={labels.catalogTitle}
                subtitle={labels.catalogSubtitle}
                icon={<Package className="w-5 h-5" />}
            />

            {/* ── Animated Tabs ── */}
            <div className="flex gap-1 bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-xl overflow-hidden w-fit p-1">
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
            {/* TAB CONTENT                                                    */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
                {activeTab === 'productos' && (
                    <ProductsTab
                        products={products}
                        badgeMap={badgeMap}
                        productCount={productCount}
                        maxProducts={maxProducts}
                        canAddProduct={canAddProduct}
                        productLimitResult={productLimitResult}
                        activeCurrencies={activeCurrencies}
                        search={search}
                        setSearch={setSearch}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        onApplySearch={applyProductSearch}
                        onAddClick={() => { resetProductForm(); setShowProductForm(true) }}
                        onEditClick={openEditProduct}
                        onDeleteClick={handleDeleteProduct}
                        onToggleStatus={handleToggleStatus}
                        onToggleBadge={handleToggleBadge}
                        onShowLabels={() => setShowLabels(true)}
                        productError={productError}
                        setProductError={setProductError}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        canGoPrev={canGoPrev}
                        canGoNext={canGoNext}
                        onPageChange={(page) => updateQuery({ page: String(page), tab: 'productos' })}
                        onFilterChange={updateQuery}
                        isPending={isPending}
                        labels={{
                            products: labels.products,
                            addProduct: labels.addProduct,
                            noProducts: labels.noProducts,
                            published: labels.published,
                            draft: labels.draft,
                            all: labels.all,
                            searchPlaceholder: labels.searchPlaceholder,
                            noCategory: labels.noCategory,
                            edit: labels.edit,
                            delete: labels.delete,
                            maxReached: labels.maxReached,
                            previous: labels.previous,
                            next: labels.next,
                            badgesLabel: labels.badgesLabel,
                            badgesAvailable: labels.badgesAvailable,
                        }}
                    />
                )}

                {activeTab === 'categorias' && (
                    <CategoriesTab
                        categories={categories}
                        categoryCount={categoryCount}
                        maxCategories={maxCategories}
                        canAddCategory={canAddCategory}
                        categoryLimitResult={categoryLimitResult}
                        categoryError={categoryError}
                        setCategoryError={setCategoryError}
                        onAddClick={() => { resetCategoryForm(); setShowCategoryForm(true) }}
                        onEditClick={openEditCategory}
                        onDeleteClick={handleDeleteCategory}
                        isPending={isPending}
                        labels={{
                            categories: labels.categories,
                            addCategory: labels.addCategory,
                            noCategories: labels.noCategories,
                            edit: labels.edit,
                            delete: labels.delete,
                            maxReached: labels.maxReached,
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ── Product Form SlideOver ── */}
            <ProductFormSlideOverInline
                isOpen={showProductForm}
                onClose={resetProductForm}
                editingProduct={editingProduct}
                formTitle={formTitle}
                setFormTitle={setFormTitle}
                formDescription={formDescription}
                setFormDescription={setFormDescription}
                formPrices={formPrices}
                setFormPrices={setFormPrices}
                formCategory={formCategory}
                setFormCategory={setFormCategory}
                formStatus={formStatus}
                setFormStatus={setFormStatus}
                categories={categories}
                activeCurrencies={activeCurrencies}
                defaultCurrency={defaultCurrency}
                onSubmit={handleProductSubmit}
                onImageUpload={handleImageUpload}
                onImageDelete={handleImageDelete}
                isPending={isPending}
                isUploading={isUploading}
                labels={{
                    editProduct: labels.editProduct,
                    addProduct: labels.addProduct,
                    name: labels.name,
                    description: labels.description,
                    price: labels.price,
                    category: labels.category,
                    noCategory: labels.noCategory,
                    status: labels.status,
                    published: labels.published,
                    draft: labels.draft,
                    images: labels.images,
                    dropzone: labels.dropzone,
                    dropzoneHint: labels.dropzoneHint,
                    uploading: labels.uploading,
                    saveFirst: labels.saveFirst,
                    save: labels.save,
                    create: labels.create,
                    cancel: labels.cancel,
                }}
            />

            {/* ── Category Form SlideOver ── */}
            <CategoryFormSlideOver
                isOpen={showCategoryForm}
                onClose={resetCategoryForm}
                editingCategory={editingCategory}
                catName={catName}
                setCatName={setCatName}
                catDescription={catDescription}
                setCatDescription={setCatDescription}
                onSubmit={handleCategorySubmit}
                isPending={isPending}
                labels={{
                    editCategory: labels.editCategory,
                    addCategory: labels.addCategory,
                    categoryName: labels.categoryName,
                    categoryDescription: labels.categoryDescription,
                    save: labels.save,
                    create: labels.create,
                    cancel: labels.cancel,
                }}
            />

            {/* ── Price Label SlideOver ── */}
            <SlideOver
                isOpen={showLabels}
                onClose={() => setShowLabels(false)}
                title="Price Labels"
            >
                <PriceLabelSheet
                    items={products.map((p): PriceLabelItem => {
                        const variant = p.variants?.[0]
                        return {
                            name: p.title,
                            price: getPrice(p),
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
