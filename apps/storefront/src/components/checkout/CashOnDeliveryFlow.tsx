'use client'

import { useState } from 'react'
import { Banknote, Loader2, AlertCircle, MapPin } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CashOnDeliveryFlowProps {
    deliveryAddress: string
    totalFormatted: string
    onConfirm: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CashOnDeliveryFlow({
    deliveryAddress,
    totalFormatted,
    onConfirm,
}: CashOnDeliveryFlowProps) {
    const { t } = useI18n()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleConfirm() {
        setIsSubmitting(true)
        setError(null)
        try {
            await onConfirm()
        } catch (err) {
            setError(err instanceof Error ? err.message : t('checkout.errors.orderCreate'))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="text-center mb-2">
                <Banknote className="w-8 h-8 text-brand mx-auto mb-2" />
                <h3 className="text-base font-bold text-tx">
                    {t('checkout.cod.title')}
                </h3>
                <p className="text-sm text-tx-sec mt-1">
                    {t('checkout.cod.description')}
                </p>
            </div>

            {/* Address recap */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/8">
                <MapPin className="w-5 h-5 text-tx-muted mt-0.5 shrink-0" />
                <div>
                    <span className="text-xs text-tx-muted block">{t('checkout.steps.address')}</span>
                    <span className="text-sm text-tx">{deliveryAddress || t('checkout.cod.noAddress')}</span>
                </div>
            </div>

            {/* Total reminder */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-brand-subtle border border-brand-soft">
                <span className="text-sm text-tx-sec">{t('checkout.cod.totalOnDelivery')}</span>
                <span className="text-base font-bold text-brand">{totalFormatted}</span>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-300">
                    🚚 {t('checkout.cod.deliveryNote')}
                </p>
            </div>

            {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="btn btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('checkout.creatingOrder')}
                    </>
                ) : (
                    <>
                        <Banknote className="w-5 h-5" />
                        {t('checkout.cod.confirmButton')}
                    </>
                )}
            </button>
        </div>
    )
}
