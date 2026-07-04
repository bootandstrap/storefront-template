'use client'

import { useSyncExternalStore } from 'react'

function subscribeToStorage(callback: () => void) {
    if (typeof window === 'undefined') {
        return () => {}
    }

    const handleStorage = () => callback()
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
}

function subscribeToHydration() {
    return () => {}
}

function readLocalStorageFlag(key: string, expectedValue: string) {
    if (typeof window === 'undefined') {
        return false
    }

    try {
        return window.localStorage.getItem(key) === expectedValue
    } catch {
        return false
    }
}

export function useHydrated() {
    return useSyncExternalStore(subscribeToHydration, () => true, () => false)
}

export function useLocalStorageFlag(key: string, expectedValue = '1') {
    return useSyncExternalStore(
        subscribeToStorage,
        () => readLocalStorageFlag(key, expectedValue),
        () => false,
    )
}
