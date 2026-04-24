'use client'

/**
 * ModuleSetupOrchestrator — SOTA Master Onboarding Experience
 *
 * Detects purchased modules from tenant capabilities, fetches real usage
 * data, and renders a ModuleSetupCard for each active module.
 *
 * SOTA upgrades (v2.0 — 2026-04-15):
 * - Glassmorphism header with progress ring
 * - Staggered Framer Motion entrance animations
 * - Shimmer loading skeleton matching card layout
 * - "🎉 New!" pulse badge for newly-activated modules
 * - Tier-aware gradient accents per module
 *
 * Shows as hero section on first login (onboarding_completed === false)
 * and is always accessible from dashboard via "Configurar módulos" link.
 *
 * @module components/panel/ModuleSetupOrchestrator
 * @version 2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Rocket, CheckCircle2, Sparkles, X,
    ChevronRight, Zap, PartyPopper,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import ModuleSetupCard from './ModuleSetupCard'
import { getActiveModuleSetups, type ModuleSetupDef } from '@/lib/registries/module-setup-registry'
import { PageEntrance } from '@/components/panel/PanelAnimations'
import { completeOnboardingAction } from '@/app/[lang]/(panel)/panel/actions'
import { logger } from '@/lib/logger'

// ── Types ─────────────────────────────────────────────────────────────

interface ModuleTierInfo {
    moduleKey: string
    tierName: string
    icon?: string
    displayName?: string
    isNew?: boolean
}

interface OrchestratorProps {
    /** Tenant's active module keys with tier info */
    activeModules: ModuleTierInfo[]
    /** Feature flags (to show active features per module) */
    featureFlags: Record<string, boolean>
    /** Feature flag labels */
    featureLabels: Record<string, string>
    /** Current config values for all modules */
    configValues: Record<string, unknown>
    /** Whether onboarding has been completed */
    onboardingCompleted: boolean
    /** Language for routing */
    lang?: string
    /** Compact mode (for dashboard widget vs full page) */
    compact?: boolean
    /** Called when onboarding is completed */
    onComplete?: () => void
}

// ── Progress Ring SVG ─────────────────────────────────────────────────

function ProgressRing({ progress, size = 56, strokeWidth = 4 }: {
    progress: number
    size?: number
    strokeWidth?: number
}) {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (progress / 100) * circumference
    const isComplete = progress >= 100

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg
                className="transform -rotate-90"
                width={size}
                height={size}
            >
                {/* Background track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    className="text-sf-3/40"
                    strokeWidth={strokeWidth}
                />
                {/* Progress arc */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    className={isComplete ? 'text-emerald-500' : 'text-brand'}
                    style={{
                        strokeDasharray: circumference,
                    }}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    stroke="currentColor"
                />
            </svg>
            {/* Center icon/text */}
            <div className="absolute inset-0 flex items-center justify-center">
                {isComplete ? (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 1.2 }}
                    >
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </motion.div>
                ) : (
                    <span className="text-xs font-bold text-tx-pri">{Math.round(progress)}%</span>
                )}
            </div>
        </div>
    )
}

// ── Shimmer Skeleton ──────────────────────────────────────────────────

