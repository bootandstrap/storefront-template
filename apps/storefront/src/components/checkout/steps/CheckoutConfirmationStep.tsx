'use client'

import { useEffect, useRef } from 'react'
import { CheckCircle, ShoppingBag, ArrowRight } from 'lucide-react'
import { fireConfetti } from '@/lib/confetti'

interface CheckoutConfirmationStepProps {
    orderResult: { id: string; display_id: number } | null
    selectedMethod: string | null
    onClose: () => void
    t: (key: string) => string
}

export default function CheckoutConfirmationStep({
    orderResult,
    selectedMethod,
    onClose,
    t,
}: CheckoutConfirmationStepProps) {
    const confettiFired = useRef(false)

    // Fire confetti once on mount
    useEffect(() => {
        if (!confettiFired.current) {
            confettiFired.current = true
            // Small delay so the animation plays after the component renders
            setTimeout(fireConfetti, 200)
        }
    }, [])

    const methodMessage =
        selectedMethod === 'card'
            ? t('checkout.confirmation.cardMsg')
            : selectedMethod === 'bank_transfer'
                ? t('checkout.confirmation.bankMsg')
                : selectedMethod === 'cod'
                    ? t('checkout.confirmation.codMsg')
                    : selectedMethod === 'whatsapp'
                        ? t('checkout.confirmation.whatsappMsg')
                        : t('checkout.confirmation.genericMsg')

    return (
        <div className="text-center py-8 animate-fade-in">
            {/* Success icon with brand accent ring */}
            <div className="relative w-20 h-20 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full bg-green-100 dark:bg-green-900/30 animate-scale-in" />
                <CheckCircle className="relative w-20 h-20 text-green-500 animate-check-bounce" strokeWidth={1.5} />
            </div>

            <h3 className="text-xl font-bold text-tx mb-2 font-display">
                {t('checkout.confirmation.title')}
            </h3>

            {orderResult && orderResult.display_id > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 mb-3">
                    <ShoppingBag className="w-4 h-4 text-brand" />
                    <span className="text-sm text-tx-sec">
                        {t('checkout.confirmation.orderNumber')}{' '}
                        <span className="font-bold text-brand">
                            #{orderResult.display_id}
                        </span>
                    </span>
                </div>
            )}

            <p className="text-sm text-tx-muted mb-8 max-w-sm mx-auto leading-relaxed">
                {methodMessage}
            </p>

            <button
                onClick={onClose}
                className="btn btn-primary px-8 py-2.5 group"
                type="button"
            >
                {t('checkout.confirmation.continueShopping') || t('common.close')}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
        </div>
    )
}
