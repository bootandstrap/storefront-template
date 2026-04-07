/**
 * Analytics Events Registry — SSOT for allowed analytics event types
 *
 * Used by:
 * - api/analytics/route.ts (server-side validation)
 * - Client-side tracking calls
 *
 * Zone: 🟢 SAFE — pure data, no side effects
 */

export const ANALYTICS_EVENTS = [
    'page_view',
    'product_view',
    'add_to_cart',
    'remove_from_cart',
    'checkout_start',
    'order_placed',
    'search',
    'category_view',
    'whatsapp_click',
] as const

export type AnalyticsEventType = typeof ANALYTICS_EVENTS[number]

/** Set for O(1) validation in API routes */
export const ANALYTICS_EVENT_SET = new Set<string>(ANALYTICS_EVENTS)
