'use client'

import { ShoppingBag } from 'lucide-react'
import type { CartTotals } from '@/app/[lang]/(shop)/checkout/actions'

interface CheckoutOrderSummaryProps {
    items: { id: string }[]
    cartTotals: CartTotals | null
    displayTotal: number
    formatPrice: (amount: number) => string
    t: (key: string) => string
}

export default function CheckoutOrderSummary({
    items,
    cartTotals,
    displayTotal,
    formatPrice,
    t,
}: CheckoutOrderSummaryProps) {
    return (
        <div className="mt-6 pt-4 border-t border-surface-3">
            <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-4 h-4 text-text-muted" />
                <span className="text-xs text-text-muted">
                    {items.length} {t('checkout.items') || 'artículos'}
                </span>
            </div>
            {cartTotals ? (
                <div className="space-y-1">
                    <div className="flex justify-between text-sm text-text-secondary">
                        <span>{t('checkout.subtotal') || 'Subtotal'}</span>
                        <span>{formatPrice(cartTotals.subtotal)}</span>
                    </div>
                    {cartTotals.shipping_total > 0 && (
                        <div className="flex justify-between text-sm text-text-secondary">
                            <span>{t('checkout.shipping') || 'Envío'}</span>
                            <span>{formatPrice(cartTotals.shipping_total)}</span>
                        </div>
                    )}
                    {cartTotals.tax_total > 0 && (
                        <div className="flex justify-between text-sm text-text-secondary">
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
                    <div className="flex justify-between items-center pt-1 border-t border-surface-3">
                        <span className="text-sm font-medium text-text-primary">{t('cart.total')}</span>
                        <span className="text-lg font-bold text-primary">
                            {formatPrice(cartTotals.total)}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">{t('cart.total')}</span>
                    <span className="text-lg font-bold text-primary">
                        {formatPrice(displayTotal)}
                    </span>
                </div>
            )}
        </div>
    )
}
