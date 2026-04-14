'use client'

/**
 * ModuleSetupOrchestrator — Master onboarding experience
 *
 * Detects purchased modules from tenant capabilities, fetches real usage
 * data, and renders a ModuleSetupCard for each active module.
 *
 * Shows as hero section on first login (onboarding_completed === false)
 * and is always accessible from dashboard via "Configurar módulos" link.
 *
 * @module components/panel/ModuleSetupOrchestrator
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Rocket, CheckCircle2, ChevronDown, Sparkles, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

import ModuleSetupCard from './ModuleSetupCard'
import { getActiveModuleSetups, type ModuleSetupDef } from '@/lib/registries/module-setup-registry'
import { PageEntrance } from '@/components/panel/PanelAnimations'
import { completeOnboardingAction } from '@/app/[lang]/(panel)/panel/actions'

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
            console.error('[onboarding] Failed to complete')
        } finally {
            setCompleting(false)
        }
    }, [onComplete])

    // Don't render if dismissed or completed and compact
    if (dismissed && compact) return null
    if (onboardingCompleted && compact && setupDefs.length === 0) return null

    // Calculate overall readiness
    const totalModules = setupDefs.length
    const modulesWithActions = setupDefs.filter(s => s.quickActions.length > 0).length

    return (
        <PageEntrance>
            <div className={`${compact ? '' : 'space-y-6'}`}>
                {/* ── Header ────────────────────────────────────────── */}
                {!compact && (
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-brand/20 to-brand/5 border border-brand/20">
                                <Rocket className="w-7 h-7 text-brand" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-tx-pri flex items-center gap-2">
                                    Configura tus módulos
                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                </h2>
                                <p className="text-sm text-tx-sec mt-0.5">
                                    {totalModules} módulo{totalModules !== 1 ? 's' : ''} activo{totalModules !== 1 ? 's' : ''}
                                    {' · '}Personaliza cada uno con tus datos y preferencias
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {!onboardingCompleted && (
                                <button
                                    onClick={handleComplete}
                                    disabled={completing}
                                    className="px-4 py-2 text-sm font-medium rounded-xl bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {completing ? 'Guardando...' : 'Completar setup'}
                                </button>
                            )}
                            {compact && (
                                <button
                                    onClick={() => setDismissed(true)}
                                    className="p-1.5 rounded-lg hover:bg-sf-sec transition-colors"
                                >
                                    <X className="w-4 h-4 text-tx-ter" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Module Cards ──────────────────────────────────── */}
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 rounded-2xl bg-sf-sec animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {setupDefs.map((setup, idx) => {
                            const info = moduleInfoMap[setup.moduleKey]
                            return (
                                <motion.div
                                    key={setup.moduleKey}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.08 }}
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
                    </div>
                )}

                {/* ── Footer (compact: skip link) ──────────────────── */}
                {!onboardingCompleted && !compact && totalModules > 0 && (
                    <div className="text-center pt-2">
                        <button
                            onClick={handleComplete}
                            className="text-sm text-tx-ter hover:text-tx-sec transition-colors underline underline-offset-2"
                        >
                            Saltar configuración y empezar directamente
                        </button>
                    </div>
                )}
            </div>
        </PageEntrance>
    )
}
