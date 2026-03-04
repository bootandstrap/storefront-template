'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker for PWA support.
 * Only runs in production to avoid caching dev assets.
 */
export default function ServiceWorkerRegister() {
    useEffect(() => {
        if (
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            process.env.NODE_ENV === 'production'
        ) {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                // SW registration failed — non-critical, ignore silently
            })
        }
    }, [])

    return null
}
