'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Wishlist Context — localStorage-based (no DB requirement for MVP)
// ---------------------------------------------------------------------------

interface WishlistContextValue {
    items: string[]
    addItem: (productId: string) => void
    removeItem: (productId: string) => void
    toggleItem: (productId: string) => void
    isInWishlist: (productId: string) => boolean
    count: number
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

const STORAGE_KEY = 'bootandstrap_wishlist'

function loadWishlist(): string[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function saveWishlist(items: string[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
        // Storage full or blocked — degrade silently
    }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
    // Lazy initializer — loads from localStorage on first render (SSR-safe: loadWishlist returns [])
    const [items, setItems] = useState<string[]>(() => loadWishlist())

    const addItem = useCallback((productId: string) => {
        setItems(prev => {
            if (prev.includes(productId)) return prev
            const next = [...prev, productId]
            saveWishlist(next)
            return next
        })
    }, [])

    const removeItem = useCallback((productId: string) => {
        setItems(prev => {
            const next = prev.filter(id => id !== productId)
            saveWishlist(next)
            return next
        })
    }, [])

    const toggleItem = useCallback((productId: string) => {
        setItems(prev => {
            const next = prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
            saveWishlist(next)
            return next
        })
    }, [])

    const isInWishlist = useCallback((productId: string) => {
        return items.includes(productId)
    }, [items])

    return (
        <WishlistContext.Provider value={{
            items,
            addItem,
            removeItem,
            toggleItem,
            isInWishlist,
            count: items.length,
        }}>
            {children}
        </WishlistContext.Provider>
    )
}

export function useWishlist() {
    const ctx = useContext(WishlistContext)
    if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
    return ctx
}
