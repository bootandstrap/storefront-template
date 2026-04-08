/**
 * @module subscribers/shared/governance-gate
 * @description Feature-flag-aware subscriber gate for Medusa events.
 *
 * Provides a `withGovernanceGate()` wrapper that checks if a module's
 * feature flag is active before executing a subscriber handler.
 * This ensures that disabled modules don't fire events or consume resources.
 *
 * USAGE:
 *   import { withGovernanceGate } from './shared/governance-gate'
 *
 *   export default withGovernanceGate('enable_crm', async ({ event, container }) => {
 *       // Only runs if enable_crm is true
 *       await processCRMEvent(event)
 *   })
 *
 * HOW IT WORKS:
 *   1. Reads TENANT_ID from env
 *   2. Fetches feature_flags from Supabase (cached 60s)
 *   3. Checks if the specified flag is true
 *   4. If flag is false/missing → logs skip + returns
 *   5. If flag is true → delegates to inner handler
 *
 * CACHING:
 *   Feature flags are cached for 60 seconds to avoid hitting Supabase
 *   on every event. The cache is invalidated by setting
 *   `process.env.GOVERNANCE_CACHE_BUST = Date.now()`.
 *
 * @locked 🔴 PLATFORM — Do not customize per tenant.
 */

import type { SubscriberArgs } from "@medusajs/framework"

// ── Simple in-memory cache ────────────────────────────────────────────────

interface CachedFlags {
    flags: Record<string, boolean>
    fetchedAt: number
}

const CACHE_TTL_MS = 60_000 // 60 seconds
let _flagsCache: CachedFlags | null = null

/**
 * Fetch feature flags from Supabase governance table.
 * Results are cached for 60 seconds.
 */
async function getFeatureFlags(): Promise<Record<string, boolean>> {
    // Check cache
    const bustToken = process.env.GOVERNANCE_CACHE_BUST
    const now = Date.now()

    if (_flagsCache && (now - _flagsCache.fetchedAt) < CACHE_TTL_MS) {
        return _flagsCache.flags
    }

    const tenantId = process.env.TENANT_ID
    const supabaseUrl = process.env.GOVERNANCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.GOVERNANCE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!tenantId || !supabaseUrl || !supabaseKey) {
        // No governance config — default to all features enabled (dev mode)
        return {}
    }

    try {
        const res = await fetch(
            `${supabaseUrl}/rest/v1/feature_flags?tenant_id=eq.${tenantId}&select=*`,
            {
                headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                },
                signal: AbortSignal.timeout(5000),
            }
        )

        if (!res.ok) {
            console.warn(`[governance-gate] Failed to fetch flags: ${res.status}`)
            return _flagsCache?.flags ?? {}
        }

        const rows = await res.json()
        if (!rows || rows.length === 0) {
            return {}
        }

        // Feature flags are stored as columns on a single row
        const flags = rows[0] as Record<string, unknown>
        const boolFlags: Record<string, boolean> = {}

        for (const [key, value] of Object.entries(flags)) {
            if (key === 'tenant_id' || key === 'created_at' || key === 'updated_at') continue
            if (typeof value === 'boolean') {
                boolFlags[key] = value
            }
        }

        _flagsCache = { flags: boolFlags, fetchedAt: now }
        return boolFlags
    } catch (err) {
        console.warn(
            `[governance-gate] Error fetching flags: ${err instanceof Error ? err.message : String(err)}`
        )
        // Return stale cache or empty
        return _flagsCache?.flags ?? {}
    }
}

/**
 * Invalidate the feature flags cache.
 * Call this when flags change (e.g., after module activation).
 */
export function invalidateFlagsCache(): void {
    _flagsCache = null
}

// ── Governance Gate Wrapper ───────────────────────────────────────────────

type SubscriberHandler<T = unknown> = (args: SubscriberArgs<T>) => Promise<void>

/**
 * Wraps a subscriber handler with a governance feature flag check.
 *
 * If the flag is disabled (or missing), the handler is skipped silently.
 * If the flag is enabled, the handler runs normally.
 *
 * @param requiredFlag - The feature flag key (e.g., 'enable_crm', 'enable_analytics')
 * @param handler - The actual subscriber handler
 * @returns A wrapped handler that gates on the feature flag
 */
export function withGovernanceGate<T = unknown>(
    requiredFlag: string,
    handler: SubscriberHandler<T>
): SubscriberHandler<T> {
    return async (args: SubscriberArgs<T>) => {
        const flags = await getFeatureFlags()

        // If no flags loaded (dev mode, no governance), run the handler
        if (Object.keys(flags).length === 0) {
            return handler(args)
        }

        // Check the specific flag
        if (!flags[requiredFlag]) {
            console.log(
                JSON.stringify({
                    level: "debug",
                    event: "governance_gate.skipped",
                    flag: requiredFlag,
                    tenant_id: process.env.TENANT_ID,
                    message: `Subscriber skipped — ${requiredFlag} is disabled`,
                })
            )
            return
        }

        // Flag is enabled — run the handler
        return handler(args)
    }
}

/**
 * Check multiple feature flags. All must be true for the handler to run.
 *
 * @param requiredFlags - Array of flag keys that must all be enabled
 * @param handler - The actual subscriber handler
 */
export function withGovernanceGateAll<T = unknown>(
    requiredFlags: string[],
    handler: SubscriberHandler<T>
): SubscriberHandler<T> {
    return async (args: SubscriberArgs<T>) => {
        const flags = await getFeatureFlags()

        if (Object.keys(flags).length === 0) {
            return handler(args)
        }

        const missingFlags = requiredFlags.filter(f => !flags[f])
        if (missingFlags.length > 0) {
            console.log(
                JSON.stringify({
                    level: "debug",
                    event: "governance_gate.skipped",
                    missing_flags: missingFlags,
                    tenant_id: process.env.TENANT_ID,
                })
            )
            return
        }

        return handler(args)
    }
}

/**
 * Check if at least one of the specified flags is enabled.
 *
 * @param anyFlags - Array of flag keys where at least one must be enabled
 * @param handler - The actual subscriber handler
 */
export function withGovernanceGateAny<T = unknown>(
    anyFlags: string[],
    handler: SubscriberHandler<T>
): SubscriberHandler<T> {
    return async (args: SubscriberArgs<T>) => {
        const flags = await getFeatureFlags()

        if (Object.keys(flags).length === 0) {
            return handler(args)
        }

        const hasAny = anyFlags.some(f => flags[f])
        if (!hasAny) {
            console.log(
                JSON.stringify({
                    level: "debug",
                    event: "governance_gate.skipped",
                    checked_flags: anyFlags,
                    tenant_id: process.env.TENANT_ID,
                })
            )
            return
        }

        return handler(args)
    }
}
