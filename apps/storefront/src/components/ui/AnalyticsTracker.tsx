'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'

interface AnalyticsTrackerProps {
    enabled: boolean
}

/**
 * Invisible component that tracks page_view events on route changes.
 * Place in layout.tsx, gated by enable_analytics flag.
 */
export default function AnalyticsTracker({ enabled }: AnalyticsTrackerProps) {
    const pathname = usePathname()
    const prevPathRef = useRef<string | null>(null)

    useEffect(() => {
        if (!enabled) return
        if (pathname === prevPathRef.current) return

        prevPathRef.current = pathname
        trackEvent('page_view', { path: pathname })
    }, [pathname, enabled])

    return null // invisible component
}
