'use client'

/**
 * CMS Pages — Owner Panel (SOTA rewrite)
 *
 * Fixes:
 * - confirm() → PanelConfirmDialog
 * - Raw SVG empty state → lucide icon + animated empty state
 * - No animation → PageEntrance + ListStagger + StaggerItem
 * - Instant form → AnimatePresence
 * - Inline publish badge → animated toggle
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { useI18n } from '@/lib/i18n/provider'
import { FileText, Plus, Pencil, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { createPage, updatePage, deletePage, togglePagePublish } from './actions'
import { motion, AnimatePresence } from 'framer-motion'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'
import PanelConfirmDialog, { useConfirmDialog } from '@/components/panel/PanelConfirmDialog'
import ClientFeatureGate from '@/components/ui/ClientFeatureGate'

interface CMSPage {
    id: string
    slug: string
    title: string
    body: string
    published: boolean
}

interface Props {
    pages: CMSPage[]
    canAdd: boolean
    pageCount: number
    maxPages: number
}

export default function PagesClient({ pages, canAdd, pageCount, maxPages }: Props) {
    const { t } = useI18n()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const toast = useToast()
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Gate state
    const [gateData, setGateData] = useState({ isOpen: false, flag: '' })

    const handleFeatureClick = (canAccess: boolean, flag: string, action: () => void) => {
        if (!canAccess) {
            setGateData({ isOpen: true, flag })
        } else {
            action()
        }
    }

    const confirmDialog = useConfirmDialog({
        title: t('common.confirmDelete'),
        description: t('panel.pages.deleteConfirm') || '¿Eliminar esta página?',
        confirmLabel: t('common.delete'),
        variant: 'danger',
    })

    // Form state
    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [body, setBody] = useState('')
    const [published, setPublished] = useState(false)

    const resetForm = () => {
        setTitle(''); setSlug(''); setBody(''); setPublished(false)
        setEditingId(null); setShowForm(false); setError(null)
    }

    const openEdit = (page: CMSPage) => {
        setTitle(page.title); setSlug(page.slug); setBody(page.body)
        setPublished(page.published); setEditingId(page.id); setShowForm(true)
    }

    const handleSubmit = () => {
        if (!title.trim() || !slug.trim()) {
            setError(t('panel.pages.errorRequired') || 'Title and slug are required')
            return
        }
        startTransition(async () => {
            const data = { title, slug, body, published }
            const result = editingId
                ? await updatePage(editingId, data)
                : await createPage(data)
            if (result.success) { resetForm(); router.refresh(); toast.success('✓') }
            else { setError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
        })
    }

    const handleDelete = (id: string) => {
        confirmDialog.confirm(() => {
            startTransition(async () => {
                const result = await deletePage(id)
                if (result.success) { router.refresh(); toast.success('✓') }
                else { setError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
            })
        })
    }

    const handleTogglePublish = (page: CMSPage) => {
        startTransition(async () => {
            const result = await togglePagePublish(page.id, !page.published)
            if (result.success) { router.refresh(); toast.success('✓') }
            else { toast.error(result.error ?? 'Error') }
        })
    }

    const handleTitleChange = (val: string) => {
        setTitle(val)
        if (!editingId) {
            setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
        }
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
                title={t('panel.pages.title')}
                subtitle={t('panel.pages.subtitle')}
                icon={<FileText className="w-5 h-5" />}
                badge={pageCount}
                action={
                    <button
                        className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                        disabled={isPending}
                        onClick={() => handleFeatureClick(canAdd, 'max_pages_limit', () => { resetForm(); setShowForm(true) })}
                    >
                        <Plus className="w-4 h-4" />
                        {t('panel.pages.addPage')}
                    </button>
                }
            />

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-tx-muted">
                {pageCount} / {maxPages} {t('panel.pages.pages')}
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
                            {editingId ? t('common.edit') : t('panel.pages.addPage')}
                        </h2>
                        <div>
                            <label className={labelClass}>{t('common.title')}</label>
                            <input value={title} onChange={e => handleTitleChange(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Slug</label>
                            <div className="flex items-center gap-1">
                                <span className="text-sm text-tx-muted whitespace-nowrap">/paginas/</span>
                                <input value={slug} onChange={e => setSlug(e.target.value)} className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>{t('panel.pages.content')}</label>
                            <textarea
                                value={body} onChange={e => setBody(e.target.value)}
                                className={inputClass + ' font-mono min-h-[200px] resize-y'}
                                rows={12}
                                placeholder="Markdown o HTML..."
                            />
                        </div>
                        {/* Animated published toggle */}
                        <div className="flex items-center gap-3">
                            <div
                                role="switch"
                                aria-checked={published}
                                tabIndex={0}
                                onClick={() => setPublished(!published)}
                                onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') setPublished(!published) }}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2 ${
                                    published ? 'bg-brand' : 'bg-sf-3'
                                }`}
                            >
                                <motion.span
                                    layout
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm ${
                                        published ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </div>
                            <span className="text-sm text-tx-sec">{t('common.published')}</span>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={handleSubmit} disabled={isPending} className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2">
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isPending ? '...' : editingId ? t('common.save') : t('common.create')}
                            </button>
                            <button onClick={resetForm} className="btn btn-ghost min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med">{t('common.cancel')}</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Pages list ── */}
            {pages.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-2xl"
                >
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <FileText className="w-8 h-8 text-tx-muted" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-bold font-display text-tx mb-2">
                            {t('panel.pages.empty')}
                        </h3>
                        <p className="text-sm text-tx-sec leading-relaxed mb-6">
                            {t('panel.pages.emptyHint') || 'Create custom pages for your store — about us, FAQ, policies, and more.'}
                        </p>
                        <button
                            className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                            disabled={isPending}
                            onClick={() => handleFeatureClick(canAdd, 'max_pages_limit', () => { resetForm(); setShowForm(true) })}
                        >
                            <Plus className="w-4 h-4" />
                            {t('panel.pages.addPage')}
                        </button>
                    </div>
                </motion.div>
            ) : (
                <ListStagger className="space-y-3">
                    {pages.map((page) => (
                        <StaggerItem key={page.id}>
                            <motion.div
                                whileHover={{ y: -1 }}
                                className="glass rounded-2xl p-5 flex items-center justify-between transition-shadow hover:shadow-lg"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-brand-subtle flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-5 h-5 text-brand" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-tx truncate">{page.title}</h3>
                                        <p className="text-xs text-tx-muted mt-0.5">/paginas/{page.slug}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                        onClick={() => handleTogglePublish(page)}
                                        aria-pressed={page.published}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med ${
                                            page.published
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                                                : 'bg-sf-1 text-tx-muted hover:bg-sf-2'
                                        }`}
                                        disabled={isPending}
                                    >
                                        {page.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                        {page.published ? t('common.published') : t('common.draft')}
                                    </button>
                                    <button
                                        onClick={() => openEdit(page)}
                                        aria-label={t('common.edit')}
                                        className="p-2 min-h-[36px] rounded-lg hover:bg-sf-1 text-tx-muted hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                        disabled={isPending}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(page.id)}
                                        aria-label={t('common.delete')}
                                        className="p-2 min-h-[36px] rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-tx-muted hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                                        disabled={isPending}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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
