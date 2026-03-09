'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useI18n } from '@/lib/i18n/provider'
import CheckoutModal from '@/components/checkout/CheckoutModal'
import { ShoppingBag, ArrowLeft, CreditCard, Info } from 'lucide-react'
import Link from 'next/link'
import CartItem from '@/components/cart/CartItem'
import FreeShippingBanner from '@/components/cart/FreeShippingBanner'
import PromotionInput from '@/components/checkout/PromotionInput'
import { getEnabledMethods } from '@/lib/payment-methods'
import type { StoreConfig, FeatureFlags, PlanLimits } from '@/lib/config'
import type { CheckoutCountry } from '@/components/checkout/steps/CheckoutAddressStep'

interface CheckoutPageClientProps {
    config: StoreConfig
    featureFlags: FeatureFlags
    planLimits: PlanLimits
    countries?: CheckoutCountry[]
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
    planLimits,
    countries = [],
    bankDetails,
}: CheckoutPageClientProps) {
    const { cart, itemCount, optimisticItems } = useCart()
    const { t, localizedHref, locale } = useI18n()
    const [modalOpen, setModalOpen] = useState(false)
    const [useFallback, setUseFallback] = useState(false)

    // Check if any payment method is enabled
    const hasAnyMethod = getEnabledMethods(featureFlags, planLimits).length > 0

    const items = optimisticItems ?? []
    const currency = items[0]?.variant?.prices?.[0]?.currency_code || 'COP'

    // Local calculation fallback
    const localTotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
    const localSubtotal = localTotal // simplified for fallback

    // Determine if we are waiting for Medusa to sync
    const baseItemCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0
    const isCalculating = itemCount !== baseItemCount

    useEffect(() => {
        if (isCalculating) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUseFallback(false)
            const timer = setTimeout(() => setUseFallback(true), 3000)
            return () => clearTimeout(timer)
        } else {
            setUseFallback(false)
        }
    }, [isCalculating])

    const displaySubtotal = (isCalculating && !useFallback) ? null : (!isCalculating && cart?.subtotal != null ? cart.subtotal : localSubtotal)
    const displayTotal = (isCalculating && !useFallback) ? null : (!isCalculating && cart?.total != null ? cart.total : localTotal)

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
                            <span className="font-medium">
                                {displaySubtotal === null ? (
                                    <div className="h-5 w-16 bg-surface-2 animate-pulse rounded"></div>
                                ) : formatPrice(displaySubtotal)}
                            </span>
                        </div>
                        {featureFlags.enable_promotions && cart?.id && (
                            <div className="mb-2">
                                <PromotionInput cartId={cart.id} />
                            </div>
                        )}
                        {/* Free shipping progress */}
                        {config.free_shipping_threshold > 0 && (
                            <div className="mb-2">
                                <FreeShippingBanner
                                    subtotal={cart?.subtotal ?? localTotal}
                                    threshold={config.free_shipping_threshold}
                                    currency={currency}
                                    locale={locale}
                                    t={t}
                                />
                            </div>
                        )}
                        <div className="border-t border-surface-3 mt-4 pt-4">
                            <div className="flex justify-between text-lg font-bold mb-4">
                                <span>{t('cart.total')}</span>
                                <span className="text-primary flex items-center gap-2">
                                    {displayTotal === null ? (
                                        <div className="h-6 w-24 bg-surface-2 animate-pulse rounded"></div>
                                    ) : (
                                        <>
                                            {formatPrice(displayTotal)}
                                            {useFallback && <span className="text-amber-500 text-sm" title={t('checkout.approximateTotal')}>*</span>}
                                        </>
                                    )}
                                </span>
                            </div>
                            {useFallback && (
                                <div className="flex items-start gap-1.5 mb-4 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <p>{t('checkout.approximateHint')}</p>
                                </div>
                            )}
                            {hasAnyMethod ? (
                                <>
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
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-sm text-text-muted">
                                        {t('checkout.noMethods')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <CheckoutModal
                config={config}
                featureFlags={featureFlags}
                planLimits={planLimits}
                countries={countries}
                bankDetails={bankDetails}
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
            />
        </>
    )
}
