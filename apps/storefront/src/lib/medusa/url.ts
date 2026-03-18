/**
 * Unified Medusa URL resolution for client-side code
 *
 * Single source of truth for the public Medusa backend URL.
 * Used by CartContext, guest order lookup, and any client component
 * that needs to call the Medusa Store API directly.
 *
 * Uses getRuntimeEnv() to support runtime env injection:
 * - In production: reads from window.__RUNTIME_ENV__ (injected by RuntimeEnvScript)
 * - In development: reads from process.env.NEXT_PUBLIC_* (available at build time)
 * - Falls back to http://localhost:9000 ONLY in development/test
 */

import { getRuntimeEnv } from '@/lib/runtime-env'

const DEV_FALLBACK = 'http://localhost:9000'

/**
 * Returns the public-facing Medusa backend URL.
 * Safe for client-side and server-side usage.
 */
export function getPublicMedusaUrl(): string {
    const url = getRuntimeEnv('MEDUSA_BACKEND_URL')

    if (url) {
        // Strip trailing slash for consistent URL joining
        return url.endsWith('/') ? url.slice(0, -1) : url
    }

    // In production, the env var MUST be set
    if (process.env.NODE_ENV === 'production') {
        console.error(
            '[Medusa] NEXT_PUBLIC_MEDUSA_BACKEND_URL is not set. ' +
            'Check RuntimeEnvScript in layout.tsx and container env vars.'
        )
        // Don't throw — return empty to avoid crashing the whole page.
        // Cart operations will fail gracefully with error toasts.
        return ''
    }

    return DEV_FALLBACK
}

/**
 * Returns the Medusa publishable API key.
 * Safe for client-side and server-side usage.
 */
export function getPublishableKey(): string {
    return getRuntimeEnv('MEDUSA_PUBLISHABLE_KEY')
}
