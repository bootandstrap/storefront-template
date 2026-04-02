'use client'

/**
 * WhatsApp Templates — Owner Panel (SOTA rewrite)
 *
 * Features:
 * - PageEntrance animation
 * - ListStagger for template list
 * - SlideOver or animated expand for form
 * - PanelConfirmDialog replaces window.confirm()
 * - Animated preset selector
 * - Animated empty state
 * - Hover-lift cards
 */

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { useI18n } from '@/lib/i18n/provider'
import { createTemplate, updateTemplate, deleteTemplate } from './actions'
import { renderWhatsAppPreviewParts } from './preview-render'
import { Plus, Eye, Code, Trash2, Pencil, MessageCircle, Copy, Check, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'
import PanelConfirmDialog, { useConfirmDialog } from '@/components/panel/PanelConfirmDialog'
import ClientFeatureGate from '@/components/ui/ClientFeatureGate'

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
    const confirmDialog = useConfirmDialog({
        title: t('common.confirmDelete'),
        description: t('panel.messages.deleteConfirm') || '¿Seguro que quieres eliminar esta plantilla?',
        confirmLabel: t('common.delete'),
        variant: 'danger',
    })

    // UI state
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showPreview, setShowPreview] = useState(true)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Gate state
    const [gateData, setGateData] = useState({ isOpen: false, flag: '' })

    const handleFeatureClick = (canAccess: boolean, flag: string, action: () => void) => {
        if (!canAccess) {
            setGateData({ isOpen: true, flag })
        } else {
            action()
        }
    }

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
        confirmDialog.confirm(() => {
            startTransition(async () => {
                const result = await deleteTemplate(id)
                if (result.success) { router.refresh(); toast.success('✓') }
                else { setError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
            })
        })
    }

    const copyTemplate = (tmpl: WhatsAppTemplate) => {
        navigator.clipboard.writeText(tmpl.template)
        setCopiedId(tmpl.id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const inputClass = 'w-full px-4 py-2.5 min-h-[44px] rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-soft transition-all'

    return (
        <PageEntrance className="space-y-5">
            <ClientFeatureGate
                isOpen={gateData.isOpen}
                onClose={() => setGateData({ ...gateData, isOpen: false })}
                flag={gateData.flag}
            />
            {/* Header */}
            <PanelPageHeader
                title={t('panel.messages.title')}
                subtitle={t('panel.messages.subtitle')}
                icon={<MessageCircle className="w-5 h-5" />}
                action={
                    <button
                        className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                        disabled={isPending}
                        onClick={() => handleFeatureClick(canAdd, 'max_templates_limit', () => { resetForm(); setShowForm(true) })}
                    >
                        <Plus className="w-4 h-4" />
                        {t('panel.messages.addTemplate')}
                    </button>
                }
            />

            {/* Template count */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-tx-muted"
            >
                {templateCount} / {maxTemplates} {t('panel.messages.templates')}
            </motion.p>

            {/* Error banner */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm flex items-center justify-between"
                    >
                        <span>{error}</span>
                        <button onClick={() => setError(null)} aria-label="Dismiss error" className="text-red-500 hover:text-red-700 ml-2 p-1.5 min-h-[36px] rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ============================================================= */}
            {/* CREATE / EDIT FORM                                             */}
            {/* ============================================================= */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        className="glass rounded-2xl p-6 space-y-5"
                    >
                        <h2 className="font-bold text-lg text-tx">
                            {editingId ? t('common.edit') : t('panel.messages.addTemplate')}
                        </h2>

                        {/* Template type selector (only for new) */}
                        {!editingId && (
                            <div>
                                <label className="block text-xs font-semibold text-tx-muted uppercase tracking-wide mb-2">
                                    {t('panel.messages.templateType')}
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {TEMPLATE_PRESETS.map(preset => (
                                        <motion.button
                                            key={preset.id}
                                            onClick={() => selectPreset(preset)}
                                            whileHover={{ y: -2 }}
                                            whileTap={{ scale: 0.97 }}
                                            aria-pressed={selectedPreset === preset.id}
                                            className={`flex flex-col items-center gap-1.5 p-3 min-h-[70px] rounded-xl border-2 transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med ${selectedPreset === preset.id
                                                ? 'border-brand bg-brand-subtle text-brand'
                                                : 'border-sf-3 bg-sf-0 text-tx-sec hover:border-brand'
                                                }`}
                                        >
                                            <span className="text-xl">{preset.emoji}</span>
                                            <span className="font-medium">{preset.label}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <label className="block text-xs font-semibold text-tx-muted uppercase tracking-wide mb-1.5">
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
                                    <label className="block text-xs font-semibold text-tx-muted uppercase tracking-wide">
                                        {t('panel.messages.template')}
                                    </label>
                                    <button
                                        onClick={() => setShowPreview(!showPreview)}
                                        className="lg:hidden text-xs text-brand flex items-center gap-1"
                                    >
                                        {showPreview ? <Code className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        {showPreview ? t('panel.messages.hidePreview') : t('panel.messages.showPreview')}
                                    </button>
                                </div>

                                {/* Variable insert bar */}
                                <div className="flex flex-wrap gap-1.5">
                                    {TEMPLATE_VARIABLES.map(v => (
                                        <motion.button
                                            key={v.key}
                                            onClick={() => insertVariable(v.key)}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            aria-label={`Insert {{${v.key}}}`}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[32px] rounded-lg glass text-tx-muted text-xs font-medium transition-all hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                            title={`Insertar {{${v.key}}}`}
                                        >
                                            <span>{v.emoji}</span>
                                            {v.label}
                                        </motion.button>
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

                                <p className="text-xs text-tx-muted">
                                    💡 {t('panel.messages.variableHint')}
                                </p>
                            </div>

                            {/* Preview Column */}
                            <div className={`${showPreview ? '' : 'hidden lg:block'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Eye className="w-4 h-4 text-tx-muted" />
                                    <span className="text-xs font-semibold text-tx-muted uppercase tracking-wide">
                                        {t('panel.messages.preview')}
                                    </span>
                                </div>
                                <div className="bg-[#e5ddd5] rounded-2xl p-4 min-h-[200px]">
                                    {/* WhatsApp-style chat bubble */}
                                    <div className="max-w-[85%] ml-auto">
                                        <motion.div
                                            key={body}
                                            initial={{ opacity: 0.6, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm"
                                        >
                                            {body ? (
                                                <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
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
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Default toggle */}
                        <label className="flex items-center gap-3 cursor-pointer">
                            <div
                                role="switch"
                                aria-checked={isDefault}
                                tabIndex={0}
                                onClick={() => setIsDefault(!isDefault)}
                                onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') setIsDefault(!isDefault) }}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2 ${
                                    isDefault ? 'bg-brand' : 'bg-sf-3'
                                }`}
                            >
                                <motion.span
                                    layout
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm ${
                                        isDefault ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </div>
                            <span className="text-sm text-tx-sec">
                                {t('panel.messages.setDefault')}
                            </span>
                        </label>

                        {/* Actions */}
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

            {/* ============================================================= */}
            {/* TEMPLATE LIST                                                  */}
            {/* ============================================================= */}
            {templates.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-2xl"
                >
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <MessageCircle className="w-8 h-8 text-tx-muted" strokeWidth={1.5} />
                        </div>
                        <p className="text-tx-muted text-lg">{t('panel.messages.empty')}</p>
                        <p className="text-tx-faint text-sm mt-2">
                            {t('panel.messages.emptyHint')}
                        </p>
                    </div>
                </motion.div>
            ) : (
                <ListStagger className="space-y-4">
                    {templates.map((tmpl) => (
                        <StaggerItem key={tmpl.id}>
                            <motion.div
                                whileHover={{ y: -2 }}
                                className="glass rounded-2xl overflow-hidden transition-shadow hover:shadow-lg"
                            >
                                {/* Template header */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-sf-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                            <MessageCircle className="w-5 h-5 text-green-600" />
                                        </div>
                                        <h3 className="font-bold text-tx">
                                            {tmpl.name}
                                        </h3>
                                        {tmpl.is_default && (
                                            <span className="text-xs bg-brand-subtle text-brand px-2 py-0.5 rounded-full font-medium">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => copyTemplate(tmpl)}
                                            aria-label={t('common.copy')}
                                            className="p-2 min-h-[40px] rounded-lg hover:bg-sf-1 text-tx-muted hover:text-tx-sec transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                            title={t('common.copy')}
                                        >
                                            {copiedId === tmpl.id
                                                ? <Check className="w-4 h-4 text-green-600" />
                                                : <Copy className="w-4 h-4" />
                                            }
                                        </button>
                                        <button
                                            onClick={() => openEdit(tmpl)}
                                            aria-label={t('common.edit')}
                                            className="p-2 min-h-[40px] rounded-lg hover:bg-sf-1 text-tx-muted hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                            disabled={isPending}
                                            title={t('common.edit')}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tmpl.id)}
                                            aria-label={t('common.delete')}
                                            className="p-2 min-h-[40px] rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-tx-muted hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                                            disabled={isPending}
                                            title={t('common.delete')}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Template preview (WhatsApp-style) */}
                                <div className="bg-[#e5ddd5]/50 dark:bg-[#1a1a1a] px-5 py-4">
                                    <div className="max-w-[70%] ml-auto">
                                        <div className="bg-[#dcf8c6] dark:bg-emerald-900/40 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                                            <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
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
                                    <div className="px-5 py-3 border-t border-sf-2">
                                        <div className="flex flex-wrap gap-1.5">
                                            <span className="text-xs text-tx-muted mr-1">Variables:</span>
                                            {tmpl.variables.map(v => (
                                                <span key={v} className="text-xs glass text-tx-sec px-2 py-0.5 rounded-full font-mono">
                                                    {`{{${v}}}`}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </StaggerItem>
                    ))}
                </ListStagger>
            )}

            {/* Confirm dialog */}
            <PanelConfirmDialog {...confirmDialog.dialogProps} />
        </PageEntrance>
    )
}
