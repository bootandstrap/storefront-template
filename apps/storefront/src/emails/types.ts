/**
 * Email Types — Shared type definitions for the email system.
 *
 * Extracted to avoid circular dependencies between email.ts
 * (engine) and email-template-registry.ts (component registry).
 *
 * Zone: 🔴 LOCKED — Do not modify without updating both email.ts and registry.
 */

export type EmailTemplate =
    | 'order_confirmation'
    | 'order_shipped'
    | 'order_delivered'
    | 'order_cancelled'
    | 'payment_failed'
    | 'refund_processed'
    | 'low_stock_alert'
    | 'welcome'
    | 'password_reset'
    | 'account_verification'
    | 'review_request'
    | 'abandoned_cart'
    | 'pos_receipt'

export type { LayoutComponent } from './layouts/types'

