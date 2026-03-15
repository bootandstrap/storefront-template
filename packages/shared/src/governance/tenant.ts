/**
 * @module governance/tenant
 * @description Tenant ID resolution with fail-closed security posture.
 *
 * Server-only: reads TENANT_ID exclusively. NEXT_PUBLIC_TENANT_ID is for
 * client-side analytics ONLY — never used for data scoping on the server.
 * In production, TENANT_ID *must* be set — we fail hard to prevent data leaks.
 *
 * @locked 🔴 CANONICAL — ecommerce-template/packages/shared is the source of truth.
 */

/**
 * Detects whether we are in Next.js build/prerender phase (no runtime context).
 * During `next build`, static pages like `/_not-found` are prerendered without
 * a real request — TENANT_ID is unavailable and that's expected.
 *
 * Next.js sets NEXT_PHASE during build:
 * - 'phase-production-build' during `next build`
 * - undefined during runtime
 */
export function isBuildPhase(): boolean {
    return process.env.NEXT_PHASE === 'phase-production-build'
}

/**
 * Returns the tenant ID from the server-only TENANT_ID env var.
 * - In production runtime: throws if TENANT_ID is not set (fail-closed).
 * - In build/prerender: returns a safe sentinel (queries will match nothing).
 * - In development: warns and returns a dev placeholder.
 */
export function getRequiredTenantId(): string {
    const id = process.env.TENANT_ID
    if (id) return id

    // Build-phase prerender (e.g. /_not-found): return sentinel — queries return empty
    if (isBuildPhase()) {
        return '__build_prerender__'
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            '[FATAL] TENANT_ID is not set in production. All multi-tenant queries require tenant scoping.',
        )
    }

    // Development: warn once, return placeholder that will match nothing (safe)
    console.warn(
        '[config] ⚠️ TENANT_ID not set — queries will return no data. Set TENANT_ID in .env for local dev.',
    )
    return '__dev_no_tenant__'
}
