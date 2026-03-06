/**
 * @internal
 * Policy Engine — Centralized server-side enforcement for feature flags and plan limits.
 *
 * For panel server actions, prefer `panel-guard.ts` (`withPanelGuard()`) which wraps
 * auth + config + flag + limit checks in a single call.
 *
 * This module provides lower-level fail-closed guards for API routes and non-panel
 * server-side code that needs direct flag/limit enforcement.
 *
 * @module policy-engine
 * @since P0-4, P0-5 (Phase 2: Iron Gate)
 */

import { getConfig } from '@/lib/config'
import type { FeatureFlags, PlanLimits } from '@/lib/config'
import { checkLimit, type LimitableResource, type LimitCheckResult } from '@/lib/limits'
import { NextResponse } from 'next/server'

// ── Error Types ──────────────────────────────────────────────

/**
 * Thrown when a feature flag is disabled for the current tenant.
 * Contains the flag name for logging and debugging.
 */
export class PolicyError extends Error {
    public readonly code = 'FEATURE_DISABLED'
    constructor(
        public readonly flag: keyof FeatureFlags,
        message?: string
    ) {
        super(message || `Feature "${flag}" is not enabled for this tenant`)
        this.name = 'PolicyError'
    }
}

/**
 * Thrown when a plan limit is exceeded for the current tenant.
 * Contains the limit check result for detailed error messages.
 */
export class LimitError extends Error {
    public readonly code = 'LIMIT_EXCEEDED'
    constructor(
        public readonly resource: LimitableResource,
        public readonly result: LimitCheckResult,
        message?: string
    ) {
        super(
            message ||
            `Plan limit exceeded for "${resource}": ${result.current}/${result.limit} used`
        )
        this.name = 'LimitError'
    }
}

// ── Guard Functions ──────────────────────────────────────────

/**
 * Fail-closed guard: throws PolicyError if the feature flag is disabled.
 *
 * Uses getConfig() to fetch the current tenant's feature flags.
 * Falls back to disabled (throws) if config is degraded or unavailable.
 *
 * @throws {PolicyError} if the flag is not enabled
 */
export async function requireFlag(flag: keyof FeatureFlags): Promise<void> {
    const config = await getConfig()

    // Fail-closed: if config is degraded, deny access to optional features
    if (!config || config._degraded) {
        throw new PolicyError(flag, `Feature "${flag}" cannot be verified — config unavailable`)
    }

    if (config.featureFlags[flag] !== true) {
        throw new PolicyError(flag)
    }
}

/**
 * Fail-closed guard: throws LimitError if the plan limit is exceeded.
 *
 * @param resource The resource type to check (e.g., 'max_products')
 * @param currentCount The current usage count
 * @throws {LimitError} if the limit is exceeded
 */
export async function requireLimit(
    resource: LimitableResource,
    currentCount: number
): Promise<LimitCheckResult> {
    const config = await getConfig()

    if (!config || config._degraded) {
        // Fail-closed: if config is degraded, deny mutations
        throw new LimitError(resource, {
            allowed: false,
            remaining: 0,
            limit: 0,
            current: currentCount,
            percentage: 100,
        }, `Plan limit for "${resource}" cannot be verified — config unavailable`)
    }

    const result = checkLimit(config.planLimits, resource, currentCount)

    if (!result.allowed) {
        throw new LimitError(resource, result)
    }

    return result
}

/**
 * Combined guard: checks both a feature flag AND a plan limit.
 *
 * @throws {PolicyError} if the flag is disabled
 * @throws {LimitError} if the limit is exceeded
 */
export async function requireFeatureWithLimit(
    flag: keyof FeatureFlags,
    resource: LimitableResource,
    currentCount: number
): Promise<LimitCheckResult> {
    await requireFlag(flag)
    return requireLimit(resource, currentCount)
}

// ── Response Helpers ─────────────────────────────────────────

/**
 * Creates a standardized JSON error response for policy violations.
 * Use in API routes to return consistent error shapes.
 *
 * ```ts
 * try {
 *     await requireFlag('enable_promotions')
 * } catch (err) {
 *     return policyErrorResponse(err)
 * }
 * ```
 */
export function policyErrorResponse(error: unknown): NextResponse {
    if (error instanceof PolicyError) {
        return NextResponse.json(
            {
                error: error.message,
                code: error.code,
                flag: error.flag,
            },
            { status: 403 }
        )
    }

    if (error instanceof LimitError) {
        return NextResponse.json(
            {
                error: error.message,
                code: error.code,
                resource: error.resource,
                current: error.result.current,
                limit: error.result.limit,
                remaining: error.result.remaining,
            },
            { status: 429 }
        )
    }

    // Unknown error — rethrow
    throw error
}

/**
 * Wraps an API route handler with flag enforcement.
 * Returns 403 if the flag is disabled, otherwise calls the handler.
 */
export function withFlagGuard(
    flag: keyof FeatureFlags,
    handler: (request: Request) => Promise<NextResponse>
) {
    return async (request: Request): Promise<NextResponse> => {
        try {
            await requireFlag(flag)
            return await handler(request)
        } catch (error) {
            if (error instanceof PolicyError) {
                return policyErrorResponse(error)
            }
            throw error
        }
    }
}
