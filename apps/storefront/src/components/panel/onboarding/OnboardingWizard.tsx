'use client'

/**
 * OnboardingWizard — SOTA multi-step onboarding for owner panel
 *
 * 5-step wizard with Framer Motion animated transitions:
 *   1. Welcome — animated brand splash
 *   2. Module Matrix — active/inactive module overview with upsell
 *   3. Language Config — E2E panel + storefront language selection
 *   4. Module Config — per-module meaningful first config
 *   5. Completion — success celebration + CTA
 *
 * Uses Framer Motion AnimatePresence for directional slide transitions.
 * Persists via server actions (not fetch) for reliable auth propagation.
 */

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import WelcomeStep from './WelcomeStep'
import ModuleMatrixStep from './ModuleMatrixStep'
import LanguageStep from './LanguageStep'
import ModuleConfigStep from './ModuleConfigStep'
import CompletionStep from './CompletionStep'
import {
    completeOnboardingAction,
    completeTourAction,
} from '@/app/[lang]/(panel)/panel/actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

import type { ModuleInfo } from './types'
export type { ModuleInfo }

export interface OnboardingWizardProps {
    storeName: string
    locale: string
    language: string
    currency: string
    modules: ModuleInfo[]
    featureFlags: Record<string, boolean>
    planLimits: Record<string, number | string | null>
    config: Record<string, unknown>
    translations: Record<string, string>
    hasMultiLanguage: boolean
    maxLanguages: number
    activeLanguages: string[]
}

// ---------------------------------------------------------------------------
// Step config
// ---------------------------------------------------------------------------

const STEP_LABELS = ['welcome', 'modules', 'language', 'config', 'complete'] as const
type StepKey = (typeof STEP_LABELS)[number]

// ---------------------------------------------------------------------------
// Animation variants (directional slide)
// ---------------------------------------------------------------------------

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 400 : -400,
        opacity: 0,
        scale: 0.95,
    }),
    center: {
        x: 0,
        opacity: 1,
        scale: 1,
    },
    exit: (direction: number) => ({
        x: direction < 0 ? 400 : -400,
        opacity: 0,
        scale: 0.95,
    }),
}

