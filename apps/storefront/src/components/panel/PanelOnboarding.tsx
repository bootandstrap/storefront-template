'use client'

/**
 * PanelOnboarding — Thin wrapper for the SOTA onboarding wizard
 *
 * This replaces the old 3-phase flow with the new 5-step OnboardingWizard.
 * It checks localStorage as a fail-safe before rendering the wizard, solving
 * the bug where onboarding appeared on every page refresh.
 *
 * The heavy lifting is done by:
 *   - OnboardingWizard (5-step wizard with Framer Motion)
 *   - Server actions for E2E persistence
 */

import { useLocalStorageFlag } from '@/lib/client-runtime'
import OnboardingWizard, { type ModuleInfo } from './onboarding/OnboardingWizard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PanelOnboardingProps {
    storeName: string
    storeUrl: string
    locale: string
    domain: string | null
    currency: string
    language: string
    /** Module list with active/inactive status */
    modules: ModuleInfo[]
    /** Full feature flags */
    featureFlags: Record<string, boolean>
    /** Plan limits */
    planLimits: Record<string, number | string | null>
    /** Current config values for pre-populating forms */
    config: Record<string, unknown>
    /** Whether multi-language module is active */
    hasMultiLanguage: boolean
    /** Max languages allowed by plan */
    maxLanguages: number
    /** Currently active languages */
    activeLanguages: string[]
    /** Server-resolved translations (flat key → value) */
    translations: Record<string, string>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PanelOnboarding({
    storeName,
    locale,
    currency,
    language,
    modules,
    featureFlags,
    planLimits,
    config,
    hasMultiLanguage,
    maxLanguages,
    activeLanguages,
    translations,
}: PanelOnboardingProps) {
    const onboardingCompleted = useLocalStorageFlag('bns-onboarding-done')

    if (onboardingCompleted) return null

    return (
        <OnboardingWizard
            storeName={storeName}
            locale={locale}
            language={language}
            currency={currency}
            modules={modules}
            featureFlags={featureFlags}
            planLimits={planLimits}
            config={config}
            translations={translations}
            hasMultiLanguage={hasMultiLanguage}
            maxLanguages={maxLanguages}
            activeLanguages={activeLanguages}
        />
    )
}
