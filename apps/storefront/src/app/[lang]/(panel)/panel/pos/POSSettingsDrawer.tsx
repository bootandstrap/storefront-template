'use client'

/**
 * POSSettingsDrawer — Slide-over drawer for POS-specific config
 *
 * Phase 6A: Allows editing receipt header/footer, default payment method,
 * tax display, tips, and sounds from within the POS interface.
 * Uses the same governance pipeline (saveOnboardingConfigAction).
 */

import { useState, useCallback, useTransition } from 'react'
import { X, Settings, Save, Loader2, Check, Receipt, Volume2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { saveOnboardingConfigAction } from '@/app/[lang]/(panel)/panel/actions'
import { posLabel } from '@/lib/pos/pos-i18n'

// ── Config field definitions ──────────────────────────────────────

interface SettingsField {
    key: string
    label: string
    type: 'text' | 'textarea' | 'select' | 'toggle'
    placeholder?: string
    options?: { value: string; label: string }[]
    icon?: typeof Receipt
    group: 'receipt' | 'payment' | 'experience'
}

const POS_SETTINGS_FIELDS: SettingsField[] = [
    // Receipt
    { key: 'pos_receipt_header', label: 'Receipt Header', type: 'textarea', placeholder: 'Business Name\nAddress...', icon: Receipt, group: 'receipt' },
    { key: 'pos_receipt_footer', label: 'Receipt Footer', type: 'textarea', placeholder: 'Thank you for your purchase!', group: 'receipt' },
    // Payment
    { key: 'pos_default_payment_method', label: 'Default Payment', type: 'select', options: [
        { value: 'cash', label: '💵 Cash' },
        { value: 'card', label: '💳 Card' },
        { value: 'transfer', label: '🏦 Transfer' },
    ], group: 'payment' },
    { key: 'pos_tax_display', label: 'Tax Display', type: 'select', options: [
        { value: 'tax_included', label: 'Included in price' },
        { value: 'tax_excluded', label: 'Itemized separately' },
    ], group: 'payment' },
    // Experience
    { key: 'pos_enable_tips', label: 'Enable Tips', type: 'toggle', group: 'experience' },
    { key: 'pos_tip_percentages', label: 'Tip Percentages', type: 'text', placeholder: '5,10,15', group: 'experience' },
    { key: 'pos_sound_enabled', label: 'Sound Effects', type: 'toggle', icon: Volume2, group: 'experience' },
]

// ── Props ──────────────────────────────────────────────────────────

interface Props {
    isOpen: boolean
    onClose: () => void
    initialValues: Record<string, unknown>
    labels: Record<string, string>
}

// ── Component ─────────────────────────────────────────────────────

export default function POSSettingsDrawer({ isOpen, onClose, initialValues, labels }: Props) {
    const [values, setValues] = useState<Record<string, unknown>>(initialValues)
    const [isPending, startTransition] = useTransition()
    const [saved, setSaved] = useState(false)

    const hasChanges = POS_SETTINGS_FIELDS.some(f => {
        const initial = initialValues[f.key]
        const current = values[f.key]
        return String(initial ?? '') !== String(current ?? '')
    })

    const updateValue = (key: string, value: unknown) => {
        setValues(prev => ({ ...prev, [key]: value }))
        setSaved(false)
    }

    const handleSave = useCallback(() => {
        const updates: Record<string, unknown> = {}
        for (const field of POS_SETTINGS_FIELDS) {
            const current = values[field.key]
            const initial = initialValues[field.key]
            if (String(current ?? '') !== String(initial ?? '')) {
                updates[field.key] = current
            }
        }
        if (Object.keys(updates).length === 0) return

        startTransition(async () => {
            const result = await saveOnboardingConfigAction(updates)
            if (result.success) {
                setSaved(true)
                setTimeout(() => setSaved(false), 2500)
            }
        })
    }, [values, initialValues])

    const groups = [
        { key: 'receipt', label: '🧾 Receipt', icon: Receipt },
        { key: 'payment', label: '💳 Payment' },
        { key: 'experience', label: '✨ Experience' },
    ] as const

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-sf-0 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-sf-2">
                            <div className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-brand" />
                                <h2 className="text-lg font-bold text-tx">
                                    {posLabel('panel.pos.settings', labels) || 'POS Settings'}
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-sf-1 flex items-center justify-center hover:bg-sf-2 transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4 text-tx-muted" />
                            </button>
                        </div>

                        {/* Settings body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                            {groups.map(group => {
                                const groupFields = POS_SETTINGS_FIELDS.filter(f => f.group === group.key)
                                if (groupFields.length === 0) return null

                                return (
                                    <div key={group.key}>
                                        <h3 className="text-xs font-bold text-tx-muted uppercase tracking-wider mb-3">
                                            {group.label}
                                        </h3>
                                        <div className="space-y-3">
                                            {groupFields.map(field => (
                                                <div key={field.key}>
                                                    {field.type !== 'toggle' && (
                                                        <label
                                                            htmlFor={`pos-cfg-${field.key}`}
                                                            className="block text-xs font-semibold text-tx-muted mb-1.5"
                                                        >
                                                            {field.label}
                                                        </label>
                                                    )}

                                                    {/* Text */}
                                                    {field.type === 'text' && (
                                                        <input
                                                            id={`pos-cfg-${field.key}`}
                                                            type="text"
                                                            value={String(values[field.key] ?? '')}
                                                            onChange={e => updateValue(field.key, e.target.value)}
                                                            placeholder={field.placeholder}
                                                            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl glass text-tx text-sm focus:ring-2 focus:ring-soft transition-all outline-none"
                                                        />
                                                    )}

                                                    {/* Textarea */}
                                                    {field.type === 'textarea' && (
                                                        <textarea
                                                            id={`pos-cfg-${field.key}`}
                                                            value={String(values[field.key] ?? '')}
                                                            onChange={e => updateValue(field.key, e.target.value)}
                                                            placeholder={field.placeholder}
                                                            rows={3}
                                                            className="w-full px-4 py-3 min-h-[80px] rounded-xl glass text-tx text-sm focus:ring-2 focus:ring-soft transition-all outline-none resize-none"
                                                        />
                                                    )}

                                                    {/* Select */}
                                                    {field.type === 'select' && field.options && (
                                                        <select
                                                            id={`pos-cfg-${field.key}`}
                                                            value={String(values[field.key] ?? '')}
                                                            onChange={e => updateValue(field.key, e.target.value)}
                                                            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl glass text-tx text-sm focus:ring-2 focus:ring-soft transition-all outline-none appearance-none cursor-pointer"
                                                        >
                                                            {field.options.map(opt => (
                                                                <option key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}

                                                    {/* Toggle */}
                                                    {field.type === 'toggle' && (
                                                        <div className="flex items-center justify-between">
                                                            <label
                                                                htmlFor={`pos-cfg-${field.key}`}
                                                                className="text-sm font-medium text-tx cursor-pointer"
                                                            >
                                                                {field.label}
                                                            </label>
                                                            <button
                                                                id={`pos-cfg-${field.key}`}
                                                                role="switch"
                                                                aria-checked={Boolean(values[field.key])}
                                                                onClick={() => updateValue(field.key, !values[field.key])}
                                                                className={`relative w-11 h-6 rounded-full transition-colors ${
                                                                    values[field.key] ? 'bg-brand' : 'bg-sf-3'
                                                                }`}
                                                            >
                                                                <motion.div
                                                                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                                                                    animate={{ x: values[field.key] ? 24 : 4 }}
                                                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                                />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Footer — Save */}
                        <div className="px-6 py-4 border-t border-sf-2">
                            <motion.button
                                onClick={handleSave}
                                disabled={isPending || !hasChanges}
                                className="w-full btn btn-primary inline-flex items-center justify-center gap-2 text-sm min-h-[48px] disabled:opacity-40"
                                whileTap={{ scale: 0.97 }}
                            >
                                {isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : saved ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isPending ? 'Saving...' : saved ? '✓ Saved' : 'Save Settings'}
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
