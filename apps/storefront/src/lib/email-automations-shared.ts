/**
 * Email Automations — Types & Constants (Client-safe)
 *
 * Shared between server (email-automations.ts) and client (EmailClient.tsx).
 * This file must NOT import any server-only modules.
 *
 * Zone: 🟡 EXTEND — safe for client import
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutomationConfig {
    abandoned_cart_enabled: boolean
    abandoned_cart_delay_hours: number
    review_request_enabled: boolean
    review_request_delay_days: number
}

export interface AbandonedCart {
    cart_id: string
    customer_email: string
    customer_name: string
    items: Array<{ title: string; quantity: number; price: string }>
    total: string
    currency: string
    abandoned_at: Date
}

export interface DeliveredOrder {
    order_id: string
    display_id: string
    customer_email: string
    customer_name: string
    delivered_at: Date
    items: Array<{ title: string }>
}

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

export const DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
    abandoned_cart_enabled: false,
    abandoned_cart_delay_hours: 3,
    review_request_enabled: false,
    review_request_delay_days: 7,
}

// ---------------------------------------------------------------------------
// Supported delay options (for owner panel dropdown)
// ---------------------------------------------------------------------------

export const ABANDONED_CART_DELAY_OPTIONS = [
    { value: 1, label: '1 hour' },
    { value: 3, label: '3 hours' },
    { value: 6, label: '6 hours' },
    { value: 24, label: '24 hours' },
] as const

export const REVIEW_REQUEST_DELAY_OPTIONS = [
    { value: 3, label: '3 days' },
    { value: 7, label: '7 days' },
    { value: 14, label: '14 days' },
] as const
