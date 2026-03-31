'use client'

import { Truck, Gift } from 'lucide-react'

interface FreeShippingBannerProps {
    /** Cart subtotal in cents */
    subtotal: number
    /** Free shipping threshold in cents (0 = disabled) */
    threshold: number
    /** Currency code for formatting */
    currency: string
    /** Locale for number formatting */
    locale: string
    /** Translation function */
    t: (key: string, vars?: Record<string, string>) => string
    /** Optional: compact mode for order summary */
    compact?: boolean
}

/**
 * Reusable free shipping progress banner.
 * Shows:
 * - Progress bar + "Add €X more for free shipping" when below threshold
 * - "🎉 You've unlocked free shipping!" when threshold is met
 * - Nothing when threshold is 0 (disabled)
 */
export default function FreeShippingBanner({
    subtotal,
    threshold,
    currency,
    locale,
    t,
    compact = false,
}: FreeShippingBannerProps) {
    // Disabled — threshold is 0 or negative
    if (!threshold || threshold <= 0) return null

    const remaining = threshold - subtotal
    const progress = Math.min((subtotal / threshold) * 100, 100)
    const unlocked = subtotal >= threshold

    const formatAmount = (amount: number) =>
        new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount / 100)

    if (compact) {
        // Compact mode for order summary — single line
        if (unlocked) {
            return (
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <Gift className="w-3.5 h-3.5" />
                    <span>{t('cart.freeShipping.unlocked')}</span>
                </div>
            )
        }
        return (
            <div className="flex items-center gap-1.5 text-xs text-tx-muted">
                <Truck className="w-3.5 h-3.5" />
                <span>
                    {t('cart.freeShipping.remaining').replace('{amount}', formatAmount(remaining))}
                </span>
            </div>
        )
    }

    // Full mode for cart drawer + checkout page
    return (
        <div className={`rounded-xl p-3 transition-all ${unlocked
                ? 'bg-green-50 border border-green-200'
                : 'bg-sf-1 border border-sf-3'
            }`}>
            {unlocked ? (
                <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Gift className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-green-700">
                            {t('cart.freeShipping.unlocked')}
                        </p>
                        <p className="text-xs text-green-600">
                            {t('cart.freeShipping.applied')}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 mb-2">
                        <Truck className="w-4 h-4 text-brand flex-shrink-0" />
                        <p className="text-sm text-tx-sec">
                            {t('cart.freeShipping.remaining').replace('{amount}', formatAmount(remaining))}
                        </p>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-sf-3 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-tx-muted mt-1 text-right">
                        {formatAmount(subtotal)} / {formatAmount(threshold)}
                    </p>
                </>
            )}
        </div>
    )
}
