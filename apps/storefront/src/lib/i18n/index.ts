/**
 * i18n — Dictionary-based internationalization system
 *
 * No external dependencies. JSON dictionaries loaded server-side.
 * Route slugs included for localized URLs.
 */

import type { StoreConfig } from '@/lib/config'

// ─── Types ───────────────────────────────────────────────────
export type Locale = 'en' | 'es' | 'de' | 'fr' | 'it'

export type Dictionary = Record<string, string>

export const SUPPORTED_LOCALES: Locale[] = ['en', 'es', 'de', 'fr', 'it']

export const LOCALE_LABELS: Record<Locale, { label: string; flag: string }> = {
    en: { label: 'English', flag: '🇬🇧' },
    es: { label: 'Español', flag: '🇪🇸' },
    de: { label: 'Deutsch', flag: '🇩🇪' },
    fr: { label: 'Français', flag: '🇫🇷' },
    it: { label: 'Italiano', flag: '🇮🇹' },
}

export const DEFAULT_LOCALE: Locale = 'en'

// ─── Dictionary loading ──────────────────────────────────────
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
    en: () => import('./dictionaries/en.json').then((m) => m.default),
    es: () => import('./dictionaries/es.json').then((m) => m.default),
    de: () => import('./dictionaries/de.json').then((m) => m.default),
    fr: () => import('./dictionaries/fr.json').then((m) => m.default),
    it: () => import('./dictionaries/it.json').then((m) => m.default),
}

// In-memory cache for loaded dictionaries
const dictionaryCache = new Map<Locale, Dictionary>()

export async function getDictionary(locale: Locale): Promise<Dictionary> {
    const cached = dictionaryCache.get(locale)
    if (cached) return cached

    try {
        const dict = await dictionaries[locale]()
        dictionaryCache.set(locale, dict)
        return dict
    } catch {
        // Fallback to English if dictionary fails to load
        if (locale !== DEFAULT_LOCALE) {
            return getDictionary(DEFAULT_LOCALE)
        }
        return {}
    }
}

/**
 * Type-safe translation function factory.
 * Returns a function that looks up keys in the dictionary.
 */
export function createTranslator(dictionary: Dictionary) {
    return function t(key: string, replacements?: Record<string, string>): string {
        let value = dictionary[key] ?? key
        if (replacements) {
            for (const [k, v] of Object.entries(replacements)) {
                value = value.replace(`{{${k}}}`, v)
            }
        }
        return value
    }
}

// ─── Locale validation ───────────────────────────────────────
export function isValidLocale(value: string): value is Locale {
    return SUPPORTED_LOCALES.includes(value as Locale)
}

/**
 * Filter supported locales by the active languages configured via Admin Panel.
 */
export function getActiveLocales(config?: StoreConfig | null): Locale[] {
    const active = (config as unknown as Record<string, unknown>)?.active_languages as string[] | undefined
    if (!active || !Array.isArray(active) || active.length === 0) {
        return [DEFAULT_LOCALE]
    }
    return active.filter((l): l is Locale => isValidLocale(l))
}

// ─── Localized route slugs ───────────────────────────────────

/**
 * Canonical route names (file-system paths use these).
 * The actual file structure uses Spanish slugs as canonical.
 */
export const CANONICAL_ROUTES = {
    home: '',
    products: 'productos',
    cart: 'carrito',
    account: 'cuenta',
    orders: 'pedidos',
    profile: 'perfil',
    addresses: 'direcciones',
    login: 'login',
    register: 'registro',
    panel: 'panel',
    order: 'pedido',
    checkout: 'checkout',
} as const

export type RouteName = keyof typeof CANONICAL_ROUTES

/**
 * Get the localized slug for a route in a given locale.
 * Requires dictionary to be loaded.
 */
export function getLocalizedSlug(routeName: RouteName, dictionary: Dictionary): string {
    const key = `routes.${routeName}`
    return dictionary[key] ?? CANONICAL_ROUTES[routeName]
}

/**
 * Build a localized URL path: /{lang}/{localized-slug}/...rest
 */
export function localizedHref(
    locale: Locale,
    routeName: RouteName,
    dictionary: Dictionary,
    ...rest: string[]
): string {
    const slug = getLocalizedSlug(routeName, dictionary)
    const parts = ['', locale, slug, ...rest].filter(Boolean)
    return parts.join('/') || `/${locale}`
}

/**
 * Build a reverse lookup map: localized slug → canonical slug.
 * Used by proxy.ts to rewrite incoming localized URLs to file-system paths.
 */
export function buildReverseSlugMap(dictionary: Dictionary): Map<string, string> {
    const map = new Map<string, string>()
    for (const [routeName, canonicalSlug] of Object.entries(CANONICAL_ROUTES)) {
        const localizedSlug = getLocalizedSlug(routeName as RouteName, dictionary)
        if (localizedSlug !== canonicalSlug && localizedSlug) {
            map.set(localizedSlug, canonicalSlug)
        }
    }
    return map
}
