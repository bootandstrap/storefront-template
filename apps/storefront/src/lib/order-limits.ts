/**
 * Order Limit Enforcement — Real-time max_orders_month check
 *
 * Queries the governance Supabase for the current month's order count
 * via the `count_tenant_orders_month` RPC. Blocks checkout if limit exceeded.
 *
 * Phase 2 of MEGA PLAN v4 — SOTA, scalable, secure approach:
 * - Uses governance RPC (anon key) — no direct order table access
 * - Cached per-request (no need for TTL — fresh on each checkout)
 * - Returns LimitCheckResult for consistent UX with other limit checks
 */

import { createGovernanceClient } from '@/lib/supabase/governance'
import { checkLimit, type LimitCheckResult } from '@/lib/limits'
import type { PlanLimits } from '@/lib/config'

/**
 * Check if a tenant has remaining order capacity for the current month.
 *
 * @param tenantId - The tenant to check
 * @param limits - The tenant's plan limits (must include max_orders_month)
 * @returns LimitCheckResult with allowed/remaining/limit/current/percentage
 *
 * @example
 * ```ts
 * const result = await checkOrderLimit(tenantId, planLimits)
 * if (!result.allowed) {
 *   return { error: 'ORDER_LIMIT_REACHED', ...result }
 * }
 * ```
 */
export async function checkOrderLimit(
    tenantId: string,
    limits: PlanLimits,
): Promise<LimitCheckResult> {
    // If max_orders_month is 0 or not set, treat as unlimited
    const maxOrders = limits.max_orders_month ?? 0
    if (maxOrders <= 0) {
        return {
            allowed: true,
            remaining: Infinity,
            limit: 0,
            current: 0,
            percentage: 0,
        }
    }

    const supabase = createGovernanceClient()

    // Call governance RPC — SECURITY DEFINER, anon key safe
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('count_tenant_orders_month', {
        p_tenant_id: tenantId,
    }) as { data: number | null; error: { message: string } | null }

    if (error) {
        console.error('[order-limits] RPC error:', error.message)
        // Fail-open: allow the order if we can't check (avoid blocking revenue)
        // Log the error for monitoring
        return {
            allowed: true,
            remaining: maxOrders,
            limit: maxOrders,
            current: 0,
            percentage: 0,
        }
    }

    const currentCount = data ?? 0
    return checkLimit(limits, 'max_orders_month', currentCount)
}
