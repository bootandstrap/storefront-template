'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, ShoppingBag, MessageCircle, CreditCard, Loader2, RefreshCw } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useI18n } from '@/lib/i18n/provider'
import { getEnabledMethods } from '@/lib/payment-methods'
import { formatPrice as formatCurrency } from '@/lib/i18n/currencies'
import CartItem from './CartItem'
import FreeShippingBanner from './FreeShippingBanner'
import type { StoreConfig, FeatureFlags, PlanLimits } from '@/lib/config'

interface CartDrawerProps {
    config: StoreConfig
    featureFlags: FeatureFlags
    planLimits: PlanLimits
}

export default function CartDrawer({ config, featureFlags, planLimits }: CartDrawerProps) {
    const {
        cart,
        drawerOpen,
        closeDrawer,
        itemCount,
        isLoading: isHydrating,
        hydrationError,
        retryHydration,
    } = useCart()
    const { t, locale, localizedHref } = useI18n()
    const router = useRouter()

    // Compute which payment methods are available based on feature flags
    const enabledMethods = getEnabledMethods(featureFlags, planLimits)
    const hasWhatsAppCheckout = enabledMethods.some(m => m.id === 'whatsapp')
    const hasAnyCheckoutMethod = enabledMethods.length > 0

    // Lock body scroll when open
    useEffect(() => {
        if (drawerOpen) {
            document.body.style.overflow = 'hidden'
            document.body.classList.add('drawer-open')
        } else {
            document.body.style.overflow = ''
            document.body.classList.remove('drawer-open')
        }
        return () => {
            document.body.style.overflow = ''
            document.body.classList.remove('drawer-open')
        }
    }, [drawerOpen])

    if (!drawerOpen) return null

    const items = cart?.items ?? []
    const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
    // Use tenant config currency first — variant.prices is often empty in Medusa v2 cart responses
    const currency = config.default_currency || items[0]?.variant?.prices?.[0]?.currency_code || 'EUR'

    const formattedSubtotal = formatCurrency(subtotal, currency, locale)

    function navigateFromDrawer(href: string) {
        router.push(href)
        closeDrawer()
    }

    return (
        <div data-testid="cart-drawer" className="fixed inset-0 z-[80] animate-fade-in" role="dialog" aria-modal="true" aria-label={t('cart.title')}>
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={closeDrawer}
            />

            {/* Drawer */}
            <div className="absolute top-0 right-0 h-full w-full max-w-md bg-sf-0 shadow-2xl flex flex-col animate-slide-right">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-sf-3">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-brand" />
                        <h2 className="text-lg font-bold font-display">
                            {t('cart.title')} (<span aria-live="polite">{itemCount}</span>)
                        </h2>
                    </div>
                    <button
                        onClick={closeDrawer}
                        className="p-2 rounded-full hover:bg-sf-1 transition-colors"
                        aria-label={t('common.close')}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {isHydrating ? (
                        <div
                            data-testid="cart-drawer-hydration-loading"
                            className="flex items-center justify-center py-12"
                            role="status"
                            aria-live="polite"
                        >
                            <Loader2 className="w-6 h-6 animate-spin text-brand" aria-hidden="true" />
                            <span className="sr-only">{t('common.loading')}</span>
                        </div>
                    ) : hydrationError ? (
                        <div
                            data-testid="cart-drawer-hydration-error"
                            className="flex flex-col items-center justify-center rounded-xl border border-error-200 bg-error-primary px-5 py-10 text-center"
                            role="alert"
                        >
                            <ShoppingBag className="w-10 h-10 text-error-primary mb-4" aria-hidden="true" />
                            <h3 className="text-lg font-semibold text-tx mb-2">
                                {t('common.error')}
                            </h3>
                            <p className="text-sm text-tx-sec mb-6">
                                {t('cart.hydrationError')}
                            </p>
                            <button
                                type="button"
                                data-testid="cart-drawer-hydration-retry"
                                onClick={retryHydration}
                                className="btn btn-primary text-sm"
                            >
                                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                                {t('common.retry')}
                            </button>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <ShoppingBag className="w-10 h-10 text-tx-muted mb-4" strokeWidth={1.5} />
                            <h3 className="text-lg font-semibold text-tx mb-2">
                                {t('cart.empty')}
                            </h3>
                            <p className="text-sm text-tx-muted mb-6">
                                {t('cart.emptyHint')}
                            </p>
                            <button
                                onClick={closeDrawer}
                                className="btn btn-primary text-sm"
                            >
                                {t('common.viewProducts')}
                            </button>
                        </div>
                    ) : (
                        items.map((item) => <CartItem key={item.id} item={item} currencyCode={currency} />)
                    )}
                </div>

                {/* Footer — flag-gated buttons */}
                {items.length > 0 && (
                    <div className="border-t border-sf-3 p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-tx-sec">{t('cart.subtotal')}</span>
                            <span className="font-bold text-tx">{formattedSubtotal}</span>
                        </div>

                        {/* Free shipping progress */}
                        <FreeShippingBanner
                            subtotal={subtotal}
                            threshold={config.free_shipping_threshold}
                            currency={currency}
                            locale={locale}
                            t={t}
                        />

                        {/* Checkout button — only if at least one payment method is enabled */}
                        {hasAnyCheckoutMethod && (
                            <div className="space-y-2">
                                <button
                                    onClick={() => navigateFromDrawer(localizedHref('cart'))}
                                    className="btn btn-secondary w-full text-center"
                                    type="button"
                                >
                                    <ShoppingBag className="w-4 h-4" />
                                    {t('cart.drawer.viewFullCart')}
                                </button>
                                <button
                                    onClick={() => navigateFromDrawer(localizedHref('checkout'))}
                                    className="btn btn-primary w-full text-center"
                                    type="button"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    {t('cart.checkout')}
                                </button>
                            </div>
                        )}

                        {/* WhatsApp order button — only when enable_whatsapp_checkout flag is ON */}
                        {hasWhatsAppCheckout && config.whatsapp_number && (
                            <button
                                onClick={() => navigateFromDrawer(localizedHref('checkout'))}
                                className="btn btn-whatsapp w-full text-center"
                                type="button"
                            >
                                <MessageCircle className="w-4 h-4" />
                                {t('cart.drawer.orderWhatsApp')}
                            </button>
                        )}

                        {/* If no methods at all, show View Cart only */}
                        {!hasAnyCheckoutMethod && (
                            <button
                                onClick={() => navigateFromDrawer(localizedHref('cart'))}
                                className="btn btn-primary w-full text-center"
                                type="button"
                            >
                                {t('cart.drawer.viewFullCart')}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
