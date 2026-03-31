'use client'

import { useSyncExternalStore, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Consent preferences hook — reads from localStorage
// Allows any component to check cookie consent state (GDPR compliant)
// ---------------------------------------------------------------------------

const CONSENT_KEY = 'bootandstrap_cookie_consent'
const CONSENT_VERSION = 1 // Increment to force re-consent on policy update

export interface ConsentPrefs {
    necessary: boolean   // Always true
    analytics: boolean
    marketing: boolean
}

interface StoredConsent {
    state: 'accepted' | 'rejected' | 'custom'
    prefs: ConsentPrefs
    timestamp: string
    version?: number
}

const DEFAULT_PREFS: ConsentPrefs = {
    necessary: true,
    analytics: false,
    marketing: false,
}

// Singleton for SSR/hydration safety
let _cache: StoredConsent | null = null
let _listeners: Array<() => void> = []

function getSnapshot(): StoredConsent | null {
    if (typeof window === 'undefined') return null
    if (_cache) return _cache
    try {
        const raw = localStorage.getItem(CONSENT_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as StoredConsent
        // If stored version < current, treat as pending (re-consent needed)
        if ((parsed.version || 0) < CONSENT_VERSION) return null
        _cache = parsed
        return _cache
    } catch {
        return null
    }
}

function getServerSnapshot(): StoredConsent | null {
    return null
}

function subscribe(listener: () => void) {
    _listeners.push(listener)
    return () => {
        _listeners = _listeners.filter(l => l !== listener)
    }
}

/**
 * Hook to read current consent preferences.
 * Returns null if user hasn't interacted with the banner yet.
 */
export function useConsentPrefs(): { consent: StoredConsent | null; prefs: ConsentPrefs } {
    const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
    return {
        consent,
        prefs: consent?.prefs || DEFAULT_PREFS,
    }
}

/**
 * Check if a specific category is consented.
 */
export function hasConsent(category: keyof ConsentPrefs): boolean {
    if (category === 'necessary') return true
    const snap = getSnapshot()
    return snap?.prefs?.[category] ?? false
}

/**
 * Invalidate cache (call after consent changes to trigger re-reads).
 */
export function invalidateConsentCache() {
    _cache = null
    _listeners.forEach(l => l())
}

export { CONSENT_KEY, CONSENT_VERSION, DEFAULT_PREFS }
export type { StoredConsent }
