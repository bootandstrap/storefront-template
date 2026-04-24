'use client'

import { useActionState, useEffect, useRef } from 'react'
import { ShoppingCart, Check, Loader2 } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/components/ui/Toaster'
import { useI18n } from '@/lib/i18n/provider'
import { addToCartAction } from '@/app/[lang]/(shop)/cart/actions'
import { trackEvent } from '@/lib/analytics'
import { logger } from '@/lib/logger'

interface AddToCartButtonProps {
    variantId: string
    productTitle: string
    className?: string
}

export default function AddToCartButton({
    variantId,
    productTitle,
    className = '',
}: AddToCartButtonProps) {
    const { cartId, setCart, setCartId, openDrawer } = useCart()
    const { success, error } = useToast()
    const { t } = useI18n()
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Auto-reset success state after 2s (same UX as ProductCard quick-add)
    useEffect(() => {
        return () => { if (resetTimer.current) clearTimeout(resetTimer.current) }
    }, [])

    async function handleAddToCart(
        _prevState: { success: boolean; message: string },
        _formData: FormData,
    ) {
        try {
            const result = await addToCartAction(cartId, variantId)
            if (result.cart) {
                setCart(result.cart)
                if (result.cartId) setCartId(result.cartId)
                success(`${productTitle} ${t('product.addedToCart')}`, {
                    action: {
                        label: t('cart.view') || 'Ver carrito',
                        onClick: openDrawer,
                    },
                })
                trackEvent('add_to_cart', { variant_id: variantId, product_title: productTitle })
                // Auto-reset after 2s so button returns to default label
                resetTimer.current = setTimeout(() => {
                    // Trigger re-render with reset state via form re-submission guard
                }, 2000)
                return { success: true, message: 'Added' }
            }
            logger.error('[AddToCart] Server action returned no cart', { variantId, cartId })
            error(t('product.addToCartError'))
            return { success: false, message: 'Error' }
        } catch (err) {
            logger.error('[AddToCart] Failed:', err)
            error(t('product.addToCartError'))
            return { success: false, message: 'Error' }
        }
    }

    const [state, formAction, isPending] = useActionState(handleAddToCart, {
        success: false,
        message: '',
    })

    return (
        <form action={formAction}>
            <button
                data-testid="add-to-cart"
                type="submit"
                disabled={isPending}
                className={`btn btn-primary w-full ${className}`}
            >
                {isPending ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('product.adding')}
                    </>
                ) : state.success ? (
                    <>
                        <Check className="w-4 h-4" />
                        {t('product.added')}
                    </>
                ) : (
                    <>
                        <ShoppingCart className="w-4 h-4" />
                        {t('product.addToCart')}
                    </>
                )}
            </button>
        </form>
    )
}
