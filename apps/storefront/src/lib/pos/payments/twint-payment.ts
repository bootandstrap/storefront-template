/**
 * Twint QR Payment — via Stripe PaymentIntent
 *
 * Stripe supports Twint as a payment method (Switzerland).
 * Flow:
 * 1. Create PaymentIntent with `payment_method_types: ['twint']`
 * 2. Confirm the PI → get `next_action.twint_redirect_qr_code`
 * 3. Display QR on POS screen
 * 4. Customer scans with Twint app
 * 5. Poll PI status → `succeeded`
 *
 * @see https://docs.stripe.com/payments/twint
 */

import type { ChargeResult } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TwintPaymentRequest {
    amount: number
    currency: string
    metadata?: Record<string, string>
}

export interface TwintPaymentStatus {
    status: 'requires_action' | 'processing' | 'succeeded' | 'canceled' | 'failed'
    error?: string
}

// ---------------------------------------------------------------------------
// Twint operations (via server actions)
// ---------------------------------------------------------------------------

/**
 * Initiate a Twint payment. Returns the QR code URL for display.
 *
 * The caller should show the QR code and poll via `pollTwintStatus()`.
 */
export async function processTwintPayment(
    req: TwintPaymentRequest
): Promise<ChargeResult> {
    try {
        const { createTwintPaymentAction } = await import(
            '@/app/[lang]/(panel)/panel/pos/actions'
        )

        const result = await createTwintPaymentAction({
            amount: req.amount,
            currency: req.currency,
            metadata: req.metadata || {},
        })

        if (!result.success) {
            return { success: false, error: result.error }
        }

        return {
            success: false, // Not complete — requires QR scan
            requires_action: 'scan_qr',
            action_data: {
                qr_url: result.qr_url,
                expires_at: result.expires_at,
                payment_intent_id: result.payment_intent_id,
            },
        }
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Twint payment failed',
        }
    }
}

/**
 * Poll the PaymentIntent status for a Twint payment.
 * Call every 2s until status is 'succeeded', 'canceled', or 'failed'.
 */
export async function pollTwintStatus(
    paymentIntentId: string
): Promise<TwintPaymentStatus> {
    try {
        const { pollTwintPaymentAction } = await import(
            '@/app/[lang]/(panel)/panel/pos/actions'
        )
        return await pollTwintPaymentAction(paymentIntentId)
    } catch {
        return { status: 'failed', error: 'Poll failed' }
    }
}

/**
 * Cancel a pending Twint payment.
 */
export async function cancelTwintPayment(
    paymentIntentId: string
): Promise<boolean> {
    try {
        const { cancelTwintPaymentAction } = await import(
            '@/app/[lang]/(panel)/panel/pos/actions'
        )
        return await cancelTwintPaymentAction(paymentIntentId)
    } catch {
        return false
    }
}
