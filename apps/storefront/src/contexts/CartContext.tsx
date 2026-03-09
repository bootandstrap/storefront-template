'use client'

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useOptimistic,
    type ReactNode,
} from 'react'
import type { MedusaCart, MedusaLineItem } from '@/lib/medusa/client'
import { getPublicMedusaUrl } from '@/lib/medusa/url'

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

interface CartContextValue {
    cart: MedusaCart | null
    cartId: string | null
    itemCount: number
    isLoading: boolean
    drawerOpen: boolean
    openDrawer: () => void
    closeDrawer: () => void
    setCart: (cart: MedusaCart) => void
    setCartId: (id: string) => void
    resetCart: () => void
    optimisticItems: MedusaLineItem[]
    addOptimisticItem: (item: MedusaLineItem) => void
}

const CartContext = createContext<CartContextValue | null>(null)

// SSR-safe: returns no-op defaults when rendered outside CartProvider during
// server-side rendering. CartProvider lives in root layout.tsx, but during
// the initial SSR pass the context value may not have been initialized yet.
const SSR_DEFAULTS: CartContextValue = {
    cart: null,
    cartId: null,
    itemCount: 0,
    isLoading: false,
    drawerOpen: false,
    openDrawer: () => { },
    closeDrawer: () => { },
    setCart: () => { },
    setCartId: () => { },
    resetCart: () => { },
    optimisticItems: [],
    addOptimisticItem: () => { },
}

export function useCart(): CartContextValue {
    const ctx = useContext(CartContext)
    return ctx ?? SSR_DEFAULTS
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const CART_ID_KEY = 'bns-cart-id'

export function CartProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<MedusaCart | null>(null)
    const [cartId, setCartIdState] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [drawerOpen, setDrawerOpen] = useState(false)

    // Optimistic items via React 19
    const [optimisticItems, addOptimisticItem] = useOptimistic(
        cart?.items ?? [],
        (state: MedusaLineItem[], newItem: MedusaLineItem) => [...state, newItem]
    )

    // Load cart ID from localStorage on mount + hydrate cart data
    useEffect(() => {
        async function hydrateCart() {
            const stored = localStorage.getItem(CART_ID_KEY)
            if (!stored) {
                setIsLoading(false)
                return
            }
            setCartIdState(stored)
            try {
                const medusaUrl = getPublicMedusaUrl()
                const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''
                const res = await fetch(`${medusaUrl}/store/carts/${stored}`, {
                    headers: {
                        ...(publishableKey && { 'x-publishable-api-key': publishableKey }),
                    },
                })
                if (res.ok) {
                    const data = await res.json()
                    if (data?.cart) setCart(data.cart)
                }
            } catch {
                // Cart may have expired — clear stale ID
                localStorage.removeItem(CART_ID_KEY)
                setCartIdState(null)
            } finally {
                setIsLoading(false)
            }
        }
        hydrateCart()
    }, [])

    const setCartId = useCallback((id: string) => {
        setCartIdState(id)
        localStorage.setItem(CART_ID_KEY, id)
    }, [])

    const resetCart = useCallback(() => {
        localStorage.removeItem(CART_ID_KEY)
        setCartIdState(null)
        setCart(null)
    }, [])

    const itemCount = optimisticItems.reduce((sum, item) => sum + item.quantity, 0)

    const openDrawer = useCallback(() => setDrawerOpen(true), [])
    const closeDrawer = useCallback(() => setDrawerOpen(false), [])

    return (
        <CartContext.Provider
            value={{
                cart,
                cartId,
                itemCount,
                isLoading,
                drawerOpen,
                openDrawer,
                closeDrawer,
                setCart,
                setCartId,
                resetCart,
                optimisticItems,
                addOptimisticItem,
            }}
        >
            {children}
        </CartContext.Provider>
    )
}
