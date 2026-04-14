'use client'

/**
 * WebVitalsReporter — Initializes Core Web Vitals reporting
 *
 * Renders nothing — just a side-effect component that calls
 * reportWebVitals() on mount.
 *
 * Add to any layout: <WebVitalsReporter />
 *
 * @module components/WebVitalsReporter
 */

import { useEffect } from 'react'

export default function WebVitalsReporter() {
    useEffect(() => {
        import('@/lib/analytics/web-vitals').then(({ reportWebVitals }) => {
            reportWebVitals()
        })
    }, [])

    return null
}
