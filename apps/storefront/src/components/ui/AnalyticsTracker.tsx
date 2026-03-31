'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { useConsentPrefs } from '@/lib/consent'

interface AnalyticsTrackerProps {
    enabled: boolean
}

/**
 * Invisible component that tracks page_view events on route changes.
 * Place in layout.tsx, gated by enable_analytics flag.
 * 
 * GDPR compliance: Only tracks if:
 * 1. Analytics feature flag is enabled (governance)
 * 2. User has consented to analytics cookies
 */
export default function AnalyticsTracker({ enabled }: AnalyticsTrackerProps) {
    const pathname = usePathname()
    const prevPathRef = useRef<string | null>(null)
    const { prefs } = useConsentPrefs()

    useEffect(() => {
        // Double gate: feature flag + cookie consent
        if (!enabled) return
        if (!prefs.analytics) return
        if (pathname === prevPathRef.current) return

        prevPathRef.current = pathname
        trackEvent('page_view', { path: pathname })
    }, [pathname, enabled, prefs.analytics])

    return null // invisible component
}
