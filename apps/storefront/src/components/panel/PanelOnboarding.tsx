'use client'

/**
 * PanelOnboarding — Orchestrator for the owner panel first-login experience
 *
 * Two-phase flow:
 *   1. WelcomeModal — branding splash + store readiness overview
 *   2. PanelTour — spotlight-guided tour of panel sections (skippable)
 *
 * State:
 *   - `config.onboarding_completed` (Supabase) — controls whether this shows
 *   - `bns-tour-done` (localStorage) — remembers if tour was completed/skipped
 *
 * On completion, calls `/api/panel/onboarding-complete` to persist.
 *
 * NOTE: Does NOT use useI18n() — translations come from server layout as props.
 */

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import WelcomeModal from './WelcomeModal'
import PanelTour, { type TourStep } from './PanelTour'

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
// Component
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
    const [phase, setPhase] = useState<'welcome' | 'tour' | 'done'>('welcome')
    const [error, setError] = useState<string | null>(null)
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
            // Non-blocking — log but don't prevent user flow
            console.warn('[PanelOnboarding] Failed to persist onboarding status:', err)
        }
    }, [])

    const handleStartTour = useCallback(() => {
        // Fire-and-forget: mark complete in background, show tour immediately
        markComplete()
        setPhase('tour')
    }, [markComplete])

    const handleSkip = useCallback(() => {
        // Fire-and-forget: mark complete in background, dismiss immediately
        markComplete()
        setPhase('done')
        router.refresh()
    }, [markComplete, router])

    const handleTourComplete = useCallback(() => {
        // Save to localStorage so tour doesn't re-show on navigation
        try { localStorage.setItem('bns-tour-done', '1') } catch { /* noop */ }
        setPhase('done')
        router.refresh()
    }, [router])

    // Build tour steps from translations
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
