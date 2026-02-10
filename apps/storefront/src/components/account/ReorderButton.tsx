'use client'

import { useCart } from '@/contexts/CartContext'
import { useI18n } from '@/lib/i18n/provider'
import { ShoppingBag, Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { addToCartAction } from '@/app/[lang]/(shop)/cart/actions'

interface ReorderItem {
    variantId: string
    quantity: number
    title: string
}

export default function ReorderButton({
    items,
    lang: _lang,
}: {
    items: ReorderItem[]
    lang: string
}) {
    const { cartId, setCart, setCartId, openDrawer } = useCart()
    const { t } = useI18n()
    const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

    async function handleReorder() {
        setState('loading')
        try {
            let currentCartId = cartId

            for (const item of items) {
                const result = await addToCartAction(currentCartId, item.variantId, item.quantity)
                if (result.cart) {
                    setCart(result.cart)
                }
                if (result.cartId) {
                    currentCartId = result.cartId
                    setCartId(result.cartId)
                }
            }

            setState('done')
            setTimeout(() => {
                openDrawer()
                setState('idle')
            }, 800)
        } catch {
            setState('idle')
        }
    }

    return (
        <button
            onClick={handleReorder}
            disabled={state === 'loading'}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${state === 'done'
                ? 'bg-green-500/15 text-green-600 border border-green-500/20'
                : 'btn btn-primary'
                }`}
        >
            {state === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
            {state === 'done' && <Check className="w-4 h-4" />}
            {state === 'idle' && <ShoppingBag className="w-4 h-4" />}
            {state === 'done'
                ? t('order.reorderSuccess') || 'Added to cart!'
                : t('order.reorder') || 'Reorder'
            }
        </button>
    )
}
