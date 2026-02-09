'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/provider'
import { createTemplate, updateTemplate, deleteTemplate } from './actions'

interface WhatsAppTemplate {
    id: string
    name: string
    template: string
    is_default: boolean
    variables: string[]
}

interface Props {
    templates: WhatsAppTemplate[]
    canAdd: boolean
    templateCount: number
    maxTemplates: number
}

export default function MessagesClient({ templates, canAdd, templateCount, maxTemplates }: Props) {
    const { t } = useI18n()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [name, setName] = useState('')
    const [body, setBody] = useState('')
    const [isDefault, setIsDefault] = useState(false)

    const resetForm = () => {
        setName('')
        setBody('')
        setIsDefault(false)
        setEditingId(null)
        setShowForm(false)
        setError(null)
    }

    const openEdit = (tmpl: WhatsAppTemplate) => {
        setName(tmpl.name)
        setBody(tmpl.template)
        setIsDefault(tmpl.is_default)
        setEditingId(tmpl.id)
        setShowForm(true)
    }

    const handleSubmit = () => {
        startTransition(async () => {
            // Extract variables from template body
            const vars = [...body.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1])

            const data = { name, template: body, is_default: isDefault, variables: vars }
            const result = editingId
                ? await updateTemplate(editingId, data)
                : await createTemplate(data)

            if (result.success) {
                resetForm()
                router.refresh()
            } else {
                setError(result.error ?? 'Error')
            }
        })
    }

    const handleDelete = (id: string) => {
        if (!confirm(t('common.confirmDelete'))) return
        startTransition(async () => {
            const result = await deleteTemplate(id)
            if (result.success) router.refresh()
            else setError(result.error ?? 'Error')
        })
    }

    const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'
    const labelClass = 'block text-sm font-medium text-text-secondary mb-1'

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-display text-text-primary">
                        {t('panel.messages.title')}
                    </h1>
                    <p className="text-text-muted mt-1">{t('panel.messages.subtitle')}</p>
                </div>
                <button
                    className="btn btn-primary"
                    disabled={!canAdd || isPending}
                    onClick={() => { resetForm(); setShowForm(true) }}
                >
                    + {t('panel.messages.addTemplate')}
                </button>
            </div>

            <p className="text-xs text-text-muted">
                {templateCount} / {maxTemplates} {t('panel.messages.templates')}
            </p>

            {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            {/* Create/Edit form */}
            {showForm && (
                <div className="glass rounded-2xl p-6 space-y-4">
                    <h2 className="font-bold text-lg text-text-primary">
                        {editingId ? t('common.edit') : t('panel.messages.addTemplate')}
                    </h2>
                    <div>
                        <label className={labelClass}>{t('common.name')}</label>
                        <input value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="e.g. Pedido estándar" />
                    </div>
                    <div>
                        <label className={labelClass}>{t('panel.messages.template')}</label>
                        <textarea
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            className={inputClass + ' font-mono'}
                            rows={8}
                            placeholder={'🛒 *Nuevo Pedido — {{store_name}}*\n\n{{#each items}}\n• {{name}} x{{qty}} — {{price}}\n{{/each}}\n\n💰 *Total: {{total}}*'}
                        />
                        <p className="text-xs text-text-muted mt-1">
                            Variables: {'{{store_name}}, {{items}}, {{total}}, {{customer_name}}, {{customer_phone}}'}
                        </p>
                    </div>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="rounded" />
                        <span className="text-sm text-text-secondary">{t('panel.messages.setDefault')}</span>
                    </label>
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSubmit} disabled={isPending} className="btn btn-primary">
                            {isPending ? '...' : editingId ? t('common.save') : t('common.create')}
                        </button>
                        <button onClick={resetForm} className="btn btn-ghost">{t('common.cancel')}</button>
                    </div>
                </div>
            )}

            {/* Template list */}
            {templates.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <div className="text-4xl mb-3">💬</div>
                    <p className="text-text-muted">{t('panel.messages.empty')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {templates.map((tmpl) => (
                        <div key={tmpl.id} className="glass rounded-2xl p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-text-primary">
                                        {tmpl.name}
                                        {tmpl.is_default && (
                                            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                Default
                                            </span>
                                        )}
                                    </h3>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openEdit(tmpl)} className="btn btn-ghost text-xs" disabled={isPending}>
                                        {t('common.edit')}
                                    </button>
                                    <button onClick={() => handleDelete(tmpl.id)} className="btn btn-ghost text-xs text-red-500" disabled={isPending}>
                                        {t('common.delete')}
                                    </button>
                                </div>
                            </div>
                            <pre className="mt-3 text-xs text-text-secondary bg-surface-1 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono">
                                {tmpl.template}
                            </pre>
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}
