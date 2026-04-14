'use client'

/**
 * ModuleSetupCard — Per-module onboarding experience
 *
 * Renders a single module's setup card with:
 * 1. Header: icon + name + tier badge
 * 2. Usage meters: real-time progress bars (X/Y limit)
 * 3. Active features: what this tier unlocks
 * 4. Inline config: editable settings (uses ModuleConfigSection)
 * 5. Quick actions: recommended first steps checklist
 *
 * SOTA design with glassmorphism, framer-motion animations.
 * @module components/panel/ModuleSetupCard
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronDown, ChevronUp, CheckCircle2, Circle, Sparkles,
    ArrowRight, Settings, Zap, Star,
} from 'lucide-react'
import ModuleConfigSection from '@/components/panel/ModuleConfigSection'
import type { ModuleSetupDef, ModuleUsageMetric } from '@/lib/registries/module-setup-registry'

// ── Types ─────────────────────────────────────────────────────────────

interface UsageData {
    [limitKey: string]: {
        current: number
        limit: number
        percentage: number
    }
}

interface ModuleSetupCardProps {
    /** Module setup definition from registry */
    setup: ModuleSetupDef
    /** Real usage data fetched from API */
    usage: UsageData
    /** Active feature flags for this module */
    activeFeatures: string[]
    /** All feature labels (flag_key → human label) */
    featureLabels: Record<string, string>
    /** Current config values */
    configValues: Record<string, unknown>
    /** Completed quick actions */
    completedActions: Set<string>
    /** Tier name (e.g. "Pro", "Enterprise") */
    tierName?: string
    /** Module icon emoji */
    moduleIcon?: string
    /** Module display name */
    moduleName?: string
    /** Whether this module was recently purchased */
    isNew?: boolean
    /** Language for routing */
    lang?: string
    /** Callback when quick action is clicked */
    onQuickAction?: (href: string) => void
}

// ── Helpers ───────────────────────────────────────────────────────────

function getProgressColor(pct: number): string {
    if (pct >= 90) return 'from-red-500 to-red-400'
    if (pct >= 70) return 'from-amber-500 to-yellow-400'
    return 'from-emerald-500 to-green-400'
}

function getProgressBg(pct: number): string {
    if (pct >= 90) return 'bg-red-500/10'
    if (pct >= 70) return 'bg-amber-500/10'
    return 'bg-emerald-500/10'
}

// ── Component ─────────────────────────────────────────────────────────

