/**
 * Payment method brand icons using react-svg-credit-card-payment-icons.
 * Shows real Visa/Mastercard/Amex/PayPal SVGs instead of generic Lucide icons.
 * Feature-flag gated: only shows icons for payment methods the tenant has enabled.
 */

import { VisaIcon, MastercardIcon, AmexIcon, PayPalIcon } from 'react-svg-credit-card-payment-icons'
import { Banknote, MessageCircle, Lock } from 'lucide-react'

interface PaymentIconsProps {
    enableOnlinePayments?: boolean
    enableCashOnDelivery?: boolean
    enableWhatsappCheckout?: boolean
    label?: string
}

export default function PaymentIcons({
    enableOnlinePayments = false,
    enableCashOnDelivery = false,
    enableWhatsappCheckout = false,
    label = 'Pago seguro',
}: PaymentIconsProps) {
    const hasAnyPayment = enableOnlinePayments || enableCashOnDelivery || enableWhatsappCheckout

    if (!hasAnyPayment) return null

    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-tx-muted">
                <Lock className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{label}:</span>
            </div>

            <div className="flex items-center gap-1.5">
                {/* Card brands — only when online payments enabled */}
                {enableOnlinePayments && (
                    <>
                        <div className="payment-icon" aria-label="Visa">
                            <VisaIcon width={36} height={24} />
                        </div>
                        <div className="payment-icon" aria-label="Mastercard">
                            <MastercardIcon width={36} height={24} />
                        </div>
                        <div className="payment-icon" aria-label="Amex">
                            <AmexIcon width={36} height={24} />
                        </div>
                        <div className="payment-icon" aria-label="PayPal">
                            <PayPalIcon width={36} height={24} />
                        </div>
                    </>
                )}

                {/* Cash on delivery */}
                {enableCashOnDelivery && (
                    <div className="payment-icon payment-icon-alt" aria-label="Contra reembolso">
                        <Banknote className="w-5 h-5 text-tx-sec" />
                    </div>
                )}

                {/* WhatsApp checkout */}
                {enableWhatsappCheckout && (
                    <div className="payment-icon payment-icon-alt" aria-label="WhatsApp">
                        <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    </div>
                )}
            </div>
        </div>
    )
}