const springTransition = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    mass: 0.8,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingWizard({
    storeName,
    locale,
    language,
    currency,
    modules,
    featureFlags,
    planLimits,
    config,
    translations,
    hasMultiLanguage,
    maxLanguages,
    activeLanguages,
}: OnboardingWizardProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [direction, setDirection] = useState(0)
    const [isCompleting, setIsCompleting] = useState(false)
    const [startTour, setStartTour] = useState(false)
    const router = useRouter()

    // Simple t() from props
    const t = useCallback(
        (key: string, fallback?: string) => translations[key] || fallback || key,
        [translations]
    )

    // Check localStorage on mount — if already completed, don't show
    const [dismissed, setDismissed] = useState(false)
    useEffect(() => {
        try {
            if (localStorage.getItem('bns-onboarding-done') === '1') {
                setDismissed(true)
            }
        } catch { /* noop */ }
    }, [])

    const goNext = useCallback(() => {
        setDirection(1)
        setCurrentStep(prev => Math.min(prev + 1, STEP_LABELS.length - 1))
    }, [])

    const goPrev = useCallback(() => {
        setDirection(-1)
        setCurrentStep(prev => Math.max(prev - 1, 0))
    }, [])

    const goToStep = useCallback((idx: number) => {
        setDirection(idx > currentStep ? 1 : -1)
        setCurrentStep(idx)
    }, [currentStep])

    const handleComplete = useCallback(async (launchTour: boolean) => {
        if (isCompleting) return
        setIsCompleting(true)

        try {
            // Persist onboarding_completed via server action
            await completeOnboardingAction()
        } catch (err) {
            console.warn('[OnboardingWizard] Server action failed:', err)
        }

        // Optimistic localStorage fail-safe
        try {
            localStorage.setItem('bns-onboarding-done', '1')
        } catch { /* noop */ }

        if (launchTour) {
            setStartTour(true)
        } else {
            router.refresh()
        }
    }, [isCompleting, router])

    const handleSkipAll = useCallback(async () => {
        if (isCompleting) return
        setIsCompleting(true)

        try {
            await completeOnboardingAction()
        } catch (err) {
            console.warn('[OnboardingWizard] Skip failed:', err)
        }

        try {
            localStorage.setItem('bns-onboarding-done', '1')
        } catch { /* noop */ }

        router.refresh()
    }, [isCompleting, router])

    // If localStorage says done, don't render
    if (dismissed) return null

    // If tour was requested, we need the PanelTourDriver
    // The parent layout handles that — we signal via completing
    if (startTour) {
        // Refresh the page so the layout can pick up the tour signal
        router.refresh()
        return null
    }

    const step = STEP_LABELS[currentStep]
    const activeModules = modules.filter(m => m.active)

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
            />

            {/* Main card */}
            <motion.div
                className="relative w-full max-w-2xl max-h-[90vh] mx-4 rounded-2xl border border-sf-3 bg-sf-1 shadow-2xl overflow-hidden flex flex-col"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...springTransition, delay: 0.1 }}
            >
                {/* Progress bar */}
                {currentStep > 0 && currentStep < STEP_LABELS.length - 1 && (
                    <div className="px-6 pt-4 pb-0">
                        <div className="flex items-center gap-1">
                            {STEP_LABELS.map((_, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => idx <= currentStep && goToStep(idx)}
                                    className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
                                        idx <= currentStep
                                            ? 'bg-brand'
                                            : 'bg-sf-3'
                                    } ${idx < currentStep ? 'cursor-pointer hover:bg-brand-hover' : 'cursor-default'}`}
                                    aria-label={`Step ${idx + 1}`}
                                />
                            ))}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-[11px] text-tx-faint font-medium">
                                {t('onboarding.stepOf', 'Paso {{current}} de {{total}}')
                                    .replace('{{current}}', String(currentStep + 1))
                                    .replace('{{total}}', String(STEP_LABELS.length))}
                            </span>
                            <button
                                type="button"
                                onClick={handleSkipAll}
                                className="text-[11px] text-tx-faint hover:text-tx-muted transition-colors"
                            >
                                {t('onboarding.skipAll', 'Saltar configuración →')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step content with animation */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={springTransition}
                            className="w-full"
                        >
                            {step === 'welcome' && (
                                <WelcomeStep
                                    storeName={storeName}
                                    onContinue={goNext}
                                    onSkip={handleSkipAll}
                                    t={t}
                                />
                            )}

                            {step === 'modules' && (
                                <ModuleMatrixStep
                                    modules={modules}
                                    locale={locale}
                                    onContinue={goNext}
                                    onBack={goPrev}
                                    t={t}
                                />
                            )}

                            {step === 'language' && (
                                <LanguageStep
                                    currentLanguage={language}
                                    hasMultiLanguage={hasMultiLanguage}
                                    maxLanguages={maxLanguages}
                                    activeLanguages={activeLanguages}
                                    locale={locale}
                                    onContinue={goNext}
                                    onBack={goPrev}
                                    t={t}
                                />
                            )}

                            {step === 'config' && (
                                <ModuleConfigStep
                                    modules={activeModules}
                                    config={config}
                                    currency={currency}
                                    featureFlags={featureFlags}
                                    planLimits={planLimits}
                                    onContinue={goNext}
                                    onBack={goPrev}
                                    t={t}
                                />
                            )}

                            {step === 'complete' && (
                                <CompletionStep
                                    storeName={storeName}
                                    activeModuleCount={activeModules.length}
                                    onGoToDashboard={() => handleComplete(false)}
                                    onStartTour={() => handleComplete(true)}
                                    isCompleting={isCompleting}
                                    t={t}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    )
}
