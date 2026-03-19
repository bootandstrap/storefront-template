import type { PlanLimits } from '@/lib/config'

// Re-export from shared package — canonical source of truth
export type { LimitableResource, LimitCheckResult } from '@bootandstrap/shared'
import type { LimitableResource, LimitCheckResult } from '@bootandstrap/shared'

/**
 * Check if a resource is within plan limits.
 * Usage: checkLimit(planLimits, 'max_products', currentProductCount)
 */
export function checkLimit(
    limits: PlanLimits,
    resource: LimitableResource,
    currentCount: number
): LimitCheckResult {
    const limit = limits[resource] as number
    const remaining = Math.max(0, limit - currentCount)
    const percentage = limit > 0 ? Math.round((currentCount / limit) * 100) : 0
    return {
        allowed: currentCount < limit,
        remaining,
        limit,
        current: currentCount,
        percentage,
    }
}

/**
 * Get the severity level for a limit check result.
 * Used by UsageMeter component for color coding.
 */
export function getLimitSeverity(result: LimitCheckResult): 'ok' | 'warning' | 'critical' {
    if (result.percentage >= 90) return 'critical'
    if (result.percentage >= 70) return 'warning'
    return 'ok'
}
