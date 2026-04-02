'use client'

/**
 * Categories Manager — Owner Panel (SOTA rewrite)
 *
 * Props match page.tsx: categories (id/name/handle/description/productCount),
 *   categoryCount, maxCategories, canAdd, labels
 * Actions: createCategory, editCategory, removeCategory
 *
 * Fixes:
 * - confirm() → PanelConfirmDialog
 * - Emoji buttons (✏️🗑️) → lucide icons
 * - No animation → PageEntrance + ListStagger + StaggerItem
 * - useI18n → labels prop from server
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { useLimitGuard } from '@/hooks/useLimitGuard'
import { createCategory, editCategory, removeCategory } from './actions'
import { FolderTree, Plus, Pencil, Trash2, Loader2, Tag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'
import PanelConfirmDialog, { useConfirmDialog } from '@/components/panel/PanelConfirmDialog'
import ClientFeatureGate from '@/components/ui/ClientFeatureGate'

interface Category {
    id: string
    name: string
    handle: string
    description: string | null
    productCount: number
}

interface Labels {
    title: string
    subtitle: string
    addCategory: string
    editCategory: string
    noCategories: string
    noCategoriesHint: string
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
    categories: Category[]
    canAdd: boolean
    categoryCount: number
    maxCategories: number
    labels: Labels
}

export default function CategoriesClient({ categories, canAdd, categoryCount, maxCategories, labels }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const toast = useToast()
    const { handleLimitError } = useLimitGuard()
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // ── Gate state ──
    const [gateData, setGateData] = useState({ isOpen: false, flag: '' })

    const handleFeatureClick = (canAccess: boolean, flag: string, action: () => void) => {
        if (!canAccess) {
            setGateData({ isOpen: true, flag })
        } else {
            action()
        }
    }

    const confirmDialog = useConfirmDialog({
        title: labels.confirmDelete,
        description: labels.confirmDelete,
        confirmLabel: labels.delete,
        variant: 'danger',
    })

    const [name, setName] = useState('')
    const [description, setDescription] = useState('')

    const resetForm = () => {
        setName(''); setDescription('')
        setEditingId(null); setShowForm(false); setError(null)
    }

    const openEdit = (cat: Category) => {
        setName(cat.name)
        setDescription(cat.description ?? '')
        setEditingId(cat.id)
        setShowForm(true)
    }

    const handleSubmit = () => {
        if (!name.trim()) {
            setError(labels.name + ' required')
            return
        }
        startTransition(async () => {
            const result = editingId
                ? await editCategory(editingId, { name, description: description || undefined })
                : await createCategory({ name, description: description || undefined })
            if (result.success) { resetForm(); router.refresh(); toast.success('✓') }
            else {
                const err = result.error ?? 'Error'
                setError(err)
                if (!handleLimitError(err, (k) => k)) toast.error(err)
            }
        })
    }

    const handleDelete = (id: string) => {
        confirmDialog.confirm(() => {
            startTransition(async () => {
                const result = await removeCategory(id)
                if (result.success) { router.refresh(); toast.success('✓') }
                else { setError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
            })
        })
    }

    const inputClass = 'w-full px-4 py-2.5 min-h-[44px] rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-soft transition-all'
    const labelClass = 'block text-xs font-semibold text-tx-muted uppercase tracking-wide mb-1.5'

    return (
        <PageEntrance className="space-y-5">
            <ClientFeatureGate
                isOpen={gateData.isOpen}
                onClose={() => setGateData({ ...gateData, isOpen: false })}
                flag={gateData.flag}
            />
            <PanelPageHeader
                title={labels.title}
                subtitle={labels.subtitle}
                icon={<FolderTree className="w-5 h-5" />}
                badge={categoryCount}
                action={
                    <button
                        className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                        disabled={isPending}
                        onClick={() => handleFeatureClick(canAdd, 'max_categories_limit', () => { resetForm(); setShowForm(true) })}
                    >
                        <Plus className="w-4 h-4" />
                        {labels.addCategory}
                    </button>
                }
            />

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-tx-muted">
                {categoryCount} / {maxCategories} {labels.categories}
                {!canAdd && <span className="text-red-500 ml-2">— {labels.maxReached}</span>}
            </motion.p>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Form ── */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        className="glass rounded-2xl p-6 space-y-4"
                    >
                        <h2 className="font-bold text-lg text-tx">
                            {editingId ? labels.editCategory : labels.addCategory}
                        </h2>
                        <div>
                            <label className={labelClass}>{labels.name}</label>
                            <input value={name} onChange={e => setName(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{labels.description}</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className={inputClass + ' min-h-[80px] resize-y'}
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={handleSubmit} disabled={isPending} className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2">
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isPending ? '...' : editingId ? labels.save : labels.create}
                            </button>
                            <button onClick={resetForm} className="btn btn-ghost min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med">{labels.cancel}</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Category List ── */}
            {categories.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-2xl"
                >
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <FolderTree className="w-8 h-8 text-tx-muted" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-bold font-display text-tx mb-2">
                            {labels.noCategories}
                        </h3>
                        <p className="text-sm text-tx-sec leading-relaxed mb-6">
                            {labels.noCategoriesHint}
                        </p>
                        <button
                            className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                            disabled={isPending}
                            onClick={() => handleFeatureClick(canAdd, 'max_categories_limit', () => { resetForm(); setShowForm(true) })}
                        >
                            <Plus className="w-4 h-4" />
                            {labels.addCategory}
                        </button>
                    </div>
                </motion.div>
            ) : (
                <ListStagger className="space-y-3">
                    {categories.map((category) => (
                        <StaggerItem key={category.id}>
                            <motion.div
                                whileHover={{ y: -1 }}
                                className="glass rounded-2xl p-4 transition-shadow hover:shadow-lg"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Icon */}
                                    <div className="w-10 h-10 rounded-xl bg-brand-subtle flex items-center justify-center flex-shrink-0">
                                        <Tag className="w-5 h-5 text-brand" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-tx truncate">{category.name}</h3>
                                        <p className="text-xs text-tx-muted mt-0.5">/{category.handle}</p>
                                        {category.description && (
                                            <p className="text-xs text-tx-sec mt-1 truncate">{category.description}</p>
                                        )}
                                    </div>

                                    {/* Product count */}
                                    <span className="text-xs bg-sf-2 text-tx-muted px-2.5 py-1 rounded-full font-medium flex-shrink-0">
                                        {category.productCount} {labels.productCount}
                                    </span>

                                    {/* Actions */}
                                    <div className="flex gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => openEdit(category)}
                                            aria-label={labels.edit}
                                            className="p-2 min-h-[36px] rounded-lg hover:bg-sf-1 text-tx-muted hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                            disabled={isPending}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(category.id)}
                                            aria-label={labels.delete}
                                            className="p-2 min-h-[36px] rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-tx-muted hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                                            disabled={isPending}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </StaggerItem>
                    ))}
                </ListStagger>
            )}

            <PanelConfirmDialog {...confirmDialog.dialogProps} />
        </PageEntrance>
    )
}
