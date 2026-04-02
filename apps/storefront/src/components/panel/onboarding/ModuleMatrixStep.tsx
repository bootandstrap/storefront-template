'use client'

/**
 * ModuleMatrixStep — Visual grid of all 12 modules showing active/inactive status
 *
 * Active modules: full color with check + tier badge
 * Inactive modules: greyed out with lock icon + "Activar" CTA
 * Grouped by category (sell/engage/grow/automate)
 */

import { motion } from 'framer-motion'
import { Check, Lock } from 'lucide-react'
import type { ModuleInfo } from './OnboardingWizard'

interface ModuleMatrixStepProps {
    modules: ModuleInfo[]
    locale: string
    onContinue: () => void
    onBack: () => void
    t: (key: string, fallback?: string) => string
}

const CATEGORY_COLORS: Record<string, string> = {
    sell: '#22c55e',
    engage: '#3b82f6',
    grow: '#06b6d4',
    automate: '#f59e0b',
}

const CATEGORY_ICONS: Record<string, string> = {
    sell: '🛍️',
    engage: '💬',
    grow: '🌍',
    automate: '⚡',
}

export default function ModuleMatrixStep({
    modules,
    locale,
    onContinue,
    onBack,
    t,
}: ModuleMatrixStepProps) {
    const activeCount = modules.filter(m => m.active).length
    const totalCount = modules.length

    // Group by category
    const grouped = modules.reduce<Record<string, ModuleInfo[]>>((acc, mod) => {
        const cat = mod.category || 'other'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(mod)
        return acc
    }, {})

    return (
        <div className="px-6 py-6">
            {/* Header */}
            <div className="mb-5">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-brand-subtle flex items-center justify-center">
                        <span className="text-xl">🧩</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-display text-tx">
                            {t('onboarding.modules.title', 'Tu Plataforma')}
                        </h2>
                        <p className="text-xs text-tx-muted">
                            {t('onboarding.modules.subtitle', '{{active}} de {{total}} módulos activos')
                                .replace('{{active}}', String(activeCount))
                                .replace('{{total}}', String(totalCount))}
                        </p>
                    </div>
                </div>
            </div>

            {/* Module grid by category */}
            <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                {Object.entries(grouped).map(([category, mods]) => {
                    const catColor = CATEGORY_COLORS[category] || '#666'
                    const catIcon = CATEGORY_ICONS[category] || '📦'
                    const catLabel = t(`onboarding.category.${category}`, category)
                    return (
                        <div key={category}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-tx-faint uppercase tracking-wider">
                                    {catIcon} {catLabel}
                                </span>
                                <div className="flex-1 h-px bg-sf-3" />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {mods.map((mod, i) => (
                                    <motion.div
                                        key={mod.key}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05, duration: 0.3 }}
                                        className={`relative rounded-xl border p-3 transition-all ${
                                            mod.active
                                                ? 'border-brand/30 bg-brand-subtle/50'
                                                : 'border-sf-3 bg-sf-2/50 opacity-60'
                                        }`}
                                    >
                                        {/* Status icon */}
                                        <div className="absolute top-2 right-2">
                                            {mod.active ? (
                                                <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-sf-3 flex items-center justify-center">
                                                    <Lock className="w-3 h-3 text-tx-faint" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Module info */}
                                        <div className="flex items-start gap-2">
                                            <span className="text-lg flex-shrink-0 mt-0.5">{mod.icon}</span>
                                            <div className="min-w-0">
                                                <p className={`text-xs font-semibold truncate ${
                                                    mod.active ? 'text-tx' : 'text-tx-muted'
                                                }`}>
                                                    {mod.name}
                                                </p>
                                                {mod.active && mod.tierName && (
                                                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-brand/10 text-brand">
                                                        {mod.tierName}
                                                    </span>
                                                )}
                                                {!mod.active && (
                                                    <a
                                                        href={`/${locale}/panel/modulos`}
                                                        className="inline-block mt-1 text-[10px] font-medium text-brand hover:underline"
                                                    >
                                                        {t('onboarding.modules.activate', 'Activar →')}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center mt-5 pt-4 border-t border-sf-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-sm text-tx-muted hover:text-tx transition-colors"
                >
                    ← {t('onboarding.back', 'Volver')}
                </button>
                <button
                    type="button"
                    onClick={onContinue}
                    className="btn btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    {t('onboarding.continue', 'Continuar')} →
                </button>
            </div>
        </div>
    )
}
