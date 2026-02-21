'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Wishlist Context — Supabase-backed with localStorage fallback for guests
// ---------------------------------------------------------------------------

interface WishlistContextValue {
    items: string[]
    addItem: (productId: string) => void
    removeItem: (productId: string) => void
    toggleItem: (productId: string) => void
    isInWishlist: (productId: string) => boolean
    count: number
    isLoading: boolean
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

const STORAGE_KEY = 'bootandstrap_wishlist'

function loadLocalWishlist(): string[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function saveLocalWishlist(items: string[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
        // Storage full or blocked — degrade silently
    }
}

export function WishlistProvider({
    children,
    isAuthenticated = false,
}: {
    children: ReactNode
    isAuthenticated?: boolean
}) {
    const [items, setItems] = useState<string[]>(() => loadLocalWishlist())
    const [isLoading, setIsLoading] = useState(false)
    const [synced, setSynced] = useState(false)

    // ── Sync from Supabase on mount for authenticated users ────────
    useEffect(() => {
        if (!isAuthenticated || synced) return

        setIsLoading(true)
        fetch('/api/wishlist')
            .then(res => res.json())
            .then(data => {
                if (data.items?.length) {
                    setItems(data.items)
                    saveLocalWishlist(data.items)
                }
                setSynced(true)

                // Merge any localStorage items that weren't in Supabase
                const localItems = loadLocalWishlist()
                const serverSet = new Set(data.items || [])
                const toSync = localItems.filter(id => !serverSet.has(id))
                if (toSync.length > 0) {
                    Promise.all(
                        toSync.map(productId =>
                            fetch('/api/wishlist', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ productId }),
                            })
                        )
                    ).then(() => {
                        const merged = [...new Set([...(data.items || []), ...localItems])]
                        setItems(merged)
                        saveLocalWishlist(merged)
                    })
                }
            })
            .catch(() => {
                // Degrade to localStorage
                setSynced(true)
            })
            .finally(() => setIsLoading(false))
    }, [isAuthenticated, synced])

    const addItem = useCallback((productId: string) => {
        setItems(prev => {
            if (prev.includes(productId)) return prev
            const next = [...prev, productId]
            saveLocalWishlist(next)
            return next
        })

        // Persist to Supabase if authenticated
        if (isAuthenticated) {
            fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId }),
            }).catch(() => { /* localStorage is fallback */ })
        }
    }, [isAuthenticated])

    const removeItem = useCallback((productId: string) => {
        setItems(prev => {
            const next = prev.filter(id => id !== productId)
            saveLocalWishlist(next)
            return next
        })

        // Remove from Supabase if authenticated
        if (isAuthenticated) {
            fetch('/api/wishlist', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId }),
            }).catch(() => { /* localStorage is fallback */ })
        }
    }, [isAuthenticated])

    const toggleItem = useCallback((productId: string) => {
        setItems(prev => {
            const isAdding = !prev.includes(productId)
            const next = isAdding
                ? [...prev, productId]
                : prev.filter(id => id !== productId)
            saveLocalWishlist(next)

            // Sync with Supabase
            if (isAuthenticated) {
                fetch('/api/wishlist', {
                    method: isAdding ? 'POST' : 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId }),
                }).catch(() => { })
            }

            return next
        })
    }, [isAuthenticated])

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
            isLoading,
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
