'use client'

import { CreditCard, Loader2 } from 'lucide-react'
import type { PaymentMethod } from '@/lib/payment-methods'

interface CheckoutMethodStepProps {
    availableMethods: PaymentMethod[]
    selectedMethod: string | null
    loadingMethods: boolean
    onSelectMethod: (id: string) => void
    t: (key: string) => string
}

export default function CheckoutMethodStep({
    availableMethods,
    selectedMethod,
    loadingMethods,
    onSelectMethod,
    t,
}: CheckoutMethodStepProps) {
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="font-bold">{t('checkout.steps.method')}</h3>
            </div>

            {loadingMethods ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                    <span className="ml-2 text-sm text-text-muted">
                        {t('checkout.loadingMethods')}
                    </span>
                </div>
            ) : availableMethods.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                    <p className="text-sm">
                        {t('checkout.noMethods')}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {availableMethods.map((method) => {
                        const Icon = method.icon
                        const isSelected = selectedMethod === method.id
                        return (
                            <button
                                key={method.id}
                                onClick={() => onSelectMethod(method.id)}
                                type="button"
                                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${isSelected
                                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                    : 'border-surface-3 bg-white/3 hover:bg-white/5 hover:border-surface-2'
                                    }`}
                            >
                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/20' : 'bg-surface-1'
                                    }`}>
                                    <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-text-muted'
                                        }`} />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-sm font-medium text-text-primary">
                                        {method.label}
                                    </p>
                                    <p className="text-xs text-text-muted">
                                        {method.description}
                                    </p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                                    ? 'border-primary bg-primary'
                                    : 'border-surface-3'
                                    }`}>
                                    {isSelected && (
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
