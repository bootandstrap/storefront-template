'use client'

/**
 * PanelOnboarding — Orchestrator for the owner panel first-login experience
 *
 * Three-phase flow:
 *   1. WelcomeModal — branding splash + store readiness overview
 *   2. Language Selector — owner picks panel + storefront language
 *   3. PanelTour — spotlight-guided tour of panel sections (skippable)
 *
 * State:
 *   - `config.onboarding_completed` (Supabase) — controls whether this shows
 *   - `config.panel_language` / `config.storefront_language` — language preferences
 *   - `config.tour_completed` — persists tour completion for achievements
 *
 * On completion, calls `/api/panel/onboarding-complete` to persist.
 *
 * NOTE: Does NOT use useI18n() — translations come from server layout as props.
 */

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import WelcomeModal from './WelcomeModal'
import PanelTour, { type TourStep } from './PanelTour'
import { saveLanguagePreferencesAction, completeTourAction } from '@/app/[lang]/(panel)/panel/actions'

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
    moduleCount: number
    hasLogo: boolean
    hasContact: boolean
    /** Server-resolved translations (flat key → value) */
    translations: Record<string, string>
}

// ---------------------------------------------------------------------------
// Language data
// ---------------------------------------------------------------------------

const LANGUAGES = [
    { code: 'es', flag: '🇪🇸', label: 'Español' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
    { code: 'it', flag: '🇮🇹', label: 'Italiano' },
] as const

// ---------------------------------------------------------------------------
// Language Selector Component (inlined — only used here)
// ---------------------------------------------------------------------------

function LanguageSelector({
    panelLang,
    storefrontLang,
    onPanelLangChange,
    onStorefrontLangChange,
    onContinue,
    t,
}: {
    panelLang: string
    storefrontLang: string
    onPanelLangChange: (lang: string) => void
    onStorefrontLangChange: (lang: string) => void
    onContinue: () => void
    t: (key: string) => string
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-surface-1 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                <div className="px-8 pt-8 pb-4">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <span className="text-xl">🌍</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold font-display text-text-primary">
                                {t('onboarding.language.title') || 'Language Preferences'}
                            </h2>
                            <p className="text-xs text-text-muted">
                                {t('onboarding.language.subtitle') || 'Choose your preferred languages'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Panel Language */}
                <div className="px-8 pb-4">
                    <label className="block text-sm font-semibold text-text-secondary mb-2">
                        🖥️ {t('onboarding.language.panel') || 'Panel Language'}
                    </label>
                    <p className="text-xs text-text-muted mb-3">
                        {t('onboarding.language.panelDesc') || 'Language for your control panel'}
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                        {LANGUAGES.map(lang => (
                            <button
                                key={`panel-${lang.code}`}
                                type="button"
                                onClick={() => onPanelLangChange(lang.code)}
                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                                    panelLang === lang.code
                                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/20'
                                        : 'border-surface-3 hover:border-surface-4 hover:bg-surface-2'
                                }`}
                            >
                                <span className="text-2xl">{lang.flag}</span>
                                <span className="text-[10px] font-medium text-text-muted">{lang.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Storefront Language */}
                <div className="px-8 pb-4">
                    <label className="block text-sm font-semibold text-text-secondary mb-2">
                        🛍️ {t('onboarding.language.storefront') || 'Storefront Language'}
                    </label>
                    <p className="text-xs text-text-muted mb-3">
                        {t('onboarding.language.storefrontDesc') || 'Default language your customers will see'}
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                        {LANGUAGES.map(lang => (
                            <button
                                key={`store-${lang.code}`}
                                type="button"
                                onClick={() => onStorefrontLangChange(lang.code)}
                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                                    storefrontLang === lang.code
                                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/20'
                                        : 'border-surface-3 hover:border-surface-4 hover:bg-surface-2'
                                }`}
                            >
                                <span className="text-2xl">{lang.flag}</span>
                                <span className="text-[10px] font-medium text-text-muted">{lang.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* More languages upsell */}
                <div className="mx-8 mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-xs text-text-muted">
                        💡 {t('onboarding.language.upsell') || 'Need more languages? Enable the Multi-Language module from your control center.'}
                    </p>
                </div>

                {/* Continue */}
                <div className="px-8 pb-8">
                    <button
                        type="button"
                        onClick={onContinue}
                        className="btn btn-primary w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl"
                    >
                        {t('onboarding.language.continue') || 'Continue'} →
                    </button>
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PanelOnboarding({
    storeName,
    domain,
    currency,
    language,
    moduleCount,
    hasLogo,
    hasContact,
    translations,
}: PanelOnboardingProps) {
    const [phase, setPhase] = useState<'welcome' | 'language' | 'tour' | 'done'>('welcome')
    const [error, setError] = useState<string | null>(null)
    const [panelLang, setPanelLang] = useState(language)
    const [storefrontLang, setStorefrontLang] = useState(language)
    const router = useRouter()

    // Simple t() from props — no context needed
    const t = useCallback((key: string) => translations[key] || key, [translations])

    const markComplete = useCallback(async () => {
        try {
            const res = await fetch('/api/panel/onboarding-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                console.warn('[PanelOnboarding] API error (non-blocking):', data.error || res.status)
            }
        } catch (err: unknown) {
            console.warn('[PanelOnboarding] Failed to persist onboarding status:', err)
        }
    }, [])

    const handleStartTour = useCallback(() => {
        // Show language selector before tour
        setPhase('language')
    }, [])

    const handleSkip = useCallback(() => {
        markComplete()
        setPhase('done')
        router.refresh()
    }, [markComplete, router])

    const handleLanguageContinue = useCallback(async () => {
        // Persist language preferences via server action
        try {
            await saveLanguagePreferencesAction(panelLang, storefrontLang)
        } catch (err: unknown) {
            console.warn('[PanelOnboarding] Language preferences save failed:', err)
        }
        // Mark onboarding complete and start tour
        markComplete()
        setPhase('tour')
    }, [panelLang, storefrontLang, markComplete])

    const handleTourComplete = useCallback(async () => {
        // Persist tour completion to DB (feeds tour_complete achievement)
        try {
            await completeTourAction()
        } catch (err: unknown) {
            console.warn('[PanelOnboarding] Tour completion save failed:', err)
        }
        try { localStorage.setItem('bns-tour-done', '1') } catch { /* noop */ }
        setPhase('done')
        router.refresh()
    }, [router])

    // Build tour steps from translations (7 steps including modules)
    const tourSteps: TourStep[] = useMemo(() => [
        {
            targetId: 'nav-dashboard',
            title: t('tour.step.dashboard.title'),
            description: t('tour.step.dashboard.description'),
        },
        {
            targetId: 'nav-catalog',
            title: t('tour.step.catalog.title'),
            description: t('tour.step.catalog.description'),
        },
        {
            targetId: 'nav-orders',
            title: t('tour.step.orders.title'),
            description: t('tour.step.orders.description'),
        },
        {
            targetId: 'nav-customers',
            title: t('tour.step.customers.title'),
            description: t('tour.step.customers.description'),
        },
        {
            targetId: 'nav-store',
            title: t('tour.step.store.title'),
            description: t('tour.step.store.description'),
        },
        {
            targetId: 'nav-shipping',
            title: t('tour.step.shipping.title'),
            description: t('tour.step.shipping.description'),
        },
        {
            targetId: 'nav-modules',
            title: t('tour.step.modules.title'),
            description: t('tour.step.modules.description'),
        },
    ], [t])

    if (phase === 'done') return null

    return (
        <>
            {error && (
                <div className="fixed top-4 left-1/2 z-[70] -translate-x-1/2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                    {error}
                </div>
            )}

            {phase === 'welcome' && (
                <WelcomeModal
                    storeName={storeName}
                    domain={domain}
                    currency={currency}
                    language={language}
                    moduleCount={moduleCount}
                    hasLogo={hasLogo}
                    hasContact={hasContact}
                    onStartTour={handleStartTour}
                    onSkip={handleSkip}
                    t={t}
                />
            )}

            {phase === 'language' && (
                <LanguageSelector
                    panelLang={panelLang}
                    storefrontLang={storefrontLang}
                    onPanelLangChange={setPanelLang}
                    onStorefrontLangChange={setStorefrontLang}
                    onContinue={handleLanguageContinue}
                    t={t}
                />
            )}

            {phase === 'tour' && (
                <PanelTour
                    steps={tourSteps}
                    onComplete={handleTourComplete}
                    t={t}
                />
            )}
        </>
    )
}