export default function ModuleSetupCard({
    setup,
    usage,
    activeFeatures,
    featureLabels,
    configValues,
    completedActions,
    tierName = 'Basic',
    moduleIcon,
    moduleName,
    isNew = false,
    lang = 'es',
    onQuickAction,
}: ModuleSetupCardProps) {
    const [expanded, setExpanded] = useState(true)
    const [showConfig, setShowConfig] = useState(false)

    // Calculate overall completion
    const totalActions = setup.quickActions.length
    const doneActions = setup.quickActions.filter(a => {
        if (a.autoDone && a.doneWhen) {
            const u = usage[a.doneWhen]
            return u && u.current > 0
        }
        return completedActions.has(a.href)
    }).length
    const completionPct = totalActions > 0 ? Math.round((doneActions / totalActions) * 100) : 100
    const isComplete = completionPct === 100

    // Filter active features to non-trivial ones
    const meaningfulFeatures = useMemo(() =>
        activeFeatures
            .filter(f => featureLabels[f])
            .slice(0, 8),
    [activeFeatures, featureLabels])

    return (
        <motion.div
            layout
            className={`rounded-2xl border overflow-hidden transition-colors ${
                isComplete
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-brd-pri bg-sf-pri'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* ── Header ────────────────────────────────────────────── */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-sf-sec/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl" role="img">{moduleIcon || '📦'}</span>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-tx-pri">
                                {moduleName || setup.moduleKey}
                            </h3>
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-brand/10 text-brand">
                                {tierName}
                            </span>
                            {isNew && (
                                <motion.span
                                    className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-600 flex items-center gap-1"
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ repeat: 3, duration: 1.5 }}
                                >
                                    <Sparkles className="w-3 h-3" /> Nuevo
                                </motion.span>
                            )}
                        </div>
                        <p className="text-xs text-tx-ter mt-0.5">{setup.description_es}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Completion indicator */}
                    {totalActions > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-sf-ter rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full rounded-full bg-gradient-to-r ${isComplete ? 'from-emerald-500 to-green-400' : 'from-brand to-brand/70'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${completionPct}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                />
                            </div>
                            <span className="text-xs text-tx-ter font-mono">
                                {doneActions}/{totalActions}
                            </span>
                        </div>
                    )}
                    {isComplete && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    )}
                    {expanded ? (
                        <ChevronUp className="w-4 h-4 text-tx-ter" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-tx-ter" />
                    )}
                </div>
            </button>

            {/* ── Expandable content ────────────────────────────────── */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 space-y-4">
                            {/* ── Usage Meters ──────────────────────────── */}
                            {setup.usageMetrics.length > 0 && (
                                <div className="space-y-2.5">
                                    <h4 className="text-xs font-semibold text-tx-ter uppercase tracking-wider flex items-center gap-1.5">
                                        <Zap className="w-3 h-3" /> Tu uso actual
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {setup.usageMetrics.map(metric => {
                                            const u = usage[metric.limitKey]
                                            const current = u?.current ?? 0
                                            const limit = u?.limit ?? 0
                                            const pct = u?.percentage ?? 0
                                            return (
                                                <UsageMeter
                                                    key={metric.limitKey}
                                                    metric={metric}
                                                    current={current}
                                                    limit={limit}
                                                    percentage={pct}
                                                />
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── Active Features ──────────────────────────── */}
                            {meaningfulFeatures.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-tx-ter uppercase tracking-wider flex items-center gap-1.5">
                                        <Star className="w-3 h-3" /> Funcionalidades activas
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {meaningfulFeatures.map(flag => (
                                            <span
                                                key={flag}
                                                className="px-2.5 py-1 text-xs rounded-lg bg-brand/8 text-brand border border-brand/15"
                                            >
                                                ✓ {featureLabels[flag] || flag.replace(/^enable_/, '').replace(/_/g, ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Quick Actions ────────────────────────────── */}
                            {setup.quickActions.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-tx-ter uppercase tracking-wider">
                                        📋 Primeros pasos
                                    </h4>
                                    <div className="space-y-1">
                                        {setup.quickActions.map(action => {
                                            const isDone =
                                                (action.autoDone && action.doneWhen && usage[action.doneWhen]?.current > 0) ||
                                                completedActions.has(action.href)
                                            return (
                                                <button
                                                    key={`${action.href}::${action.label}`}
                                                    onClick={() => onQuickAction?.(action.href)}
                                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                                                        isDone
                                                            ? 'text-tx-ter line-through opacity-60'
                                                            : 'hover:bg-sf-sec text-tx-sec'
                                                    }`}
                                                    disabled={isDone}
                                                >
                                                    {isDone ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                    ) : (
                                                        <Circle className="w-4 h-4 text-tx-ter flex-shrink-0" />
                                                    )}
                                                    <span className="flex-1">{action.label}</span>
                                                    {!isDone && <ArrowRight className="w-3.5 h-3.5 text-tx-ter" />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── Config Section Toggle ────────────────────── */}
                            {setup.configFields.length > 0 && (
                                <div>
                                    <button
                                        onClick={() => setShowConfig(!showConfig)}
                                        className="flex items-center gap-2 text-sm text-brand hover:text-brand/80 transition-colors font-medium"
                                    >
                                        <Settings className="w-4 h-4" />
                                        {showConfig ? 'Ocultar configuración' : 'Configuración rápida'}
                                        {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>

                                    <AnimatePresence>
                                        {showConfig && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="mt-3 overflow-hidden"
                                            >
                                                <ModuleConfigSection
                                                    fields={setup.configFields}
                                                    initialValues={configValues}
                                                    labels={{
                                                        save: 'Guardar',
                                                        saved: '✓ Guardado',
                                                        settings: 'Configuración',
                                                    }}
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// ── Sub-components ────────────────────────────────────────────────────

function UsageMeter({
    metric,
    current,
    limit,
    percentage,
}: {
    metric: ModuleUsageMetric
    current: number
    limit: number
    percentage: number
}) {
    const isUnlimited = limit === 0 || !isFinite(limit)
    const displayLimit = isUnlimited ? '∞' : limit.toLocaleString()
    const pct = isUnlimited ? 0 : Math.min(percentage, 100)

    return (
        <div className={`px-3 py-2.5 rounded-xl ${getProgressBg(pct)} border border-white/5`}>
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-tx-sec font-medium">{metric.label}</span>
                <span className="text-xs font-mono text-tx-pri font-semibold">
                    {current.toLocaleString()}{metric.unit ? '' : ''} / {displayLimit}{metric.unit || ''}
                </span>
            </div>
            <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(pct)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                />
            </div>
        </div>
    )
}
