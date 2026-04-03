'use client'

/**
 * ModuleConfigSection — Reusable inline config editor for panel modules
 *
 * Renders module-specific configuration fields with save functionality.
 * Uses the same saveOnboardingConfigAction as the onboarding wizard for
 * full pipeline consistency. Each field type (text, number, select, toggle, textarea)
 * is rendered with appropriate UI.
 *
 * Phase 2: Panel → Config wiring
 */

import { useState, useCallback, useTransition } from 'react'
import { Settings, Save, Loader2, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { saveOnboardingConfigAction } from '@/app/[lang]/(panel)/panel/actions'

// ── Types ──────────────────────────────────────────────────────────────

export interface ConfigFieldDef {
    key: string
    label: string
    type: 'text' | 'number' | 'select' | 'toggle' | 'textarea' | 'email'
    options?: { value: string; label: string }[]
    placeholder?: string
    description?: string
}

interface Props {
    fields: ConfigFieldDef[]
    initialValues: Record<string, unknown>
    /** Section title (rendered as h3) */
    title?: string
    /** If true, section starts collapsed */
    collapsible?: boolean
    /** Label overrides */
    labels?: {
        save?: string
        saved?: string
        settings?: string
    }
}

// ── Component ──────────────────────────────────────────────────────────

export default function ModuleConfigSection({
    fields,
    initialValues,
    title,
    collapsible = false,
    labels = {},
}: Props) {
    const [values, setValues] = useState<Record<string, unknown>>(initialValues)
    const [isPending, startTransition] = useTransition()
    const [saved, setSaved] = useState(false)
    const [expanded, setExpanded] = useState(!collapsible)

    // Track which fields have been modified
    const hasChanges = fields.some(f => {
        const initial = initialValues[f.key]
        const current = values[f.key]
        return String(initial ?? '') !== String(current ?? '')
    })

    const handleSave = useCallback(() => {
        // Only send changed fields
        const updates: Record<string, unknown> = {}
        for (const field of fields) {
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
                setTimeout(() => setSaved(false), 2000)
            }
        })
    }, [fields, values, initialValues])

    const updateValue = (key: string, value: unknown) => {
        setValues(prev => ({ ...prev, [key]: value }))
        setSaved(false)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl overflow-hidden"
        >
            {/* Header */}
            <button
                onClick={collapsible ? () => setExpanded(!expanded) : undefined}
                className={`w-full flex items-center justify-between px-6 py-4 ${
                    collapsible ? 'cursor-pointer hover:bg-glass transition-colors' : 'cursor-default'
                }`}
            >
                <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-tx-muted" />
                    <h3 className="text-sm font-semibold text-tx">
                        {title || labels.settings || 'Settings'}
                    </h3>
                </div>
                {collapsible && (
                    <motion.span
                        animate={{ rotate: expanded ? 180 : 0 }}
                        className="text-tx-muted text-xs"
                    >
                        ▼
                    </motion.span>
                )}
            </button>

            {/* Fields */}
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 space-y-4">
                            {fields.map(field => (
                                <div key={field.key}>
                                    {field.type !== 'toggle' && (
                                        <label
                                            htmlFor={`cfg-${field.key}`}
                                            className="block text-xs font-semibold text-tx-muted uppercase tracking-wide mb-1.5"
                                        >
                                            {field.label}
                                        </label>
                                    )}
                                    {field.description && (
                                        <p className="text-xs text-tx-muted mb-2">{field.description}</p>
                                    )}

                                    {/* Text / Email input */}
                                    {(field.type === 'text' || field.type === 'email') && (
                                        <input
                                            id={`cfg-${field.key}`}
                                            type={field.type}
                                            value={String(values[field.key] ?? '')}
                                            onChange={e => updateValue(field.key, e.target.value)}
                                            placeholder={field.placeholder}
                                            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm text-tx text-sm focus:ring-2 focus:ring-soft transition-all outline-none"
                                        />
                                    )}

                                    {/* Number input */}
                                    {field.type === 'number' && (
                                        <input
                                            id={`cfg-${field.key}`}
                                            type="number"
                                            inputMode="decimal"
                                            value={String(values[field.key] ?? '')}
                                            onChange={e => updateValue(field.key, e.target.value ? Number(e.target.value) : '')}
                                            placeholder={field.placeholder}
                                            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm text-tx text-sm focus:ring-2 focus:ring-soft transition-all outline-none"
                                        />
                                    )}

                                    {/* Select */}
                                    {field.type === 'select' && field.options && (
                                        <select
                                            id={`cfg-${field.key}`}
                                            value={String(values[field.key] ?? '')}
                                            onChange={e => updateValue(field.key, e.target.value)}
                                            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm text-tx text-sm focus:ring-2 focus:ring-soft transition-all outline-none appearance-none cursor-pointer"
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
                                                htmlFor={`cfg-${field.key}`}
                                                className="text-sm font-medium text-tx cursor-pointer"
                                            >
                                                {field.label}
                                            </label>
                                            <button
                                                id={`cfg-${field.key}`}
                                                role="switch"
                                                aria-checked={Boolean(values[field.key])}
                                                onClick={() => updateValue(field.key, !values[field.key])}
                                                className={`relative w-11 h-6 rounded-full transition-colors ${
                                                    values[field.key]
                                                        ? 'bg-brand'
                                                        : 'bg-sf-3'
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

                                    {/* Textarea */}
                                    {field.type === 'textarea' && (
                                        <textarea
                                            id={`cfg-${field.key}`}
                                            value={String(values[field.key] ?? '')}
                                            onChange={e => updateValue(field.key, e.target.value)}
                                            placeholder={field.placeholder}
                                            rows={3}
                                            className="w-full px-4 py-3 min-h-[80px] rounded-xl bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm text-tx text-sm focus:ring-2 focus:ring-soft transition-all outline-none resize-none"
                                        />
                                    )}
                                </div>
                            ))}

                            {/* Save button */}
                            <motion.button
                                onClick={handleSave}
                                disabled={isPending || !hasChanges}
                                className="btn btn-primary inline-flex items-center gap-2 text-sm min-h-[44px] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                                whileTap={{ scale: 0.97 }}
                            >
                                {isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : saved ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isPending ? '...' : saved ? (labels.saved || '✓ Saved') : (labels.save || 'Save')}
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
