'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { useI18n } from '@/lib/i18n/provider'
import { FileText, Plus } from 'lucide-react'
import { createPage, updatePage, deletePage, togglePagePublish } from './actions'

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

    // Form state
    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [body, setBody] = useState('')
    const [published, setPublished] = useState(false)

    const resetForm = () => {
        setTitle('')
        setSlug('')
        setBody('')
        setPublished(false)
        setEditingId(null)
        setShowForm(false)
        setError(null)
    }

    const openEdit = (page: CMSPage) => {
        setTitle(page.title)
        setSlug(page.slug)
        setBody(page.body)
        setPublished(page.published)
        setEditingId(page.id)
        setShowForm(true)
    }

    const handleSubmit = () => {
        if (!title.trim() || !slug.trim()) {
            setError('Title and slug are required')
            return
        }
        startTransition(async () => {
            const data = { title, slug, body, published }
            const result = editingId
                ? await updatePage(editingId, data)
                : await createPage(data)

            if (result.success) {
                resetForm()
                router.refresh()
                toast.success('✓')
            } else {
                setError(result.error ?? 'Error')
                toast.error(result.error ?? 'Error')
            }
        })
    }

    const handleDelete = (id: string) => {
        if (!confirm(t('common.confirmDelete'))) return
        startTransition(async () => {
            const result = await deletePage(id)
            if (result.success) { router.refresh(); toast.success('✓') }
            else { setError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
        })
    }

    const handleTogglePublish = (page: CMSPage) => {
        startTransition(async () => {
            const result = await togglePagePublish(page.id, !page.published)
            if (result.success) { router.refresh(); toast.success('✓') }
            else { toast.error(result.error ?? 'Error') }
        })
    }

    // Auto-generate slug from title
    const handleTitleChange = (val: string) => {
        setTitle(val)
        if (!editingId) {
            setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
        }
    }

    const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'
    const labelClass = 'block text-sm font-medium text-text-secondary mb-1'

    return (
        <>
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
                        <FileText className="w-6 h-6 text-primary" />
                        {t('panel.pages.title')}
                        <span className="ml-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                            {pageCount}
                        </span>
                    </h1>
                    <p className="text-text-muted mt-1">{t('panel.pages.subtitle')} · {pageCount} / {maxPages} {t('panel.pages.pages')}</p>
                </div>
                <button
                    className="btn btn-primary flex items-center gap-2"
                    disabled={!canAdd || isPending}
                    onClick={() => { resetForm(); setShowForm(true) }}
                >
                    <Plus className="w-4 h-4" />
                    {t('panel.pages.addPage')}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            {/* Create/Edit form */}
            {showForm && (
                <div className="glass rounded-2xl p-6 space-y-4">
                    <h2 className="font-bold text-lg text-text-primary">
                        {editingId ? t('common.edit') : t('panel.pages.addPage')}
                    </h2>
                    <div>
                        <label className={labelClass}>{t('common.title')}</label>
                        <input value={title} onChange={e => handleTitleChange(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Slug</label>
                        <div className="flex items-center gap-1">
                            <span className="text-sm text-text-muted">/paginas/</span>
                            <input value={slug} onChange={e => setSlug(e.target.value)} className={inputClass} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>{t('panel.pages.content')}</label>
                        <textarea value={body} onChange={e => setBody(e.target.value)} className={inputClass + ' font-mono'} rows={12} placeholder="Markdown o HTML..." />
                    </div>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="rounded" />
                        <span className="text-sm text-text-secondary">{t('common.published')}</span>
                    </label>
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSubmit} disabled={isPending} className="btn btn-primary">
                            {isPending ? '...' : editingId ? t('common.save') : t('common.create')}
                        </button>
                        <button onClick={resetForm} className="btn btn-ghost">{t('common.cancel')}</button>
                    </div>
                </div>
            )}

            {/* Pages list */}
            {pages.length === 0 ? (
                <div className="glass rounded-2xl">
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>
                        </div>
                        <h3 className="text-lg font-bold font-display text-text-primary mb-2">
                            {t('panel.pages.empty')}
                        </h3>
                        <p className="text-sm text-text-secondary leading-relaxed mb-6">
                            {t('panel.pages.emptyHint') || 'Create custom pages for your store — about us, FAQ, policies, and more.'}
                        </p>
                        <button
                            className="btn btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
                            disabled={!canAdd || isPending}
                            onClick={() => { resetForm(); setShowForm(true) }}
                        >
                            + {t('panel.pages.addPage')}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {pages.map((page) => (
                        <div key={page.id} className="glass rounded-2xl p-5 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-text-primary">{page.title}</h3>
                                <p className="text-xs text-text-muted mt-0.5">/paginas/{page.slug}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleTogglePublish(page)}
                                    className={`text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors ${page.published ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-surface-2 text-text-muted hover:bg-surface-3'}`}
                                    disabled={isPending}
                                >
                                    {page.published ? t('common.published') : t('common.draft')}
                                </button>
                                <button onClick={() => openEdit(page)} className="btn btn-ghost text-xs" disabled={isPending}>
                                    {t('common.edit')}
                                </button>
                                <button onClick={() => handleDelete(page.id)} className="btn btn-ghost text-xs text-red-500" disabled={isPending}>
                                    {t('common.delete')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}
