'use client'

import { useEffect, useTransition } from 'react'
import Link from 'next/link'
import { ShoppingBag, ArrowLeft, MessageCircle, Loader2 } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { getCartAction } from '@/app/[lang]/(shop)/cart/actions'
import { useI18n } from '@/lib/i18n/provider'
import CartItem from '@/components/cart/CartItem'

export default function CarritoPage() {
    const { cart, cartId, setCart, itemCount } = useCart()
    const { t, localizedHref } = useI18n()
    const [isLoading, startTransition] = useTransition()

    useEffect(() => {
        if (cartId && !cart) {
            startTransition(async () => {
                const loaded = await getCartAction(cartId)
                if (loaded) setCart(loaded)
            })
        }
    }, [cartId, cart, setCart])

    const items = cart?.items ?? []
    const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
    const currency = items[0]?.variant?.prices?.[0]?.currency_code || 'USD'

    const formatPrice = (amount: number) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 0,
        }).format(amount / 100)

    return (
        <div className="container-page py-8">
            <div className="flex items-center gap-3 mb-8">
                <Link
                    href={localizedHref('products')}
                    className="p-2 rounded-full hover:bg-surface-1 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold font-display text-text-primary">
                    {t('cart.title')}
                </h1>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-20">
                    <ShoppingBag className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-text-primary mb-2">
                        {t('cart.empty')}
                    </h2>
                    <p className="text-text-muted mb-6">
                        {t('cart.emptyHint')}
                    </p>
                    <Link href={localizedHref('products')} className="btn btn-primary">
                        {t('common.viewProducts')}
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Items */}
                    <div className="lg:col-span-2 space-y-2">
                        {items.map((item) => (
                            <CartItem key={item.id} item={item} />
                        ))}
                    </div>

                    {/* Summary sidebar */}
                    <div className="glass rounded-2xl p-6 h-fit sticky top-24">
                        <h3 className="text-lg font-bold font-display mb-4">
                            {t('cart.summary')}
                        </h3>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-text-secondary">
                                    {t('nav.products')} ({itemCount})
                                </span>
                                <span className="font-medium">{formatPrice(subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-secondary">{t('cart.shipping')}</span>
                                <span className="text-text-muted text-xs">
                                    {t('cart.shippingCalc')}
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-surface-3 mt-4 pt-4">
                            <div className="flex justify-between text-lg font-bold">
                                <span>{t('cart.total')}</span>
                                <span className="text-primary">{formatPrice(subtotal)}</span>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            <Link
                                href={localizedHref('checkout')}
                                className="btn btn-whatsapp w-full text-center"
                            >
                                <MessageCircle className="w-4 h-4" />
                                {t('checkout.whatsapp')}
                            </Link>
                            <Link
                                href={localizedHref('products')}
                                className="btn btn-ghost w-full text-center text-sm"
                            >
                                {t('cart.continueShopping')}
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
