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
    optimisticItems: MedusaLineItem[]
    addOptimisticItem: (item: MedusaLineItem) => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function useCart(): CartContextValue {
    const ctx = useContext(CartContext)
    if (!ctx) throw new Error('useCart must be used within <CartProvider>')
    return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const CART_ID_KEY = 'campifrut-cart-id'

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

    // Load cart ID from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(CART_ID_KEY)
        if (stored) {
            setCartIdState(stored)
        }
        setIsLoading(false)
    }, [])

    const setCartId = useCallback((id: string) => {
        setCartIdState(id)
        localStorage.setItem(CART_ID_KEY, id)
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
                optimisticItems,
                addOptimisticItem,
            }}
        >
            {children}
        </CartContext.Provider>
    )
}
