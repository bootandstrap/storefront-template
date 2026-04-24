'use client'

/**
 * ProductFormSlideOverInline — Product create/edit form with image upload
 *
 * Extracted from CatalogClient to reduce monolith size.
 * Handles product fields (title, description, price, category, status)
 * and image upload with drag-and-drop when editing.
 *
 * @module ProductFormSlideOverInline
 * @locked 🟡 YELLOW — extracted component, stable interface
 */

import { useState } from 'react'
import { Loader2, Upload, Trash2, ImageIcon, Eye, EyeOff } from 'lucide-react'
import { SlideOver } from '@/components/panel/PanelAnimations'
import MultiPriceEditor from '@/components/panel/MultiPriceEditor'
import type { AdminProductFull } from '@/lib/medusa/admin'

interface CategoryItem {
    id: string
    name: string
}

interface Labels {
    editProduct: string
    addProduct: string
    name: string
    description: string
    price: string
    category: string
    noCategory: string
    status: string
    published: string
    draft: string
    images: string
    dropzone: string
    dropzoneHint: string
    uploading: string
    saveFirst: string
    save: string
    create: string
    cancel: string
}

interface Props {
    isOpen: boolean
    onClose: () => void
    editingProduct: AdminProductFull | null
    formTitle: string
    setFormTitle: (v: string) => void
    formDescription: string
    setFormDescription: (v: string) => void
    formPrices: Record<string, string>
    setFormPrices: (v: Record<string, string>) => void
    formCategory: string
    setFormCategory: (v: string) => void
    formStatus: 'published' | 'draft'
    setFormStatus: (v: 'published' | 'draft') => void
    categories: CategoryItem[]
    activeCurrencies: string[]
    defaultCurrency: string
    onSubmit: () => void
    onImageUpload: (file: File) => Promise<void>
    onImageDelete: (url: string) => void
    isPending: boolean
    isUploading: boolean
    labels: Labels
}

const inputClass = 'w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-soft transition-all'
const labelClass = 'block text-xs font-semibold text-tx-muted uppercase tracking-wide mb-1.5'

export default function ProductFormSlideOverInline({
    isOpen,
    onClose,
    editingProduct,
    formTitle,
    setFormTitle,
    formDescription,
    setFormDescription,
    formPrices,
    setFormPrices,
    formCategory,
    setFormCategory,
    formStatus,
    setFormStatus,
    categories,
    activeCurrencies,
    defaultCurrency,
    onSubmit,
    onImageUpload,
    onImageDelete,
    isPending,
    isUploading,
    labels,
}: Props) {
    const [dragOver, setDragOver] = useState(false)

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file && file.type.startsWith('image/')) onImageUpload(file)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) onImageUpload(file)
        e.target.value = ''
    }

    return (
        <SlideOver isOpen={isOpen} onClose={onClose} title={editingProduct ? labels.editProduct : labels.addProduct}>
            <div className="space-y-4">
                <div>
                    <label className={labelClass}>{labels.name} *</label>
                    <input value={formTitle} onChange={e => setFormTitle(e.target.value)} className={inputClass} autoFocus />
                </div>
                <div>
                    <label className={labelClass}>{labels.description}</label>
                    <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} className={`${inputClass} min-h-[80px] resize-y`} rows={3} />
                </div>

                {/* Multi-currency price editor */}
                <MultiPriceEditor
                    prices={formPrices}
                    onChange={setFormPrices}
                    activeCurrencies={activeCurrencies}
                    defaultCurrency={defaultCurrency}
                    label={labels.price}
                    showWarnings={activeCurrencies.length > 1}
                    disabled={isPending}
                />

                <div>
                    <label className={labelClass}>{labels.category}</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className={inputClass}>
                        <option value="">{labels.noCategory}</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
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
                                    : 'bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm text-tx-sec hover:bg-sf-1'
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
                                    : 'bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm text-tx-sec hover:bg-sf-1'
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
                                    <div key={img.id} className="relative group w-20 h-20 rounded-lg overflow-hidden bg-sf-0/50 backdrop-blur-md border border-sf-3/30">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => onImageDelete(img.url)}
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
                    <button onClick={onSubmit} disabled={isPending || !formTitle.trim()} className="btn btn-primary flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2">
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {isPending ? '...' : editingProduct ? labels.save : labels.create}
                    </button>
                    <button onClick={onClose} className="btn btn-ghost min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med">{labels.cancel}</button>
                </div>
            </div>
        </SlideOver>
    )
}
