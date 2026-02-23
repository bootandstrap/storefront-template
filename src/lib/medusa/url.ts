/**
 * Unified Medusa URL resolution for client-side code
 *
 * Single source of truth for the public Medusa backend URL.
 * Used by CartContext, guest order lookup, and any client component
 * that needs to call the Medusa Store API directly.
 *
 * Rules:
 * - Uses NEXT_PUBLIC_MEDUSA_BACKEND_URL (the canonical env var)
 * - Falls back to http://localhost:9000 ONLY in development/test
 * - Throws in production if env var is missing (fail-fast)
 */

const DEV_FALLBACK = 'http://localhost:9000'

/**
 * Returns the public-facing Medusa backend URL.
 * Safe for client-side usage (reads NEXT_PUBLIC_* env var).
 */
export function getPublicMedusaUrl(): string {
    const url = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

    if (url) {
        // Strip trailing slash for consistent URL joining
        return url.endsWith('/') ? url.slice(0, -1) : url
    }

    // In production, the env var MUST be set
    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'NEXT_PUBLIC_MEDUSA_BACKEND_URL is required in production. ' +
            'Set it to your Medusa API URL (e.g. https://api.yourdomain.com).'
        )
    }

    return DEV_FALLBACK
}
