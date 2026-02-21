'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

const STORAGE_KEY = 'bootandstrap_compare'
const MAX_ITEMS = 4

interface CompareContextType {
    items: string[] // Medusa product IDs
    addItem: (productId: string) => void
    removeItem: (productId: string) => void
    isInCompare: (productId: string) => boolean
    clear: () => void
    count: number
}

const CompareContext = createContext<CompareContextType | null>(null)

export function CompareProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<string[]>([])

    // Hydrate from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                if (Array.isArray(parsed)) setItems(parsed.slice(0, MAX_ITEMS))
            }
        } catch { /* ignore */ }
    }, [])

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }, [items])

    const addItem = useCallback((productId: string) => {
        setItems(prev => {
            if (prev.includes(productId) || prev.length >= MAX_ITEMS) return prev
            return [...prev, productId]
        })
    }, [])

    const removeItem = useCallback((productId: string) => {
        setItems(prev => prev.filter(id => id !== productId))
    }, [])

    const isInCompare = useCallback((productId: string) => {
        return items.includes(productId)
    }, [items])

    const clear = useCallback(() => {
        setItems([])
    }, [])

    return (
        <CompareContext.Provider value={{ items, addItem, removeItem, isInCompare, clear, count: items.length }}>
            {children}
        </CompareContext.Provider>
    )
}

export function useCompare() {
    const ctx = useContext(CompareContext)
    if (!ctx) throw new Error('useCompare must be used within CompareProvider')
    return ctx
}
