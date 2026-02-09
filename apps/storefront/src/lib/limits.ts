import type { PlanLimits } from '@/lib/config'

type LimitableResource =
    | 'max_products'
    | 'max_customers'
    | 'max_orders_month'
    | 'max_categories'
    | 'max_images_per_product'
    | 'max_cms_pages'
    | 'max_carousel_slides'
    | 'max_admin_users'
    | 'storage_limit_mb'

export interface LimitCheckResult {
    allowed: boolean
    remaining: number
    limit: number
    current: number
}

/**
 * Check if a resource is within plan limits.
 * Usage: checkLimit(planLimits, 'max_products', currentProductCount)
 */
export function checkLimit(
    limits: PlanLimits,
    resource: LimitableResource,
    currentCount: number
): LimitCheckResult {
    const limit = limits[resource]
    const remaining = Math.max(0, limit - currentCount)
    return {
        allowed: currentCount < limit,
        remaining,
        limit,
        current: currentCount,
    }
}
