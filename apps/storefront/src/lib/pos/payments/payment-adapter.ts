/**
 * POS Payment Adapter — Unified payment interface
 *
 * Routes charge requests to the appropriate payment handler:
 * - cash → immediate success (no Stripe)
 * - card_terminal → Stripe Terminal (server-driven)
 * - twint → Stripe PaymentIntent with Twint method
 * - manual_card → record-only (manual entry, no processing)
 */

import type { PaymentProcessingState } from '@/lib/pos/pos-config'

// Re-export types for backward compatibility
export type { ChargeRequest, ChargeResult } from './types'
import type { ChargeRequest, ChargeResult } from './types'

// ---------------------------------------------------------------------------
// Handler imports (lazy to avoid loading Stripe SDK when not needed)
// ---------------------------------------------------------------------------

type TerminalHandler = typeof import('./stripe-terminal')
type TwintHandler = typeof import('./twint-payment')

let _terminalHandler: TerminalHandler | null = null
let _twintHandler: TwintHandler | null = null

async function getTerminalHandler(): Promise<TerminalHandler> {
    if (!_terminalHandler) {
        _terminalHandler = await import('./stripe-terminal')
    }
    return _terminalHandler
}

async function getTwintHandler(): Promise<TwintHandler> {
    if (!_twintHandler) {
        _twintHandler = await import('./twint-payment')
    }
    return _twintHandler
}

// ---------------------------------------------------------------------------
// Main charge function
// ---------------------------------------------------------------------------

/**
 * Unified charge entry point. Routes to the correct payment handler.
 *
 * For `cash` and `manual_card`: resolves immediately.
 * For `card_terminal`: creates PI, sends to reader, returns `requires_action: 'present_card'`.
 * For `twint`: creates PI with twint method, returns `requires_action: 'scan_qr'`.
 *
 * The caller is responsible for polling terminal/twint status after receiving `requires_action`.
 */
export async function charge(req: ChargeRequest): Promise<ChargeResult> {
    switch (req.method) {
        case 'cash':
        case 'manual_card':
            return {
                success: true,
                metadata: { method: req.method },
            } as ChargeResult

        case 'card_terminal': {
            if (!req.reader_id) {
                return { success: false, error: 'No terminal reader selected' }
            }
            const handler = await getTerminalHandler()
            return handler.processTerminalPayment({
                amount: req.amount,
                currency: req.currency,
                reader_id: req.reader_id,
                metadata: {
                    ...req.metadata,
                    draft_order_id: req.draft_order_id || '',
                    source: 'pos',
                },
            })
        }

        case 'twint': {
            const handler = await getTwintHandler()
            return handler.processTwintPayment({
                amount: req.amount,
                currency: req.currency,
                metadata: {
                    ...req.metadata,
                    draft_order_id: req.draft_order_id || '',
                    source: 'pos',
                },
            })
        }

        default:
            return { success: false, error: `Unknown payment method: ${req.method}` }
    }
}

// ---------------------------------------------------------------------------
// Payment state helpers
// ---------------------------------------------------------------------------

/**
 * Determine if a payment processing state is terminal (no further action needed).
 */
export function isTerminalState(state: PaymentProcessingState): boolean {
    return ['idle', 'succeeded', 'failed', 'cancelled'].includes(state.status)
}

/**
 * Human-readable label for payment processing state.
 */
export function getProcessingLabel(
    state: PaymentProcessingState,
    labels: Record<string, string>
): string {
    switch (state.status) {
        case 'idle': return ''
        case 'creating_intent': return labels['panel.pos.creatingPayment'] || 'Creando pago…'
        case 'awaiting_card': return labels['panel.pos.presentCard'] || 'Presente la tarjeta…'
        case 'awaiting_twint_scan': return labels['panel.pos.scanTwint'] || 'Escanee el código QR con Twint…'
        case 'processing': return labels['panel.pos.processing'] || 'Procesando pago…'
        case 'succeeded': return labels['panel.pos.paymentSuccess'] || '¡Pago exitoso!'
        case 'failed': return state.error || labels['panel.pos.paymentFailed'] || 'Pago fallido'
        case 'cancelled': return labels['panel.pos.paymentCancelled'] || 'Pago cancelado'
    }
}
