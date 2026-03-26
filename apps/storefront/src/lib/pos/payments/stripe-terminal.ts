/**
 * Stripe Terminal — Server-Driven Integration
 *
 * All Terminal operations are server-side via Stripe REST API.
 * No local network access or @stripe/terminal-js needed.
 *
 * Flow:
 * 1. Create PaymentIntent with `card_present` payment method type
 * 2. Process PaymentIntent on reader via Stripe API
 * 3. Poll reader status until terminal state
 * 4. Capture if needed (auto-capture recommended)
 *
 * @see https://docs.stripe.com/terminal/payments/collect-payment?terminal-sdk-platform=server-driven
 */

import type { ChargeResult } from './payment-adapter'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TerminalPaymentRequest {
    amount: number
    currency: string
    reader_id: string
    metadata?: Record<string, string>
}

export interface TerminalReader {
    id: string
    label: string
    status: string
    device_type: string
}

export interface ReaderActionStatus {
    status: 'in_progress' | 'succeeded' | 'failed'
    failure_code?: string
    failure_message?: string
    payment_intent_id?: string
}

// ---------------------------------------------------------------------------
// Server action wrappers (call server actions from client)
// ---------------------------------------------------------------------------

/**
 * Process a card payment via Stripe Terminal (server-driven).
 *
 * Returns immediately with `requires_action: 'present_card'` — the caller
 * should show the "Present card" overlay and poll via `pollTerminalStatus()`.
 */
export async function processTerminalPayment(
    req: TerminalPaymentRequest
): Promise<ChargeResult> {
    try {
        // Dynamic import of server actions (only available on server)
        const { createTerminalPaymentAction } = await import(
            '@/app/[lang]/(panel)/panel/pos/actions'
        )

        const result = await createTerminalPaymentAction({
            amount: req.amount,
            currency: req.currency,
            reader_id: req.reader_id,
            metadata: req.metadata || {},
        })

        if (!result.success) {
            return { success: false, error: result.error }
        }

        return {
            success: false, // Not complete yet — requires card presentation
            requires_action: 'present_card',
            action_data: {
                reader_display: `CHF ${(req.amount / 100).toFixed(2)}`,
                payment_intent_id: result.payment_intent_id,
            },
        }
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Terminal payment failed',
        }
    }
}

/**
 * Poll the Terminal reader for payment status.
 * Call this in a loop (e.g., every 2s) after `processTerminalPayment()`.
 */
export async function pollTerminalStatus(
    readerId: string
): Promise<ReaderActionStatus> {
    try {
        const { pollTerminalPaymentAction } = await import(
            '@/app/[lang]/(panel)/panel/pos/actions'
        )
        return await pollTerminalPaymentAction(readerId)
    } catch {
        return { status: 'failed', failure_message: 'Poll failed' }
    }
}

/**
 * Cancel an in-progress Terminal action (e.g., user pressed Cancel).
 */
export async function cancelTerminalPayment(readerId: string): Promise<boolean> {
    try {
        const { cancelTerminalActionAction } = await import(
            '@/app/[lang]/(panel)/panel/pos/actions'
        )
        return await cancelTerminalActionAction(readerId)
    } catch {
        return false
    }
}

/**
 * List available Terminal readers for this tenant's location.
 */
export async function listReaders(): Promise<TerminalReader[]> {
    try {
        const { listTerminalReadersAction } = await import(
            '@/app/[lang]/(panel)/panel/pos/actions'
        )
        return await listTerminalReadersAction()
    } catch {
        return []
    }
}
