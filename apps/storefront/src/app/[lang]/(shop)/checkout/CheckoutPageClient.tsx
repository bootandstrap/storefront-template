'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useI18n } from '@/lib/i18n/provider'
import CheckoutModal from '@/components/checkout/CheckoutModal'
import { ShoppingBag, ArrowLeft, CreditCard } from 'lucide-react'
import Link from 'next/link'
import CartItem from '@/components/cart/CartItem'
import PromotionInput from '@/components/checkout/PromotionInput'
import type { StoreConfig, FeatureFlags } from '@/lib/config'

interface CheckoutPageClientProps {
    config: StoreConfig
    featureFlags: FeatureFlags
    bankDetails?: {
        bank_name?: string | null
        bank_account_number?: string | null
        bank_account_holder?: string | null
        bank_account_type?: string | null
        bank_nit?: string | null
    }
}

export default function CheckoutPageClient({
    config,
    featureFlags,
    bankDetails,
}: CheckoutPageClientProps) {
    const { cart, itemCount } = useCart()
    const { t, localizedHref, locale } = useI18n()
    const [modalOpen, setModalOpen] = useState(false)

    const items = cart?.items ?? []
    const currency = items[0]?.variant?.prices?.[0]?.currency_code || 'COP'
    const total = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

    const formatPrice = (amount: number) =>
        new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 0,
        }).format(amount / 100)

    if (items.length === 0) {
        return (
            <div className="container-page py-16 text-center">
                <ShoppingBag className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <h2 className="text-xl font-bold text-text-primary mb-2">
                    {t('checkout.noItems')}
                </h2>
                <p className="text-text-muted mb-6">
                    {t('checkout.noItemsHint')}
                </p>
                <Link href={localizedHref('products')} className="btn btn-primary">
                    {t('common.viewProducts')}
                </Link>
            </div>
        )
    }

    return (
        <>
            <div className="container-page py-8">
                <div className="flex items-center gap-3 mb-8">
                    <Link
                        href={localizedHref('cart')}
                        className="p-2 rounded-full hover:bg-surface-1 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold font-display text-text-primary">
                        {t('checkout.finishOrder')}
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Order items */}
                    <div className="space-y-2">
                        <h2 className="text-lg font-bold font-display mb-4">
                            {t('checkout.yourOrder', { count: String(itemCount) })}
                        </h2>
                        {items.map((item) => (
                            <CartItem key={item.id} item={item} />
                        ))}
                    </div>

                    {/* Checkout CTA */}
                    <div className="glass rounded-2xl p-6 h-fit sticky top-24">
                        <h3 className="text-lg font-bold font-display mb-4">
                            {t('checkout.summary')}
                        </h3>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-text-secondary">{t('cart.subtotal')}</span>
                            <span className="font-medium">{formatPrice(total)}</span>
                        </div>
                        {featureFlags.enable_promotions && cart?.id && (
                            <div className="mb-2">
                                <PromotionInput cartId={cart.id} />
                            </div>
                        )}
                        <div className="border-t border-surface-3 mt-4 pt-4">
                            <div className="flex justify-between text-lg font-bold mb-6">
                                <span>{t('cart.total')}</span>
                                <span className="text-primary">{formatPrice(total)}</span>
                            </div>
                            <button
                                onClick={() => setModalOpen(true)}
                                className="btn btn-primary w-full py-3 text-base"
                            >
                                <CreditCard className="w-5 h-5" />
                                {t('checkout.proceedPayment')}
                            </button>
                            <p className="text-xs text-text-muted text-center mt-3">
                                {t('checkout.chooseMethod')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <CheckoutModal
                config={config}
                featureFlags={featureFlags}
                bankDetails={bankDetails}
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
            />
        </>
    )
}
