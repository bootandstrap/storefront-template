'use client'

import { AlertCircle, CreditCard, Loader2, RotateCcw } from 'lucide-react'
import type { PaymentMethod } from '@/lib/payment-methods'

interface CheckoutMethodStepProps {
    availableMethods: PaymentMethod[]
    selectedMethod: string | null
    loadingMethods: boolean
    methodsError: string | null
    onSelectMethod: (id: string) => void
    onRetryMethods: () => void
    t: (key: string) => string
}

export default function CheckoutMethodStep({
    availableMethods,
    selectedMethod,
    loadingMethods,
    methodsError,
    onSelectMethod,
    onRetryMethods,
    t,
}: CheckoutMethodStepProps) {
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-brand" />
                <h3 className="font-bold">{t('checkout.steps.method')}</h3>
            </div>

            {loadingMethods ? (
                <div
                    data-testid="checkout-methods-loading"
                    role="status"
                    aria-live="polite"
                    className="flex items-center justify-center py-8"
                >
                    <Loader2 className="w-5 h-5 animate-spin text-tx-muted" />
                    <span className="ml-2 text-sm text-tx-muted">
                        {t('checkout.loadingMethods')}
                    </span>
                </div>
            ) : methodsError ? (
                <div
                    data-testid="checkout-methods-error"
                    role="alert"
                    className="flex flex-col items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center"
                >
                    <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                    <p className="text-sm text-red-600 dark:text-red-400">{methodsError}</p>
                    <button
                        data-testid="checkout-methods-retry"
                        type="button"
                        onClick={onRetryMethods}
                        className="btn btn-secondary px-4 py-2"
                    >
                        <RotateCcw className="h-4 w-4" />
                        {t('common.retry')}
                    </button>
                </div>
            ) : availableMethods.length === 0 ? (
                <div
                    data-testid="checkout-methods-empty"
                    role="status"
                    aria-live="polite"
                    className="text-center py-8 text-tx-muted"
                >
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
                                    ? 'border-brand bg-brand-subtle ring-1 ring-soft'
                                    : 'border-sf-3 bg-white/3 hover:bg-glass hover:border-sf-2'
                                    }`}
                            >
                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-brand-muted' : 'bg-sf-1'
                                    }`}>
                                    <Icon className={`w-5 h-5 ${isSelected ? 'text-brand' : 'text-tx-muted'
                                        }`} />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-sm font-medium text-tx">
                                        {t(method.labelKey) !== method.labelKey ? t(method.labelKey) : method.label}
                                    </p>
                                    <p className="text-xs text-tx-muted">
                                        {t(method.descriptionKey) !== method.descriptionKey ? t(method.descriptionKey) : method.description}
                                    </p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                                    ? 'border-brand bg-brand'
                                    : 'border-sf-3'
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
