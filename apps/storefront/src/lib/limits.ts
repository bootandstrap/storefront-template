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
    | 'max_languages'
    | 'max_currencies'
    | 'max_whatsapp_templates'
    | 'max_file_upload_mb'
    | 'max_email_sends_month'
    | 'max_custom_domains'
    | 'max_chatbot_messages_month'
    | 'max_badges'
    | 'max_newsletter_subscribers'
    | 'max_requests_day'

export interface LimitCheckResult {
    allowed: boolean
    remaining: number
    limit: number
    current: number
    percentage: number
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
