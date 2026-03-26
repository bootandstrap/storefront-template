/**
 * Limitable Resources — Canonical type for all plan limit keys
 *
 * @locked 🔴 CANONICAL — ecommerce-template/packages/shared is the source of truth.
 * Must match PlanLimitsSchema in schemas.ts (minus internal fields like plan_name, plan_expires_at).
 * Storefront limits.ts imports this type.
 */

/**
 * All resource keys that can be limited by plan.
 * Each key corresponds to a numeric field in PlanLimitsSchema.
 *
 * 24 keys — if you add one here, you MUST also add it to:
 *   1. PlanLimitsSchema (governance/schemas.ts)
 *   2. FALLBACK_CONFIG.planLimits (governance/defaults.ts)
 *   3. seed-flag-definitions.ts (BSWEB) if it affects a limit_definition
 */
export type LimitableResource =
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
    | 'max_reviews_per_product'
    | 'max_wishlist_items'
    | 'max_promotions_active'
    | 'max_payment_methods'
    | 'max_pos_payment_methods'
    | 'max_crm_contacts'

/**
 * Result of checking whether a resource usage is within plan limits.
 */
export interface LimitCheckResult {
    allowed: boolean
    remaining: number
    limit: number
    current: number
    percentage: number
}
