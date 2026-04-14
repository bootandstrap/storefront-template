/**
 * Web Vitals Tracking — Client-side performance metrics
 *
 * Reports Core Web Vitals (CLS, FID, LCP, FCP, TTFB) to the
 * analytics endpoint. Only runs in production to avoid noise.
 *
 * @module analytics/web-vitals
 */

import type { Metric } from 'web-vitals'

const ANALYTICS_URL = '/api/analytics'

function sendVital(metric: Metric) {
    // Skip in dev
    if (process.env.NODE_ENV !== 'production') return

    const body = JSON.stringify({
        event_type: 'web_vital',
        properties: {
            name: metric.name,
            value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
            rating: metric.rating,     // 'good' | 'needs-improvement' | 'poor'
            delta: Math.round(metric.delta),
            id: metric.id,
            navigationType: metric.navigationType,
        },
    })

    // Use sendBeacon for reliability (doesn't block navigation)  
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(ANALYTICS_URL, body)
    } else {
        fetch(ANALYTICS_URL, {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
        }).catch(() => {
            // Silently fail — analytics should never break the app
        })
    }
}

/**
 * Initialize Web Vitals reporting.
 * Call once from the root layout client component.
 */
export function reportWebVitals() {
    if (typeof window === 'undefined') return

    import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
        onCLS(sendVital)
        onFCP(sendVital)
        onLCP(sendVital)
        onTTFB(sendVital)
        onINP(sendVital)
    }).catch(() => {
        // web-vitals not available — silently fail
    })
}
