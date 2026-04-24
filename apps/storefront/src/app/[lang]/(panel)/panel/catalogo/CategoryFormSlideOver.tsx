'use client'

/**
 * CategoryFormSlideOver — Category create/edit form
 *
 * Extracted from CatalogClient to reduce monolith size.
 * Renders inside a SlideOver panel for creating or editing categories.
 *
 * @module CategoryFormSlideOver
 * @locked 🟡 YELLOW — extracted component, stable interface
 */

import { Loader2 } from 'lucide-react'
import { SlideOver } from '@/components/panel/PanelAnimations'

interface CategoryItem {
    id: string
    name: string
    handle: string
    description: string | null
}

interface Labels {
    editCategory: string
    addCategory: string
    categoryName: string
    categoryDescription: string
    save: string
    create: string
    cancel: string
}

interface Props {
    isOpen: boolean
    onClose: () => void
    editingCategory: CategoryItem | null
    catName: string
    setCatName: (v: string) => void
    catDescription: string
    setCatDescription: (v: string) => void
    onSubmit: () => void
    isPending: boolean
    labels: Labels
}

const inputClass = 'w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-soft transition-all'
const labelClass = 'block text-xs font-semibold text-tx-muted uppercase tracking-wide mb-1.5'

export default function CategoryFormSlideOver({
    isOpen,
    onClose,
    editingCategory,
    catName,
    setCatName,
    catDescription,
    setCatDescription,
    onSubmit,
    isPending,
    labels,
}: Props) {
    return (
        <SlideOver isOpen={isOpen} onClose={onClose} title={editingCategory ? labels.editCategory : labels.addCategory}>
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
                    <button onClick={onSubmit} disabled={isPending || !catName.trim()} className="btn btn-primary flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2">
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {isPending ? '...' : editingCategory ? labels.save : labels.create}
                    </button>
                    <button onClick={onClose} className="btn btn-ghost min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med">{labels.cancel}</button>
                </div>
            </div>
        </SlideOver>
    )
}
