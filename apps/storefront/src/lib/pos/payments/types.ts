/**
 * POS Payment Types — Pure type definitions (no implementation)
 *
 * Shared by payment-adapter.ts, stripe-terminal.ts, and twint-payment.ts.
 * Extracted to break circular dependency detected by Sentrux.
 *
 * @module pos/payments/types
 */

import type { PaymentMethod, PaymentProcessingState } from '@/lib/pos/pos-config'

// ---------------------------------------------------------------------------
// Charge Request / Result
// ---------------------------------------------------------------------------

export interface ChargeRequest {
    /** Amount in minor units (cents / Rappen) */
    amount: number
    /** ISO 4217 currency code */
    currency: string
    /** Payment method selected */
    method: PaymentMethod
    /** Associated Medusa draft order ID */
    draft_order_id?: string
    /** Terminal reader ID (required for card_terminal) */
    reader_id?: string
    /** Additional metadata */
    metadata?: Record<string, string>
}

export interface ChargeResult {
    success: boolean
    /** Stripe PaymentIntent ID (for card_terminal and twint) */
    payment_intent_id?: string
    /** Error message */
    error?: string
    /**
     * If result requires further action (e.g., present card, scan QR).
     * The caller should update the UI accordingly.
     */
    requires_action?: 'present_card' | 'scan_qr'
    /** Data for the required action */
    action_data?: {
        /** QR code URL for Twint */
        qr_url?: string
        /** Expiration time for QR code */
        expires_at?: string
        /** Reader display message */
        reader_display?: string
        /** PaymentIntent ID for polling */
        payment_intent_id?: string
    }
}
