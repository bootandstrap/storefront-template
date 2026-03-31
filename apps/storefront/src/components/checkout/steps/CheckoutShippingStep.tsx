'use client'

import { MapPin, Loader2 } from 'lucide-react'
import type { ShippingOption } from '@/app/[lang]/(shop)/checkout/actions'

interface CheckoutShippingStepProps {
    shippingOptions: ShippingOption[]
    selectedShipping: string | null
    shippingLoading: boolean
    onSelectShipping: (id: string) => void
    formatPrice: (amount: number) => string
    t: (key: string) => string
}

export default function CheckoutShippingStep({
    shippingOptions,
    selectedShipping,
    shippingLoading,
    onSelectShipping,
    formatPrice,
    t,
}: CheckoutShippingStepProps) {
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-brand" />
                <h3 className="font-bold">{t('checkout.steps.shipping') || 'Envío'}</h3>
            </div>
            {shippingLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-tx-muted" />
                </div>
            ) : (
                <div className="space-y-2">
                    {shippingOptions.map((opt) => {
                        const isSelected = selectedShipping === opt.id
                        const nameLC = opt.name.toLowerCase()
                        const deliveryHint = nameLC.includes('express')
                            ? t('checkout.shipping.estimateExpress') || '24h'
                            : t('checkout.shipping.estimateStandard') || '2-3 days'
                        return (
                            <button
                                key={opt.id}
                                onClick={() => onSelectShipping(opt.id)}
                                type="button"
                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${isSelected
                                    ? 'border-brand bg-brand-subtle ring-1 ring-soft'
                                    : 'border-sf-3 bg-white/3 hover:bg-glass'
                                    }`}
                            >
                                <div>
                                    <span className="text-sm font-medium text-tx">{opt.name}</span>
                                    <span className="block text-[11px] text-tx-muted mt-0.5">
                                        {deliveryHint}
                                    </span>
                                </div>
                                <span className="text-sm font-bold text-brand">
                                    {opt.amount > 0 ? formatPrice(opt.amount) : t('checkout.freeShipping') || 'Gratis'}
                                </span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
