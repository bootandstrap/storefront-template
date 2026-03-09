'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { Layers, Plus, X } from 'lucide-react'
import { createCategory, editCategory, removeCategory } from './actions'

interface CategoryItem {
    id: string
    name: string
    handle: string
    description: string | null
    productCount: number
}

interface CategoryLabels {
    title: string
    subtitle: string
    addCategory: string
    editCategory: string
    noCategories: string
    noCategoriesHint?: string
    name: string
    description: string
    confirmDelete: string
    categories: string
    save: string
    cancel: string
    create: string
    delete: string
    edit: string
    maxReached: string
    productCount: string
}

interface Props {
    categories: CategoryItem[]
    categoryCount: number
    maxCategories: number
    canAdd: boolean
    labels: CategoryLabels
}

export default function CategoriesClient({
    categories,
    categoryCount,
    maxCategories,
    canAdd,
    labels,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const toast = useToast()

    const [showForm, setShowForm] = useState(false)
    const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
    const [error, setError] = useState<string | null>(null)

    const [formName, setFormName] = useState('')
    const [formDescription, setFormDescription] = useState('')

    const resetForm = () => {
        setFormName('')
        setFormDescription('')
        setEditingCategory(null)
        setShowForm(false)
        setError(null)
    }

    const openEdit = (cat: CategoryItem) => {
        setFormName(cat.name)
        setFormDescription(cat.description ?? '')
        setEditingCategory(cat)
        setShowForm(true)
    }

    const handleSubmit = () => {
        startTransition(async () => {
            setError(null)
            if (editingCategory) {
                const result = await editCategory(editingCategory.id, {
                    name: formName,
                    description: formDescription,
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
                const result = await createCategory({
                    name: formName,
                    description: formDescription,
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
            const result = await removeCategory(id)
            if (result.success) { router.refresh(); toast.success('✓') }
            else { setError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
        })
    }

    const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'
    const labelClass = 'block text-sm font-medium text-text-secondary mb-1'

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
                        <Layers className="w-6 h-6 text-primary" />
                        {labels.title}
                        <span className="ml-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                            {categoryCount}
                        </span>
                    </h1>
                    <p className="text-text-muted mt-1">
                        {labels.subtitle} · {categoryCount} / {maxCategories} {labels.categories}
                        {!canAdd && <span className="text-red-500 ml-2">— {labels.maxReached}</span>}
                    </p>
                </div>
                <button
                    className="btn btn-primary flex items-center gap-2"
                    disabled={!canAdd || isPending}
                    onClick={() => { resetForm(); setShowForm(true) }}
                >
                    <Plus className="w-4 h-4" />
                    {labels.addCategory}
                </button>
            </div>


            {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            {/* Form modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="glass-strong rounded-2xl p-6 w-full max-w-md space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-lg text-text-primary">
                                {editingCategory ? labels.editCategory : labels.addCategory}
                            </h2>
                            <button onClick={resetForm} className="p-1 hover:bg-surface-1 rounded-lg">
                                <X className="w-5 h-5 text-text-muted" />
                            </button>
                        </div>
                        <div>
                            <label className={labelClass}>{labels.name} *</label>
                            <input
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                className={inputClass}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className={labelClass}>{labels.description}</label>
                            <textarea
                                value={formDescription}
                                onChange={e => setFormDescription(e.target.value)}
                                className={`${inputClass} min-h-[60px] resize-y`}
                                rows={2}
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleSubmit}
                                disabled={isPending || !formName.trim()}
                                className="btn btn-primary flex-1"
                            >
                                {isPending ? '...' : editingCategory ? labels.save : labels.create}
                            </button>
                            <button onClick={resetForm} className="btn btn-ghost">
                                {labels.cancel}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category list */}
            {categories.length === 0 ? (
                <div className="glass rounded-2xl">
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Layers className="w-8 h-8 text-text-muted" />
                        </div>
                        <h3 className="text-lg font-bold font-display text-text-primary mb-2">
                            {labels.noCategories}
                        </h3>
                        <p className="text-sm text-text-secondary leading-relaxed mb-6">
                            {labels.noCategoriesHint || 'Organize your products into categories to help customers find what they need.'}
                        </p>
                        <button
                            className="btn btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
                            disabled={!canAdd || isPending}
                            onClick={() => { resetForm(); setShowForm(true) }}
                        >
                            <Plus className="w-4 h-4" />
                            {labels.addCategory}
                        </button>
                    </div>
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
                                <span className="text-xs font-medium text-text-muted bg-surface-1 px-2 py-1 rounded-full">
                                    {cat.productCount} {labels.productCount}
                                </span>
                            </div>
                            {cat.description && (
                                <p className="text-sm text-text-muted mt-3 line-clamp-2">{cat.description}</p>
                            )}
                            <div className="flex gap-2 mt-4 pt-3 border-t border-surface-2">
                                <button
                                    onClick={() => openEdit(cat)}
                                    className="btn btn-ghost text-xs flex-1"
                                    disabled={isPending}
                                >
                                    ✏️ {labels.edit}
                                </button>
                                <button
                                    onClick={() => handleDelete(cat.id)}
                                    className="btn btn-ghost text-xs text-red-500 flex-1"
                                    disabled={isPending}
                                >
                                    🗑️ {labels.delete}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}
