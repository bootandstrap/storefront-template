'use client'

import { useState, useTransition, useRef, useCallback, type DragEvent, type ChangeEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import {
    X,
    Upload,
    Trash2,
    GripVertical,
    Plus,
    ChevronDown,
    ChevronUp,
    Image as ImageIcon,
    PackagePlus,
    Tag,
    Search as SearchIcon,
    Globe,
    Save,
    Eye,
    Loader2,
} from 'lucide-react'
import {
    createProduct,
    updateProduct,
    removeProduct,
    uploadProductImage,
    removeProductImage,
    updateProductStock,
} from './actions'
import type { AdminProductFull } from '@/lib/medusa/admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductFormLabels {
    createProduct: string
    editProduct: string
    save: string
    saveDraft: string
    publish: string
    cancel: string
    delete: string
    confirmDelete: string
    // Media
    media: string
    dragDrop: string
    orClick: string
    maxSize: string
    uploadingImage: string
    // Basic
    basicInfo: string
    productName: string
    productNamePlaceholder: string
    description: string
    descriptionPlaceholder: string
    status: string
    published: string
    draft: string
    // Pricing
    pricingVariants: string
    price: string
    compareAtPrice: string
    addOption: string
    optionName: string
    optionValues: string
    optionPlaceholder: string
    sku: string
    stock: string
    manageStock: string
    // Details
    details: string
    category: string
    noCategory: string
    weight: string
    weightUnit: string
    tags: string
    tagsPlaceholder: string
    // SEO
    seo: string
    metaTitle: string
    metaDescription: string
    urlHandle: string
}

interface ProductFormProps {
    product?: AdminProductFull | null
    categories: { id: string; name: string }[]
    defaultCurrency: string
    labels: ProductFormLabels
    onClose: () => void
    maxImagesPerProduct?: number
    stockMode?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
}