function ModuleCardSkeleton({ index }: { index: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="relative overflow-hidden rounded-2xl border border-brd-pri bg-sf-pri"
        >
            <div className="px-5 py-4 flex items-center gap-3">
                {/* Icon placeholder */}
                <div className="w-10 h-10 rounded-xl bg-sf-sec shimmer-loading" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded-lg bg-sf-sec shimmer-loading" />
                    <div className="h-3 w-48 rounded-lg bg-sf-sec shimmer-loading" />
                </div>
                <div className="w-16 h-2 rounded-full bg-sf-sec shimmer-loading" />
            </div>
            <div className="px-5 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div className="h-14 rounded-xl bg-sf-sec shimmer-loading" />
                    <div className="h-14 rounded-xl bg-sf-sec shimmer-loading" />
                </div>
                <div className="flex gap-1.5">
                    <div className="h-6 w-20 rounded-lg bg-sf-sec shimmer-loading" />
                    <div className="h-6 w-24 rounded-lg bg-sf-sec shimmer-loading" />
                    <div className="h-6 w-16 rounded-lg bg-sf-sec shimmer-loading" />
                </div>
            </div>

            {/* Shimmer overlay animation */}
            <style jsx>{`
                .shimmer-loading {
                    background: linear-gradient(
                        90deg,
                        var(--color-sf-2, #e5e7eb) 0%,
                        var(--color-sf-1, #f3f4f6) 40%,
                        var(--color-sf-2, #e5e7eb) 80%
                    );
                    background-size: 200% 100%;
                    animation: shimmer 1.8s ease-in-out infinite;
                }
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </motion.div>
    )
}

// ── Stagger Animation Variants ────────────────────────────────────────

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.2,
        },
    },
} as const

const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 300,
            damping: 25,
        },
    },
} as const

// ── Component ─────────────────────────────────────────────────────────

export default function ModuleSetupOrchestrator({
    activeModules,
    featureFlags,
    featureLabels,
    configValues,
    onboardingCompleted,
    lang = 'es',
    compact = false,
    onComplete,
}: OrchestratorProps) {
    const router = useRouter()
    const [usageData, setUsageData] = useState<Record<string, Record<string, { current: number; limit: number; percentage: number }>>>({})
    const [completedActions, setCompletedActions] = useState(new Set<string>())
    const [dismissed, setDismissed] = useState(false)
    const [completing, setCompleting] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Get setup defs for active modules
    const moduleKeys = useMemo(() => activeModules.map(m => m.moduleKey), [activeModules])
    const setupDefs = useMemo(() => getActiveModuleSetups(moduleKeys), [moduleKeys])

    // Build module info map
    const moduleInfoMap = useMemo(() => {
        const map: Record<string, ModuleTierInfo> = {}
        for (const mod of activeModules) {
            map[mod.moduleKey] = mod
        }
        return map
    }, [activeModules])

    // Get features per module
    const featuresPerModule = useMemo(() => {
        const result: Record<string, string[]> = {}
        for (const setup of setupDefs) {
            // A feature belongs to this module if it matches the module key pattern
            const moduleFlags = Object.entries(featureFlags)
                .filter(([key, val]) => val === true)
                .map(([key]) => key)
            result[setup.moduleKey] = moduleFlags
        }
        return result
    }, [setupDefs, featureFlags])

    // Calculate overall setup progress
    const overallProgress = useMemo(() => {
        if (setupDefs.length === 0) return 100
        let totalActions = 0
        let doneActions = 0
        for (const setup of setupDefs) {
            totalActions += setup.quickActions.length
            for (const action of setup.quickActions) {
                const moduleUsage = usageData[setup.moduleKey] || {}
                if (action.autoDone && action.doneWhen) {
                    const u = moduleUsage[action.doneWhen]
                    if (u && u.current > 0) doneActions++
                } else if (completedActions.has(action.href)) {
                    doneActions++
                }
            }
        }
        return totalActions > 0 ? Math.round((doneActions / totalActions) * 100) : 100
    }, [setupDefs, usageData, completedActions])

    const hasNewModules = useMemo(() =>
        activeModules.some(m => m.isNew),
    [activeModules])

    // Fetch usage data for all module metrics
    useEffect(() => {
        async function fetchUsage() {
            try {
                // Collect all unique limit keys
                const allLimitKeys = new Set<string>()
                for (const setup of setupDefs) {
                    for (const metric of setup.usageMetrics) {
                        allLimitKeys.add(metric.limitKey)
                    }
                }

                if (allLimitKeys.size === 0) {
                    setIsLoading(false)
                    return
                }

                const res = await fetch(`/api/panel/limits?resources=${Array.from(allLimitKeys).join(',')}`)
                if (res.ok) {
                    const data = await res.json()
                    // Group by module
                    const grouped: typeof usageData = {}
                    for (const setup of setupDefs) {
                        grouped[setup.moduleKey] = {}
                        for (const metric of setup.usageMetrics) {
                            if (data[metric.limitKey]) {
                                grouped[setup.moduleKey][metric.limitKey] = data[metric.limitKey]
                            }
                        }
                    }
                    setUsageData(grouped)
                }
            } catch {
                // Fail-open
            } finally {
                setIsLoading(false)
            }
        }
        fetchUsage()
    }, [setupDefs])

    // Handle quick action navigation
    const handleQuickAction = useCallback((href: string) => {
        router.push(`/${lang}${href}`)
    }, [router, lang])

    // Complete onboarding
    const handleComplete = useCallback(async () => {
        setCompleting(true)
        try {
            await completeOnboardingAction()
            onComplete?.()
        } catch {
            logger.error('[onboarding] Failed to complete')
        } finally {
            setCompleting(false)
        }
    }, [onComplete])

    // Don't render if dismissed or completed and compact
    if (dismissed && compact) return null
    if (onboardingCompleted && compact && setupDefs.length === 0) return null

    const totalModules = setupDefs.length

    return (
        <PageEntrance>
            <div className={`${compact ? '' : 'space-y-6'}`}>
                {/* ── Header with glass treatment ────────────────────── */}
                {!compact && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="relative overflow-hidden rounded-2xl border border-white/10"
                    >
                        {/* Glass background */}
                        <div className="relative bg-sf-0/80 backdrop-blur-xl p-6">
                            {/* Subtle gradient mesh */}
                            <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
                                <div className="absolute top-0 left-0 w-48 h-48 rounded-full bg-brand blur-3xl" />
                                <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full bg-violet-500 blur-3xl" />
                            </div>

                            <div className="relative flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    {/* Progress ring */}
                                    <ProgressRing progress={overallProgress} />

                                    <div>
                                        <h2 className="text-xl font-bold text-tx-pri flex items-center gap-2">
                                            Configura tus módulos
                                            {hasNewModules && (
                                                <motion.span
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-xs font-semibold"
                                                    animate={{ scale: [1, 1.05, 1] }}
                                                    transition={{ repeat: 5, duration: 2 }}
                                                >
                                                    <PartyPopper className="w-3 h-3" />
                                                    ¡Novedades!
                                                </motion.span>
                                            )}
                                        </h2>
                                        <p className="text-sm text-tx-sec mt-0.5 flex items-center gap-1.5">
                                            <Zap className="w-3.5 h-3.5 text-brand" />
                                            {totalModules} módulo{totalModules !== 1 ? 's' : ''} activo{totalModules !== 1 ? 's' : ''}
                                            <span className="text-tx-faint">·</span>
                                            Personaliza cada uno con tus datos
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {!onboardingCompleted && (
                                        <motion.button
                                            onClick={handleComplete}
                                            disabled={completing}
                                            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-brand to-brand/85 text-white shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30 transition-shadow disabled:opacity-50 flex items-center gap-2"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            {completing ? 'Guardando...' : 'Completar setup'}
                                        </motion.button>
                                    )}
                                    {compact && (
                                        <button
                                            onClick={() => setDismissed(true)}
                                            className="p-2 rounded-xl hover:bg-sf-2/50 transition-colors"
                                        >
                                            <X className="w-4 h-4 text-tx-ter" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ── Module Cards with stagger animation ──────────── */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[0, 1, 2].map(i => (
                            <ModuleCardSkeleton key={i} index={i} />
                        ))}
                    </div>
                ) : (
                    <motion.div
                        className="space-y-3"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {setupDefs.map((setup) => {
                            const info = moduleInfoMap[setup.moduleKey]
                            return (
                                <motion.div
                                    key={setup.moduleKey}
                                    variants={cardVariants}
                                >
                                    <ModuleSetupCard
                                        setup={setup}
                                        usage={usageData[setup.moduleKey] || {}}
                                        activeFeatures={featuresPerModule[setup.moduleKey] || []}
                                        featureLabels={featureLabels}
                                        configValues={configValues}
                                        completedActions={completedActions}
                                        tierName={info?.tierName || 'Basic'}
                                        moduleIcon={info?.icon}
                                        moduleName={info?.displayName}
                                        isNew={info?.isNew}
                                        lang={lang}
                                        onQuickAction={handleQuickAction}
                                    />
                                </motion.div>
                            )
                        })}
                    </motion.div>
                )}

                {/* ── Footer (skip link) ───────────────────────────── */}
                {!onboardingCompleted && !compact && totalModules > 0 && (
                    <motion.div
                        className="text-center pt-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                    >
                        <button
                            onClick={handleComplete}
                            className="group inline-flex items-center gap-1.5 text-sm text-tx-ter hover:text-tx-sec transition-colors"
                        >
                            Saltar configuración y empezar directamente
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </motion.div>
                )}
            </div>
        </PageEntrance>
    )
}
