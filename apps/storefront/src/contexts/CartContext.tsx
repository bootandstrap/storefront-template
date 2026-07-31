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
import { getCartAction } from '@/app/[lang]/(shop)/cart/actions'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

interface CartContextValue {
    cart: MedusaCart | null
    cartId: string | null
    itemCount: number
    isLoading: boolean
    hydrationError: boolean
    drawerOpen: boolean
    openDrawer: () => void
    closeDrawer: () => void
    setCart: (cart: MedusaCart) => void
    setCartId: (id: string) => void
    resetCart: () => void
    retryHydration: () => void
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
    hydrationError: false,
    drawerOpen: false,
    openDrawer: () => { },
    closeDrawer: () => { },
    setCart: () => { },
    setCartId: () => { },
    resetCart: () => { },
    retryHydration: () => { },
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
    const [cart, setCartState] = useState<MedusaCart | null>(null)
    const [cartId, setCartIdState] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [hydrationError, setHydrationError] = useState(false)
    const [drawerOpen, setDrawerOpen] = useState(false)

    // Optimistic items via React 19
    const [optimisticItems, addOptimisticItem] = useOptimistic(
        cart?.items ?? [],
        (state: MedusaLineItem[], newItem: MedusaLineItem) => [...state, newItem]
    )

    const setCart = useCallback((nextCart: MedusaCart) => {
        setCartState(nextCart)
        setHydrationError(false)
        setIsLoading(false)
    }, [])

    const hydrateCart = useCallback(async (stored: string) => {
        setIsLoading(true)
        setHydrationError(false)
        try {
            const loaded = await getCartAction(stored)
            if (loaded) {
                setCart(loaded)
            } else {
                setHydrationError(true)
            }
        } catch (err) {
            logger.warn('[CartContext] Cart retrieval unavailable:', err)
            setHydrationError(true)
        } finally {
            setIsLoading(false)
        }
    }, [setCart])

    // Load cart ID from localStorage on mount + hydrate cart data
    useEffect(() => {
        const stored = localStorage.getItem(CART_ID_KEY)
        if (!stored) {
            setIsLoading(false)
            return
        }
        setCartIdState(stored)
        void hydrateCart(stored)
    }, [hydrateCart])

    const setCartId = useCallback((id: string) => {
        setCartIdState(id)
        localStorage.setItem(CART_ID_KEY, id)
    }, [])

    const resetCart = useCallback(() => {
        localStorage.removeItem(CART_ID_KEY)
        setCartIdState(null)
        setCartState(null)
        setHydrationError(false)
        setIsLoading(false)
    }, [])

    const retryHydration = useCallback(() => {
        if (cartId) void hydrateCart(cartId)
    }, [cartId, hydrateCart])

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
                hydrationError,
                drawerOpen,
                openDrawer,
                closeDrawer,
                setCart,
                setCartId,
                resetCart,
                retryHydration,
                optimisticItems,
                addOptimisticItem,
            }}
        >
            {children}
        </CartContext.Provider>
    )
}
