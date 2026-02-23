'use client'

/**
 * WhatsApp Templates — Owner Panel
 *
 * Improved UX with:
 * - Live preview pane (renders {{variables}} with sample data)
 * - Click-to-insert variable bar
 * - Template type selector with sensible defaults
 * - Responsive layout (stacked on mobile)
 */

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { useI18n } from '@/lib/i18n/provider'
import { createTemplate, updateTemplate, deleteTemplate } from './actions'
import { renderWhatsAppPreviewParts } from './preview-render'
import { Plus, Eye, Code, Trash2, Pencil, MessageCircle, Copy, Check } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Variable definitions for click-to-insert
// ---------------------------------------------------------------------------

const TEMPLATE_VARIABLES = [
    { key: 'store_name', emoji: '🏪', label: 'Tienda' },
    { key: 'customer_name', emoji: '👤', label: 'Cliente' },
    { key: 'customer_phone', emoji: '📱', label: 'Teléfono' },
    { key: 'total', emoji: '💰', label: 'Total' },
    { key: 'order_id', emoji: '🔢', label: 'Nº Pedido' },
    { key: 'items', emoji: '📦', label: 'Artículos' },
] as const

// Template presets
const TEMPLATE_PRESETS = [
    {
        id: 'order',
        emoji: '🛒',
        label: 'Nuevo Pedido',
        body: '🛒 *Nuevo Pedido — {{store_name}}*\n\nCliente: {{customer_name}}\nPedido: {{order_id}}\n\n{{items}}\n\n💰 *Total: {{total}}*\n\n¡Gracias por tu compra! 🎉',
    },
    {
        id: 'welcome',
        emoji: '👋',
        label: 'Bienvenida',
        body: '👋 ¡Hola {{customer_name}}!\n\nBienvenido/a a *{{store_name}}*.\n\nEstamos encantados de tenerte aquí. Si necesitas algo, no dudes en escribirnos.\n\n¡Un saludo! 😊',
    },
    {
        id: 'shipping',
        emoji: '🚚',
        label: 'Envío',
        body: '🚚 *Pedido Enviado — {{store_name}}*\n\n¡Hola {{customer_name}}!\n\nTu pedido {{order_id}} está en camino.\n\nTe avisaremos cuando llegue. 📦',
    },
    {
        id: 'custom',
        emoji: '✏️',
        label: 'Personalizada',
        body: '',
    },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MessagesClient({ templates, canAdd, templateCount, maxTemplates }: Props) {
    const { t } = useI18n()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const toast = useToast()
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // UI state
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showPreview, setShowPreview] = useState(true)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Form state
    const [name, setName] = useState('')
    const [body, setBody] = useState('')
    const [isDefault, setIsDefault] = useState(false)
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

    const resetForm = () => {
        setName('')
        setBody('')
        setIsDefault(false)
        setEditingId(null)
        setShowForm(false)
        setError(null)
        setSelectedPreset(null)
    }

    const openEdit = (tmpl: WhatsAppTemplate) => {
        setName(tmpl.name)
        setBody(tmpl.template)
        setIsDefault(tmpl.is_default)
        setEditingId(tmpl.id)
        setShowForm(true)
        setSelectedPreset(null)
    }

    const selectPreset = (preset: typeof TEMPLATE_PRESETS[number]) => {
        setSelectedPreset(preset.id)
        if (preset.id !== 'custom') {
            if (!name) setName(preset.label)
            setBody(preset.body)
        }
    }

    const insertVariable = (varKey: string) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const tag = `{{${varKey}}}`
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const newBody = body.slice(0, start) + tag + body.slice(end)
        setBody(newBody)

        // Restore cursor position after the inserted tag
        requestAnimationFrame(() => {
            textarea.focus()
            const pos = start + tag.length
            textarea.setSelectionRange(pos, pos)
        })
    }

    const handleSubmit = () => {
        if (!name.trim()) {
            setError(t('panel.messages.errorNoName'))
            return
        }
        if (!body.trim()) {
            setError(t('panel.messages.errorNoBody'))
            return
        }

        startTransition(async () => {
            const vars = [...body.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1])
            const data = { name: name.trim(), template: body, is_default: isDefault, variables: vars }
            const result = editingId
                ? await updateTemplate(editingId, data)
                : await createTemplate(data)

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
            const result = await deleteTemplate(id)
            if (result.success) { router.refresh(); toast.success('✓') }
            else { setError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
        })
    }

    const copyTemplate = (tmpl: WhatsAppTemplate) => {
        navigator.clipboard.writeText(tmpl.template)
        setCopiedId(tmpl.id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold font-display text-text-primary">
                        {t('panel.messages.title')}
                    </h1>
                    <p className="text-text-muted mt-1">{t('panel.messages.subtitle')}</p>
                </div>
                <button
                    className="btn btn-primary inline-flex items-center gap-2"
                    disabled={!canAdd || isPending}
                    onClick={() => { resetForm(); setShowForm(true) }}
                >
                    <Plus className="w-4 h-4" />
                    {t('panel.messages.addTemplate')}
                </button>
            </div>

            <p className="text-xs text-text-muted">
                {templateCount} / {maxTemplates} {t('panel.messages.templates')}
            </p>

            {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-2 text-xs">✕</button>
                </div>
            )}

            {/* ============================================================= */}
            {/* CREATE / EDIT FORM                                             */}
            {/* ============================================================= */}
            {showForm && (
                <div className="glass rounded-2xl p-6 space-y-5">
                    <h2 className="font-bold text-lg text-text-primary">
                        {editingId ? t('common.edit') : t('panel.messages.addTemplate')}
                    </h2>

                    {/* Template type selector (only for new) */}
                    {!editingId && (
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                {t('panel.messages.templateType')}
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {TEMPLATE_PRESETS.map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => selectPreset(preset)}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm ${selectedPreset === preset.id
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-surface-3 bg-surface-0 text-text-secondary hover:border-primary/30'
                                            }`}
                                    >
                                        <span className="text-xl">{preset.emoji}</span>
                                        <span className="font-medium">{preset.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            {t('common.name')}
                        </label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={inputClass}
                            placeholder="Ej: Confirmación de pedido"
                        />
                    </div>

                    {/* Editor + Preview side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Editor Column */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-text-secondary">
                                    {t('panel.messages.template')}
                                </label>
                                <button
                                    onClick={() => setShowPreview(!showPreview)}
                                    className="lg:hidden text-xs text-primary flex items-center gap-1"
                                >
                                    {showPreview ? <Code className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    {showPreview ? t('panel.messages.hidePreview') : t('panel.messages.showPreview')}
                                </button>
                            </div>

                            {/* Variable insert bar */}
                            <div className="flex flex-wrap gap-1.5">
                                {TEMPLATE_VARIABLES.map(v => (
                                    <button
                                        key={v.key}
                                        onClick={() => insertVariable(v.key)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-1 hover:bg-primary/10 hover:text-primary text-text-muted text-xs font-medium transition-all border border-surface-3 hover:border-primary/30"
                                        title={`Insertar {{${v.key}}}`}
                                    >
                                        <span>{v.emoji}</span>
                                        {v.label}
                                    </button>
                                ))}
                            </div>

                            {/* Template textarea */}
                            <textarea
                                ref={textareaRef}
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                className={inputClass + ' font-mono min-h-[200px] resize-y'}
                                rows={10}
                                placeholder={t('panel.messages.editorPlaceholder')}
                            />

                            <p className="text-xs text-text-muted">
                                💡 {t('panel.messages.variableHint')}
                            </p>
                        </div>

                        {/* Preview Column */}
                        <div className={`${showPreview ? '' : 'hidden lg:block'}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <Eye className="w-4 h-4 text-text-muted" />
                                <span className="text-sm font-medium text-text-secondary">
                                    {t('panel.messages.preview')}
                                </span>
                            </div>
                            <div className="bg-[#e5ddd5] rounded-2xl p-4 min-h-[200px]">
                                {/* WhatsApp-style chat bubble */}
                                <div className="max-w-[85%] ml-auto">
                                    <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                                        {body ? (
                                            <div
                                                className="text-sm text-gray-800 whitespace-pre-wrap break-words"
                                            >
                                                {renderWhatsAppPreviewParts(body).map((part, idx) =>
                                                    part.bold ? (
                                                        <strong key={`${idx}-${part.text}`}>{part.text}</strong>
                                                    ) : (
                                                        <span key={`${idx}-${part.text}`}>{part.text}</span>
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 italic">
                                                {t('panel.messages.previewEmpty')}
                                            </p>
                                        )}
                                        <div className="text-right mt-1">
                                            <span className="text-[10px] text-gray-500">14:32 ✓✓</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Default toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isDefault}
                            onChange={e => setIsDefault(e.target.checked)}
                            className="rounded border-surface-3"
                        />
                        <span className="text-sm text-text-secondary">
                            {t('panel.messages.setDefault')}
                        </span>
                    </label>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSubmit} disabled={isPending} className="btn btn-primary">
                            {isPending ? '...' : editingId ? t('common.save') : t('common.create')}
                        </button>
                        <button onClick={resetForm} className="btn btn-ghost">{t('common.cancel')}</button>
                    </div>
                </div>
            )}

            {/* ============================================================= */}
            {/* TEMPLATE LIST                                                  */}
            {/* ============================================================= */}
            {templates.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <div className="text-5xl mb-4">💬</div>
                    <p className="text-text-muted text-lg">{t('panel.messages.empty')}</p>
                    <p className="text-text-muted/60 text-sm mt-2">
                        {t('panel.messages.emptyHint')}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {templates.map(tmpl => (
                        <div key={tmpl.id} className="glass rounded-2xl overflow-hidden">
                            {/* Template header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-2">
                                <div className="flex items-center gap-3">
                                    <MessageCircle className="w-5 h-5 text-green-600" />
                                    <h3 className="font-bold text-text-primary">
                                        {tmpl.name}
                                    </h3>
                                    {tmpl.is_default && (
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                            Default
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => copyTemplate(tmpl)}
                                        className="p-2 rounded-lg hover:bg-surface-1 text-text-muted hover:text-text-secondary transition-colors"
                                        title={t('common.copy')}
                                    >
                                        {copiedId === tmpl.id
                                            ? <Check className="w-4 h-4 text-green-600" />
                                            : <Copy className="w-4 h-4" />
                                        }
                                    </button>
                                    <button
                                        onClick={() => openEdit(tmpl)}
                                        className="p-2 rounded-lg hover:bg-surface-1 text-text-muted hover:text-primary transition-colors"
                                        disabled={isPending}
                                        title={t('common.edit')}
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(tmpl.id)}
                                        className="p-2 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"
                                        disabled={isPending}
                                        title={t('common.delete')}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Template preview (WhatsApp-style) */}
                            <div className="bg-[#e5ddd5]/50 px-5 py-4">
                                <div className="max-w-[70%] ml-auto">
                                    <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                                        <div
                                            className="text-sm text-gray-800 whitespace-pre-wrap break-words"
                                        >
                                            {renderWhatsAppPreviewParts(tmpl.template).map((part, idx) =>
                                                part.bold ? (
                                                    <strong key={`${idx}-${part.text}`}>{part.text}</strong>
                                                ) : (
                                                    <span key={`${idx}-${part.text}`}>{part.text}</span>
                                                )
                                            )}
                                        </div>
                                        <div className="text-right mt-1">
                                            <span className="text-[10px] text-gray-500">14:32 ✓✓</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Variables used */}
                            {tmpl.variables.length > 0 && (
                                <div className="px-5 py-3 bg-surface-0 border-t border-surface-2">
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-xs text-text-muted mr-1">Variables:</span>
                                        {tmpl.variables.map(v => (
                                            <span key={v} className="text-xs bg-surface-1 text-text-secondary px-2 py-0.5 rounded-full font-mono">
                                                {`{{${v}}}`}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}
