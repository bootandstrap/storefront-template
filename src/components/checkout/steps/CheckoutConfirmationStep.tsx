'use client'

import { CheckCircle } from 'lucide-react'

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
    return (
        <div className="text-center py-6 animate-fade-in">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-text-primary mb-2">
                {t('checkout.confirmation.title')}
            </h3>
            {orderResult && orderResult.display_id > 0 && (
                <p className="text-sm text-text-secondary mb-4">
                    {t('checkout.confirmation.orderNumber')}{' '}
                    <span className="font-bold text-primary">
                        #{orderResult.display_id}
                    </span>
                </p>
            )}
            <p className="text-sm text-text-muted mb-6">
                {selectedMethod === 'card'
                    ? t('checkout.confirmation.cardMsg')
                    : selectedMethod === 'bank_transfer'
                        ? t('checkout.confirmation.bankMsg')
                        : selectedMethod === 'cod'
                            ? t('checkout.confirmation.codMsg')
                            : selectedMethod === 'whatsapp'
                                ? t('checkout.confirmation.whatsappMsg')
                                : t('checkout.confirmation.genericMsg')}
            </p>
            <button
                onClick={onClose}
                className="btn btn-primary px-8 py-2"
                type="button"
            >
                {t('common.close')}
            </button>
        </div>
    )
}
