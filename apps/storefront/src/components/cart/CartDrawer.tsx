'use client'

import { useEffect, useTransition } from 'react'
import Link from 'next/link'
import { X, ShoppingBag, MessageCircle, Loader2 } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useI18n } from '@/lib/i18n/provider'
import { getCartAction } from '@/app/[lang]/(shop)/cart/actions'
import CartItem from './CartItem'

export default function CartDrawer() {
    const { cart, cartId, drawerOpen, closeDrawer, setCart, itemCount } = useCart()
    const { t, locale, localizedHref } = useI18n()
    const [isLoading, startTransition] = useTransition()

    // Load cart data when drawer opens
    useEffect(() => {
        if (drawerOpen && cartId && !cart) {
            startTransition(async () => {
                const loaded = await getCartAction(cartId)
                if (loaded) setCart(loaded)
            })
        }
    }, [drawerOpen, cartId, cart, setCart])

    // Lock body scroll when open
    useEffect(() => {
        if (drawerOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [drawerOpen])

    if (!drawerOpen) return null

    const items = cart?.items ?? []
    const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
    const currency = items[0]?.variant?.prices?.[0]?.currency_code || 'COP'

    const formattedSubtotal = new Intl.NumberFormat(locale === 'es' ? 'es-CO' : locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 0,
    }).format(subtotal / 100)

    return (
        <div data-testid="cart-drawer" className="fixed inset-0 z-50 animate-fade-in">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={closeDrawer}
            />

            {/* Drawer */}
            <div className="absolute top-0 right-0 h-full w-full max-w-md bg-surface-0 shadow-2xl flex flex-col animate-slide-right">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-surface-3">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold font-display">
                            {t('cart.title')} ({itemCount})
                        </h2>
                    </div>
                    <button
                        onClick={closeDrawer}
                        className="p-2 rounded-full hover:bg-surface-1 transition-colors"
                        aria-label={t('common.close')}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <p className="text-4xl mb-4">🛒</p>
                            <h3 className="text-lg font-semibold text-text-primary mb-2">
                                {t('cart.empty')}
                            </h3>
                            <p className="text-sm text-text-muted mb-6">
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
                        items.map((item) => <CartItem key={item.id} item={item} />)
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="border-t border-surface-3 p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">{t('cart.subtotal')}</span>
                            <span className="font-bold text-text-primary">{formattedSubtotal}</span>
                        </div>
                        <Link
                            href={localizedHref('cart')}
                            onClick={closeDrawer}
                            className="btn btn-primary w-full text-center"
                        >
                            {t('cart.drawer.viewFullCart')}
                        </Link>
                        <Link
                            href={localizedHref('checkout')}
                            onClick={closeDrawer}
                            className="btn btn-whatsapp w-full text-center"
                        >
                            <MessageCircle className="w-4 h-4" />
                            {t('cart.drawer.orderWhatsApp')}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
