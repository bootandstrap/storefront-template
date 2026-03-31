'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Minus, Plus, Trash2, Loader2, Package } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/components/ui/Toaster'
import { useI18n } from '@/lib/i18n/provider'
import { updateCartItemAction, removeFromCartAction } from '@/app/[lang]/(shop)/cart/actions'
import type { MedusaLineItem } from '@/lib/medusa/client'

interface CartItemProps {
    item: MedusaLineItem
    /** Currency code from parent (tenant config) — variant.prices is often empty in Medusa v2 cart */
    currencyCode?: string
}

export default function CartItem({ item, currencyCode }: CartItemProps) {
    const { cartId, setCart } = useCart()
    const { error: showError, success: showSuccess } = useToast()
    const { t, locale } = useI18n()
    const [isPending, startTransition] = useTransition()
    const [pendingAction, setPendingAction] = useState<'inc' | 'dec' | 'remove' | null>(null)

    const unitPrice = item.unit_price / 100
    const total = (item.unit_price * item.quantity) / 100
    // Use parent-provided currency first, then try variant prices, final fallback 'eur'
    const currency = currencyCode || item.variant?.prices?.[0]?.currency_code || 'eur'

    function formatPrice(amount: number) {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 0,
        }).format(amount)
    }

    async function handleUpdate(newQuantity: number, action: 'inc' | 'dec') {
        if (!cartId) return
        setPendingAction(action)
        startTransition(async () => {
            const cart = await updateCartItemAction(cartId, item.id, newQuantity)
            if (cart) {
                setCart(cart)
            } else {
                showError(t('cart.drawer.updateError'))
            }
            setPendingAction(null)
        })
    }

    async function handleRemove() {
        if (!cartId) return
        setPendingAction('remove')

        // Capture item details for potential undo
        const removedTitle = item.title
        const removedQuantity = item.quantity

        startTransition(async () => {
            const updatedCart = await removeFromCartAction(cartId, item.id)
            if (updatedCart) {
                setCart(updatedCart)
                // Show undo toast
                showSuccess(
                    `${removedTitle} ${t('cart.drawer.removed') || 'removed'}`,
                    {
                        duration: 5000,
                        action: {
                            label: t('common.undo') || 'Undo',
                            onClick: async () => {
                                // Re-add the item via addToCart action
                                try {
                                    const { addToCartAction } = await import('@/app/[lang]/(shop)/cart/actions')
                                    const result = await addToCartAction(
                                        cartId,
                                        item.variant.id,
                                        removedQuantity
                                    )
                                    if (result.cart) setCart(result.cart)
                                } catch {
                                    showError(t('cart.drawer.undoError') || 'Could not restore item')
                                }
                            },
                        },
                    }
                )
            } else {
                showError(t('cart.drawer.removeError'))
            }
            setPendingAction(null)
        })
    }

    return (
        <div className={`flex gap-3 p-3 rounded-xl transition-opacity ${isPending ? 'opacity-60' : ''}`}>
            {/* Image */}
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-sf-1 shrink-0">
                {item.thumbnail ? (
                    <Image
                        src={item.thumbnail}
                        alt={item.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                    />
                ) : (
                    <div className="image-fallback w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-tx-muted" strokeWidth={1.5} />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-tx line-clamp-1">
                    {item.title}
                </h4>
                <p className="text-xs text-tx-muted">{formatPrice(unitPrice)}</p>

                {/* Quantity controls */}
                <div className="flex items-center gap-2 mt-2">
                    <button
                        onClick={() => {
                            if (item.quantity <= 1) handleRemove()
                            else handleUpdate(item.quantity - 1, 'dec')
                        }}
                        disabled={isPending}
                        className="w-9 h-9 rounded-lg border border-sf-3 flex items-center justify-center hover:bg-sf-1 transition-colors text-tx-sec touch-target"
                    >
                        {pendingAction === 'dec' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Minus className="w-3 h-3" />
                        )}
                    </button>
                    <span key={item.quantity} className="text-sm font-medium w-6 text-center animate-count-bump">{item.quantity}</span>
                    <button
                        onClick={() => handleUpdate(item.quantity + 1, 'inc')}
                        disabled={isPending}
                        className="w-9 h-9 rounded-lg border border-sf-3 flex items-center justify-center hover:bg-sf-1 transition-colors text-tx-sec touch-target"
                    >
                        {pendingAction === 'inc' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Plus className="w-3 h-3" />
                        )}
                    </button>
                </div>
            </div>

            {/* Price + remove */}
            <div className="flex flex-col items-end justify-between">
                <p className="text-sm font-bold text-brand">
                    {formatPrice(total)}
                </p>
                <button
                    onClick={handleRemove}
                    disabled={isPending}
                    className="p-1 text-tx-muted hover:text-red-500 transition-colors"
                    aria-label={t('cart.drawer.removeLabel')}
                >
                    {pendingAction === 'remove' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Trash2 className="w-4 h-4" />
                    )}
                </button>
            </div>
        </div>
    )
}