function formatPrice(amount: number): string {
    return (amount / 100).toFixed(2)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProductFormSlideOver({
    product,
    categories,
    defaultCurrency,
    labels,
    onClose,
    maxImagesPerProduct = 10,
    stockMode = 'simple',
}: ProductFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const toast = useToast()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const isEditing = !!product

    // ---- Form State ----
    const [title, setTitle] = useState(product?.title ?? '')
    const [description, setDescription] = useState(product?.description ?? '')
    const [status, setStatus] = useState<'published' | 'draft'>((product?.status as 'published' | 'draft') ?? 'draft')
    const [categoryId, setCategoryId] = useState(product?.categories?.[0]?.id ?? '')
    const [handle, setHandle] = useState(product?.handle ?? '')
    const [metaTitle, setMetaTitle] = useState((product?.metadata?.meta_title as string) ?? '')
    const [metaDescription, setMetaDescription] = useState((product?.metadata?.meta_description as string) ?? '')
    const [weight, setWeight] = useState(product?.metadata?.weight ? String(product.metadata.weight) : '')

    // Price (simple single-variant mode)
    const defaultPrice = product?.variants?.[0]?.prices?.[0]?.amount
    const [price, setPrice] = useState(defaultPrice ? formatPrice(defaultPrice) : '')
    const [stockQty, setStockQty] = useState(
        product?.variants?.[0]?.inventory_quantity?.toString() ?? '0'
    )
    const [skuValue, setSkuValue] = useState(product?.variants?.[0]?.sku ?? '')

    // Images
    const [images, setImages] = useState<{ id?: string; url: string; file?: File }[]>(
        product?.images?.map(img => ({ id: img.id, url: img.url })) ?? []
    )
    const [uploadingImage, setUploadingImage] = useState(false)
    const [dragOver, setDragOver] = useState(false)

    // Tags (comma-separated in metadata)
    const [tags, setTags] = useState<string[]>(
        Array.isArray(product?.metadata?.tags) ? (product.metadata.tags as string[]) : []
    )
    const [tagInput, setTagInput] = useState('')

    // Collapsible SEO section
    const [seoOpen, setSeoOpen] = useState(false)

    // Auto-generate handle from title
    useEffect(() => {
        if (!isEditing && title && !handle) {
            setHandle(slugify(title))
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, isEditing])

    // -----------------------------------------------------------------------
    // Image Handling
    // -----------------------------------------------------------------------

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const fileArray = Array.from(files).slice(0, maxImagesPerProduct - images.length)

        for (const file of fileArray) {
            if (!file.type.startsWith('image/')) continue
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`${file.name}: máx 10 MB`)
                continue
            }

            // Preview immediately
            const previewUrl = URL.createObjectURL(file)
            setImages(prev => [...prev, { url: previewUrl, file }])

            // Upload to server
            if (isEditing && product) {
                setUploadingImage(true)
                const formData = new FormData()
                formData.append('file', file)
                const result = await uploadProductImage(product.id, formData)
                setUploadingImage(false)

                if (!result.success) {
                    toast.error(result.error ?? 'Upload failed')
                    setImages(prev => prev.filter(img => img.url !== previewUrl))
                    URL.revokeObjectURL(previewUrl)
                } else {
                    // Replace preview with the actual URL on next refresh
                    router.refresh()
                }
            }
        }
    }, [images.length, maxImagesPerProduct, isEditing, product, toast, router])

    const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setDragOver(false)
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files)
        }
    }, [handleFiles])

    const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFiles(e.target.files)
            e.target.value = ''
        }
    }, [handleFiles])

    const handleRemoveImage = async (img: { id?: string; url: string; file?: File }, idx: number) => {
        if (isEditing && product && img.id) {
            const result = await removeProductImage(product.id, img.url)
            if (!result.success) {
                toast.error(result.error ?? 'Error')
                return
            }
        }
        setImages(prev => prev.filter((_, i) => i !== idx))
        if (img.file) URL.revokeObjectURL(img.url)
        if (isEditing) router.refresh()
    }

    // -----------------------------------------------------------------------
    // Tag Handling
    // -----------------------------------------------------------------------

    const addTag = () => {
        const newTag = tagInput.trim()
        if (newTag && !tags.includes(newTag)) {
            setTags(prev => [...prev, newTag])
        }
        setTagInput('')
    }

    const removeTag = (tag: string) => {
        setTags(prev => prev.filter(t => t !== tag))
    }

    // -----------------------------------------------------------------------
    // Submit
    // -----------------------------------------------------------------------

    const handleSubmit = (submitStatus: 'draft' | 'published') => {
        if (!title.trim()) {
            toast.error(labels.productName + ' *')
            return
        }

        startTransition(async () => {
            if (isEditing && product) {
                // Update product
                const result = await updateProduct(product.id, {
                    title: title.trim(),
                    description: description.trim() || undefined,
                    status: submitStatus,
                    categoryId: categoryId || null,
                    price: price ? parseFloat(price) : undefined,
                    currency: defaultCurrency,
                    variantId: product.variants?.[0]?.id,
                })

                if (!result.success) {
                    toast.error(result.error ?? 'Error')
                    return
                }

                // Update stock if changed
                if (stockMode === 'managed' && product.variants?.[0]?.id) {
                    const qty = parseInt(stockQty) || 0
                    if (qty !== (product.variants[0].inventory_quantity ?? 0)) {
                        await updateProductStock(product.id, product.variants[0].id, qty)
                    }
                }

                // Upload new images (not yet uploaded during creation)
                for (const img of images.filter(i => i.file && !i.id)) {
                    const formData = new FormData()
                    formData.append('file', img.file!)
                    await uploadProductImage(product.id, formData)
                }

                toast.success('✓')
                router.refresh()
                onClose()
            } else {
                // Create new product
                const result = await createProduct({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    price: parseFloat(price) || 0,
                    currency: defaultCurrency,
                    categoryId: categoryId || undefined,
                    status: submitStatus,
                    stockQuantity: stockMode === 'managed' ? parseInt(stockQty) || 0 : undefined,
                })

                if (!result.success) {
                    toast.error(result.error ?? 'Error')
                    return
                }

                toast.success('✓')
                router.refresh()
                onClose()
            }
        })
    }

    const handleDelete = () => {
        if (!product || !confirm(labels.confirmDelete)) return
        startTransition(async () => {
            const result = await removeProduct(product.id)
            if (result.success) {
                toast.success('✓')
                router.refresh()
                onClose()
            } else {
                toast.error(result.error ?? 'Error')
            }
        })
    }

    // -----------------------------------------------------------------------
    // Styles
    // -----------------------------------------------------------------------

    const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-sf-3 bg-sf-0 text-sm focus:outline-none focus:ring-2 focus:ring-soft focus:border-brand transition-all'
    const labelClass = 'block text-sm font-medium text-tx-sec mb-1.5'
    const sectionClass = 'rounded-2xl border border-sf-3 bg-glass p-5 space-y-4'

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Slide-over panel */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-glass-heavy backdrop-blur-2xl shadow-2xl flex flex-col animate-slide-in-right">

                {/* ── Sticky Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-sf-3 bg-glass-heavy backdrop-blur-xl sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-brand-subtle flex items-center justify-center">
                            <PackagePlus className="w-4 h-4 text-brand" />
                        </div>
                        <h2 className="text-lg font-bold text-tx">
                            {isEditing ? labels.editProduct : labels.createProduct}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-sf-1 transition-colors"
                    >
                        <X className="w-5 h-5 text-tx-muted" />
                    </button>
                </div>

                {/* ── Scrollable Content ── */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

                    {/* ═══ MEDIA SECTION ═══ */}
                    <div className={sectionClass}>
                        <h3 className="font-semibold text-tx flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-brand" />
                            {labels.media}
                        </h3>

                        {/* Drop Zone */}
                        <div
                            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                                relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                                ${dragOver
                                    ? 'border-brand bg-brand-subtle scale-[1.01]'
                                    : 'border-sf-3 hover:border-brand hover:bg-glass'
                                }
                                ${images.length >= maxImagesPerProduct ? 'opacity-50 pointer-events-none' : ''}
                            `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleFileInput}
                                className="hidden"
                            />
                            <Upload className="w-8 h-8 mx-auto text-tx-muted mb-2" />
                            <p className="text-sm font-medium text-tx-sec">{labels.dragDrop}</p>
                            <p className="text-xs text-tx-muted mt-1">{labels.orClick} · {labels.maxSize}</p>
                        </div>

                        {/* Image Thumbnails */}
                        {images.length > 0 && (
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                {images.map((img, idx) => (
                                    <div key={img.url + idx} className="relative group aspect-square rounded-xl overflow-hidden border border-sf-3 bg-sf-1">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={img.url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                        {idx === 0 && (
                                            <span className="absolute top-1 left-1 text-[10px] font-bold bg-brand text-white px-1.5 py-0.5 rounded-md">
                                                THUMB
                                            </span>
                                        )}
                                        {img.file && !img.id && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                                            </div>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRemoveImage(img, idx) }}
                                            className="absolute top-1 right-1 p-1 rounded-md bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {uploadingImage && (
                            <p className="text-xs text-brand flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {labels.uploadingImage}
                            </p>
                        )}
                    </div>

                    {/* ═══ BASIC INFO SECTION ═══ */}
                    <div className={sectionClass}>
                        <h3 className="font-semibold text-tx flex items-center gap-2">
                            <Tag className="w-4 h-4 text-brand" />
                            {labels.basicInfo}
                        </h3>

                        <div>
                            <label className={labelClass}>{labels.productName} *</label>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className={inputClass}
                                placeholder={labels.productNamePlaceholder}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className={labelClass}>{labels.description}</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className={`${inputClass} min-h-[100px] resize-y`}
                                placeholder={labels.descriptionPlaceholder}
                                rows={4}
                            />
                        </div>

                        {/* Status toggle pills */}
                        <div>
                            <label className={labelClass}>{labels.status}</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStatus('published')}
                                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-2 ${
                                        status === 'published'
                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                                            : 'border-sf-3 text-tx-sec hover:bg-sf-1'
                                    }`}
                                >
                                    <Eye className="w-4 h-4" />
                                    {labels.published}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatus('draft')}
                                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-2 ${
                                        status === 'draft'
                                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 shadow-sm'
                                            : 'border-sf-3 text-tx-sec hover:bg-sf-1'
                                    }`}
                                >
                                    📝 {labels.draft}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ═══ PRICING SECTION ═══ */}
                    <div className={sectionClass}>
                        <h3 className="font-semibold text-tx flex items-center gap-2">
                            💰 {labels.pricingVariants}
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>
                                    {labels.price} ({defaultCurrency.toUpperCase()}) *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-tx-muted">
                                        {defaultCurrency === 'eur' ? '€' : defaultCurrency === 'usd' ? '$' : defaultCurrency.toUpperCase()}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                        className={`${inputClass} pl-8`}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>{labels.sku}</label>
                                <input
                                    value={skuValue}
                                    onChange={e => setSkuValue(e.target.value)}
                                    className={inputClass}
                                    placeholder="ABC-001"
                                />
                            </div>
                        </div>

                        {/* Stock management */}
                        {stockMode === 'managed' && (
                            <div>
                                <label className={labelClass}>{labels.stock}</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={stockQty}
                                    onChange={e => setStockQty(e.target.value)}
                                    className={`${inputClass} max-w-[180px]`}
                                    placeholder="0"
                                />
                            </div>
                        )}
                    </div>

                    {/* ═══ DETAILS SECTION ═══ */}
                    <div className={sectionClass}>
                        <h3 className="font-semibold text-tx flex items-center gap-2">
                            📋 {labels.details}
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>{labels.category}</label>
                                <select
                                    value={categoryId}
                                    onChange={e => setCategoryId(e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="">{labels.noCategory}</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>{labels.weight}</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={weight}
                                        onChange={e => setWeight(e.target.value)}
                                        className={`${inputClass} pr-12`}
                                        placeholder="0"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-tx-muted">
                                        {labels.weightUnit || 'kg'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className={labelClass}>{labels.tags}</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {tags.map(tag => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-subtle text-brand text-xs font-medium"
                                    >
                                        {tag}
                                        <button
                                            onClick={() => removeTag(tag)}
                                            className="hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') { e.preventDefault(); addTag() }
                                        if (e.key === ',' || e.key === 'Tab') { e.preventDefault(); addTag() }
                                    }}
                                    className={`${inputClass} flex-1`}
                                    placeholder={labels.tagsPlaceholder}
                                />
                                <button
                                    onClick={addTag}
                                    disabled={!tagInput.trim()}
                                    className="px-3 py-2 rounded-xl bg-brand-subtle text-brand text-sm font-medium hover:bg-brand-muted transition-colors disabled:opacity-40"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ═══ SEO SECTION (collapsible) ═══ */}
                    <div className={sectionClass}>
                        <button
                            onClick={() => setSeoOpen(!seoOpen)}
                            className="w-full flex items-center justify-between"
                        >
                            <h3 className="font-semibold text-tx flex items-center gap-2">
                                <Globe className="w-4 h-4 text-brand" />
                                {labels.seo}
                            </h3>
                            {seoOpen
                                ? <ChevronUp className="w-4 h-4 text-tx-muted" />
                                : <ChevronDown className="w-4 h-4 text-tx-muted" />
                            }
                        </button>

                        {seoOpen && (
                            <div className="space-y-4 pt-2">
                                <div>
                                    <label className={labelClass}>{labels.metaTitle}</label>
                                    <input
                                        value={metaTitle}
                                        onChange={e => setMetaTitle(e.target.value)}
                                        className={inputClass}
                                        placeholder={title || labels.metaTitle}
                                        maxLength={70}
                                    />
                                    <p className="text-xs text-tx-muted mt-1 text-right">{metaTitle.length}/70</p>
                                </div>
                                <div>
                                    <label className={labelClass}>{labels.metaDescription}</label>
                                    <textarea
                                        value={metaDescription}
                                        onChange={e => setMetaDescription(e.target.value)}
                                        className={`${inputClass} min-h-[60px] resize-y`}
                                        placeholder={description || labels.metaDescription}
                                        maxLength={160}
                                        rows={2}
                                    />
                                    <p className="text-xs text-tx-muted mt-1 text-right">{metaDescription.length}/160</p>
                                </div>
                                <div>
                                    <label className={labelClass}>{labels.urlHandle}</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-tx-muted">/productos/</span>
                                        <input
                                            value={handle}
                                            onChange={e => setHandle(slugify(e.target.value))}
                                            className={`${inputClass} pl-[85px]`}
                                        />
                                    </div>
                                </div>

                                {/* SEO Preview */}
                                {(metaTitle || title) && (
                                    <div className="rounded-xl bg-sf-1 p-4 space-y-1">
                                        <p className="text-xs text-tx-muted">Vista previa</p>
                                        <p className="text-sm font-medium text-[#1a0dab] truncate">
                                            {metaTitle || title}
                                        </p>
                                        <p className="text-xs text-emerald-700 truncate">
                                            tienda.com/productos/{handle || slugify(title)}
                                        </p>
                                        {(metaDescription || description) && (
                                            <p className="text-xs text-tx-muted line-clamp-2">
                                                {metaDescription || description}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Sticky Footer ── */}
                <div className="border-t border-sf-3 px-6 py-4 bg-glass-heavy backdrop-blur-xl flex items-center gap-3">
                    {isEditing && (
                        <button
                            onClick={handleDelete}
                            disabled={isPending}
                            className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title={labels.delete}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}

                    <div className="flex-1" />

                    <button
                        onClick={() => handleSubmit('draft')}
                        disabled={isPending || !title.trim()}
                        className="px-5 py-2.5 rounded-xl border border-sf-3 text-sm font-medium text-tx-sec hover:bg-sf-1 transition-all disabled:opacity-40 flex items-center gap-2"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {labels.saveDraft}
                    </button>

                    <button
                        onClick={() => handleSubmit('published')}
                        disabled={isPending || !title.trim()}
                        className="px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand transition-all disabled:opacity-40 shadow-lg shadow-brand-soft flex items-center gap-2"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        {labels.publish}
                    </button>
                </div>
            </div>
        </>
    )
}
