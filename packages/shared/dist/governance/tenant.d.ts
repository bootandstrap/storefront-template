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
export declare function isBuildPhase(): boolean;
/**
 * Returns the tenant ID from the server-only TENANT_ID env var.
 * - In production runtime: throws if TENANT_ID is not set (fail-closed).
 * - In build/prerender: returns a safe sentinel (queries will match nothing).
 * - In development: warns and returns a dev placeholder.
 */
export declare function getRequiredTenantId(): string;
//# sourceMappingURL=tenant.d.ts.map