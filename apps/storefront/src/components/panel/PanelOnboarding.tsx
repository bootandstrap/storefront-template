'use client'

/**
 * PanelOnboarding — Wrapper for OnboardingWizard in the panel layout.
 *
 * Renders the full-screen OnboardingWizard overlay.
 * On completion, sends all wizard data to `/api/panel/onboarding-complete`
 * to persist business info, contact details, and payment preferences.
 * Then dismisses the overlay and refreshes the page.
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import OnboardingWizard, { type OnboardingData } from './OnboardingWizard'
import { useI18n } from '@/lib/i18n/provider'

interface PanelOnboardingProps {
    storeName: string
    storeUrl: string
    locale: string
}

export default function PanelOnboarding({
    storeName,
    storeUrl,
    locale,
}: PanelOnboardingProps) {
    const [dismissed, setDismissed] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const { t } = useI18n()

    const handleComplete = useCallback(async (data: OnboardingData) => {
        setError(null)
        try {
            const res = await fetch('/api/panel/onboarding-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!res.ok) {
                const resData = await res.json().catch(() => ({}))
                throw new Error(typeof resData.error === 'string' ? resData.error : 'Failed to save onboarding state')
            }
            setDismissed(true)
            router.refresh()
        } catch (err: unknown) {
            console.error('[PanelOnboarding] Failed to mark onboarding complete:', err)
            setError(
                err instanceof Error && err.message
                    ? err.message
                    : (t('onboarding.completeError') || 'No se pudo guardar el onboarding. Inténtalo de nuevo.')
            )
        }
    }, [router, t])

    if (dismissed) return null

    return (
        <>
            {error && (
                <div className="fixed top-4 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                    {error}
                </div>
            )}
            <OnboardingWizard
                storeName={storeName}
                storeUrl={storeUrl}
                locale={locale}
                onComplete={handleComplete}
                t={t}
            />
        </>
    )
}
