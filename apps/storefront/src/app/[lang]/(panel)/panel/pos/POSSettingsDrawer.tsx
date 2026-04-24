'use client'

/**
 * POSSettingsDrawer — Slide-over drawer for POS-specific config
 *
 * Phase 6A: Allows editing receipt header/footer, default payment method,
 * tax display, tips, and sounds from within the POS interface.
 * Uses the same governance pipeline (saveOnboardingConfigAction).
 */

import { useState, useCallback, useTransition } from 'react'
import { X, Settings, Save, Loader2, Check, Receipt, Volume2, Timer, BarChart3, Wifi, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { saveOnboardingConfigAction } from '@/app/[lang]/(panel)/panel/actions'
import { posLabel } from '@/lib/pos/pos-i18n'

// ── Config field definitions — loaded from centralized SSOT registry ──
import { POS_SETTINGS_SCHEMA, type ConfigFieldDefWithGroup } from '@/lib/registries/module-config-schemas'

const ICON_MAP: Record<string, typeof Receipt> = { Receipt, Volume2 }

const POS_SETTINGS_FIELDS = POS_SETTINGS_SCHEMA.map(f => ({
    ...f,
    icon: f.iconKey ? ICON_MAP[f.iconKey] : undefined,
}))

// ── Props ──────────────────────────────────────────────────────────

interface Props {
    isOpen: boolean
    onClose: () => void
    initialValues: Record<string, unknown>
    labels: Record<string, string>
    kioskFlags?: {
        enable_kiosk_idle_timer: boolean
        enable_kiosk_analytics: boolean
        enable_kiosk_remote_management: boolean
    }
}

// ── Component ─────────────────────────────────────────────────────

export default function POSSettingsDrawer({ isOpen, onClose, initialValues, labels, kioskFlags }: Props) {
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

    const showKioskSection = kioskFlags && (
        kioskFlags.enable_kiosk_idle_timer ||
        kioskFlags.enable_kiosk_analytics ||
        kioskFlags.enable_kiosk_remote_management
    )

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

                            {/* Kiosk Settings Section */}
                            {showKioskSection && (
                                <div>
                                    <h3 className="text-xs font-bold text-tx-muted uppercase tracking-wider mb-3">
                                        📱 Kiosk
                                    </h3>
                                    <div className="space-y-3">
                                        {/* Idle Timer */}
                                        <div className={`rounded-xl border p-4 transition-all ${
                                            kioskFlags!.enable_kiosk_idle_timer
                                                ? 'border-sf-3 bg-sf-0'
                                                : 'border-sf-3 bg-sf-0 opacity-50'
                                        }`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Timer className="w-4 h-4 text-brand" />
                                                    <span className="text-sm font-medium text-tx">Temporizador inactividad</span>
                                                </div>
                                                {!kioskFlags!.enable_kiosk_idle_timer && (
                                                    <span className="flex items-center gap-1 text-xs text-tx-muted">
                                                        <Lock className="w-3 h-3" /> Pro
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-tx-muted mb-2">
                                                Tiempo antes de mostrar pantalla de atracción
                                            </p>
                                            {kioskFlags!.enable_kiosk_idle_timer ? (
                                                <div className="flex gap-2">
                                                    {[30, 60, 120, 300].map(sec => (
                                                        <button
                                                            key={sec}
                                                            onClick={() => updateValue('kiosk_idle_timeout', sec)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                                (values.kiosk_idle_timeout ?? 60) === sec
                                                                    ? 'bg-brand text-white'
                                                                    : 'bg-sf-1 text-tx-sec hover:bg-sf-2'
                                                            }`}
                                                        >
                                                            {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>

                                        {/* Kiosk Analytics */}
                                        <div className={`rounded-xl border p-4 transition-all ${
                                            kioskFlags!.enable_kiosk_analytics
                                                ? 'border-sf-3 bg-sf-0'
                                                : 'border-sf-3 bg-sf-0 opacity-50'
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <BarChart3 className="w-4 h-4 text-emerald-500" />
                                                    <span className="text-sm font-medium text-tx">Analíticas de kiosco</span>
                                                </div>
                                                {kioskFlags!.enable_kiosk_analytics ? (
                                                    <span className="text-xs text-emerald-500 font-medium">Activo</span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs text-tx-muted">
                                                        <Lock className="w-3 h-3" /> Enterprise
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-tx-muted mt-1">
                                                {kioskFlags!.enable_kiosk_analytics
                                                    ? 'Sesiones, duración media, productos más vistos en kiosco'
                                                    : 'Métricas de uso del kiosco disponibles en Enterprise'
                                                }
                                            </p>
                                        </div>

                                        {/* Remote Management */}
                                        <div className={`rounded-xl border p-4 transition-all ${
                                            kioskFlags!.enable_kiosk_remote_management
                                                ? 'border-sf-3 bg-sf-0'
                                                : 'border-sf-3 bg-sf-0 opacity-50'
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Wifi className="w-4 h-4 text-blue-500" />
                                                    <span className="text-sm font-medium text-tx">Gestión remota</span>
                                                </div>
                                                {kioskFlags!.enable_kiosk_remote_management ? (
                                                    <span className="text-xs text-blue-500 font-medium">Activo</span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs text-tx-muted">
                                                        <Lock className="w-3 h-3" /> Enterprise
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-tx-muted mt-1">
                                                {kioskFlags!.enable_kiosk_remote_management
                                                    ? 'Controla dispositivos kiosco remotamente, reinicia sesiones y actualiza menú'
                                                    : 'Control remoto de dispositivos kiosco disponible en Enterprise'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
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
