'use client'

import { ShoppingBag } from 'lucide-react'
import FreeShippingBanner from '@/components/cart/FreeShippingBanner'
import type { CartTotals } from '@/app/[lang]/(shop)/checkout/actions'

interface CheckoutOrderSummaryProps {
    items: { id: string }[]
    cartTotals: CartTotals | null
    displayTotal: number
    formatPrice: (amount: number) => string
    t: (key: string, vars?: Record<string, string>) => string
    /** Free shipping threshold in cents (0 = disabled) */
    freeShippingThreshold?: number
    /** Currency code */
    currency?: string
    /** Locale */
    locale?: string
}

export default function CheckoutOrderSummary({
    items,
    cartTotals,
    displayTotal,
    formatPrice,
    t,
    freeShippingThreshold = 0,
    currency = 'EUR',
    locale = 'en',
}: CheckoutOrderSummaryProps) {
    return (
        <div className="mt-6 pt-4 border-t border-sf-3">
            <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-4 h-4 text-tx-muted" />
                <span className="text-xs text-tx-muted">
                    {items.length} {t('checkout.items') || 'artículos'}
                </span>
            </div>
            {cartTotals ? (
                <div className="space-y-1">
                    <div className="flex justify-between text-sm text-tx-sec">
                        <span>{t('checkout.subtotal') || 'Subtotal'}</span>
                        <span>{formatPrice(cartTotals.subtotal)}</span>
                    </div>
                    {cartTotals.shipping_total > 0 && (
                        <div className="flex justify-between text-sm text-tx-sec">
                            <span>{t('checkout.shipping') || 'Envío'}</span>
                            <span>{formatPrice(cartTotals.shipping_total)}</span>
                        </div>
                    )}
                    {cartTotals.shipping_total === 0 && freeShippingThreshold > 0 && cartTotals.subtotal >= freeShippingThreshold && (
                        <div className="flex justify-between text-sm">
                            <span className="text-tx-sec">{t('checkout.shipping') || 'Envío'}</span>
                            <span className="text-green-600 font-medium">{t('cart.freeShipping.unlocked')}</span>
                        </div>
                    )}
                    {cartTotals.tax_total > 0 && (
                        <div className="flex justify-between text-sm text-tx-sec">
                            <span>{t('checkout.tax') || 'Impuestos'}</span>
                            <span>{formatPrice(cartTotals.tax_total)}</span>
                        </div>
                    )}
                    {cartTotals.discount_total > 0 && (
                        <div className="flex justify-between text-sm text-green-500">
                            <span>{t('checkout.discount') || 'Descuento'}</span>
                            <span>-{formatPrice(cartTotals.discount_total)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-1 border-t border-sf-3">
                        <span className="text-sm font-medium text-tx">{t('cart.total')}</span>
                        <span className="text-lg font-bold text-brand">
                            {formatPrice(cartTotals.total)}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="flex justify-between items-center">
                    <span className="text-sm text-tx-sec">{t('cart.total')}</span>
                    <span className="text-lg font-bold text-brand">
                        {formatPrice(displayTotal)}
                    </span>
                </div>
            )}
        </div>
    )
}
