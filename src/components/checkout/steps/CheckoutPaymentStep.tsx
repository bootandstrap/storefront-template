'use client'

import { Loader2 } from 'lucide-react'
import StripeCheckoutFlow from '@/components/checkout/StripeCheckoutFlow'
import WhatsAppCheckoutFlow from '@/components/checkout/WhatsAppCheckoutFlow'
import BankTransferFlow from '@/components/checkout/BankTransferFlow'
import CashOnDeliveryFlow from '@/components/checkout/CashOnDeliveryFlow'
import type { StoreConfig } from '@/lib/config'
import type { MedusaLineItem } from '@/lib/medusa/client'

interface CheckoutPaymentStepProps {
    selectedMethod: string | null
    clientSecret: string | null
    stripeLoading: boolean
    error: string | null
    config: StoreConfig
    cartId: string | undefined
    items: MedusaLineItem[]
    customerName: string
    customerEmail: string
    customerPhone: string
    deliveryAddress: string
    notes: string
    bankDetails?: {
        bank_name?: string | null
        bank_account_number?: string | null
        bank_account_holder?: string | null
        bank_account_type?: string | null
        bank_nit?: string | null
    }
    totalFormatted: string
    onStripeSuccess: (paymentIntentId: string) => void
    onError: (msg: string) => void
    onWhatsAppComplete: (order?: { id: string; display_id: number }) => void
    onBankTransferConfirm: () => Promise<void>
    onCODConfirm: () => Promise<void>
    t: (key: string) => string
}

export default function CheckoutPaymentStep({
    selectedMethod,
    clientSecret,
    stripeLoading,
    error,
    config,
    cartId,
    items,
    customerName,
    customerEmail,
    customerPhone,
    deliveryAddress,
    notes,
    bankDetails,
    totalFormatted,
    onStripeSuccess,
    onError,
    onWhatsAppComplete,
    onBankTransferConfirm,
    onCODConfirm,
    t,
}: CheckoutPaymentStepProps) {
    return (
        <div className="animate-fade-in">
            {stripeLoading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                    <span className="ml-2 text-sm text-text-muted">
                        {t('checkout.initPayment')}
                    </span>
                </div>
            )}

            {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {/* Stripe */}
            {selectedMethod === 'card' && clientSecret && !stripeLoading && (
                <StripeCheckoutFlow
                    clientSecret={clientSecret}
                    config={config}
                    onSuccess={onStripeSuccess}
                    onError={onError}
                    totalFormatted={totalFormatted}
                />
            )}

            {/* WhatsApp */}
            {selectedMethod === 'whatsapp' && cartId && (
                <WhatsAppCheckoutFlow
                    config={config}
                    items={items}
                    cartId={cartId}
                    customerName={customerName}
                    customerEmail={customerEmail}
                    customerPhone={customerPhone}
                    deliveryAddress={deliveryAddress}
                    notes={notes}
                    onComplete={onWhatsAppComplete}
                />
            )}

            {/* Bank Transfer */}
            {selectedMethod === 'bank_transfer' && (
                <BankTransferFlow
                    bankDetails={bankDetails ?? {}}
                    totalFormatted={totalFormatted}
                    onConfirm={onBankTransferConfirm}
                />
            )}

            {/* Cash on Delivery */}
            {selectedMethod === 'cod' && (
                <CashOnDeliveryFlow
                    deliveryAddress={deliveryAddress}
                    totalFormatted={totalFormatted}
                    onConfirm={onCODConfirm}
                />
            )}
        </div>
    )
}
