/**
 * Limit Error Utilities — Standardized limit enforcement errors
 *
 * Provides structured error format for limit-exceeded scenarios,
 * enabling client-side parsing and i18n-aware toast rendering.
 *
 * Error format: `LIMIT_EXCEEDED:{resource}:{current}/{max}`
 * Example:      `LIMIT_EXCEEDED:max_products:25/25`
 *
 * @module limit-errors
 */

import type { LimitableResource, LimitCheckResult } from '@bootandstrap/shared'

// ---------------------------------------------------------------------------
// Structured Limit Error
// ---------------------------------------------------------------------------

export interface LimitExceededInfo {
    resource: LimitableResource
    current: number
    max: number
    percentage: number
}

/** Prefix used to identify limit errors in error messages */
export const LIMIT_ERROR_PREFIX = 'LIMIT_EXCEEDED' as const

/**
 * Build a structured limit-exceeded error string.
 * Parsed by `parseLimitError` on the client side.
 */
export function buildLimitError(
    resource: LimitableResource,
    result: LimitCheckResult
): string {
    return `${LIMIT_ERROR_PREFIX}:${resource}:${result.current}/${result.limit}`
}

/**
 * Parse a limit-exceeded error string back into structured data.
 * Returns null if the string is not a limit error.
 */
export function parseLimitError(error: string): LimitExceededInfo | null {
    if (!error.startsWith(LIMIT_ERROR_PREFIX)) return null

    const parts = error.split(':')
    if (parts.length < 3) return null

    const resource = parts[1] as LimitableResource
    const [currentStr, maxStr] = (parts[2] ?? '0/0').split('/')
    const current = parseInt(currentStr, 10)
    const max = parseInt(maxStr, 10)

    if (isNaN(current) || isNaN(max)) return null

    return {
        resource,
        current,
        max,
        percentage: max > 0 ? Math.round((current / max) * 100) : 100,
    }
}

/**
 * Human-readable labels for each limitable resource.
 * Map to i18n keys for the UI layer.
 */
export const RESOURCE_LABEL_KEYS: Record<LimitableResource, string> = {
    max_products: 'panel.usage.products',
    max_customers: 'panel.usage.customers',
    max_orders_month: 'panel.usage.ordersMonth',
    max_categories: 'panel.usage.categories',
    max_images_per_product: 'limits.imagesPerProduct',
    max_cms_pages: 'limits.cmsPages',
    max_carousel_slides: 'limits.carouselSlides',
    max_admin_users: 'panel.usage.adminUsers',
    storage_limit_mb: 'panel.usage.storage',
    max_languages: 'limits.languages',
    max_currencies: 'limits.currencies',
    max_whatsapp_templates: 'limits.whatsappTemplates',
    max_file_upload_mb: 'limits.fileUpload',
    max_email_sends_month: 'panel.usage.emailsMonth',
    max_custom_domains: 'panel.usage.customDomains',
    max_chatbot_messages_month: 'limits.chatbotMessages',
    max_badges: 'limits.badges',
    max_newsletter_subscribers: 'limits.newsletter',
    max_requests_day: 'panel.usage.trafficDay',
    max_reviews_per_product: 'limits.reviewsPerProduct',
    max_wishlist_items: 'limits.wishlistItems',
    max_promotions_active: 'limits.promotions',
    max_payment_methods: 'limits.paymentMethods',
    max_pos_payment_methods: 'limits.posPaymentMethods',
    max_crm_contacts: 'limits.crmContacts',
}
