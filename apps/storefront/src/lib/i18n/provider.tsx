'use client'

/**
 * I18n Context Provider — makes dictionary + locale available to client components.
 *
 * Usage:
 *   Server: <I18nProvider locale="en" dictionary={dict}>{children}</I18nProvider>
 *   Client: const { t, locale, dictionary } = useI18n()
 */

import { createContext, useContext, useCallback, type ReactNode } from 'react'
import type { Locale, Dictionary } from '.'
import { CANONICAL_ROUTES, type RouteName } from '.'

interface I18nContextValue {
    locale: Locale
    dictionary: Dictionary
    t: (key: string, replacements?: Record<string, string>) => string
    localizedHref: (routeName: RouteName, ...rest: string[]) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

interface I18nProviderProps {
    locale: Locale
    dictionary: Dictionary
    children: ReactNode
}

export function I18nProvider({ locale, dictionary, children }: I18nProviderProps) {
    const t = useCallback(
        (key: string, replacements?: Record<string, string>) => {
            let value = dictionary[key] ?? key
            if (replacements) {
                for (const [k, v] of Object.entries(replacements)) {
                    value = value.replace(`{{${k}}}`, v)
                }
            }
            return value
        },
        [dictionary]
    )

    const localizedHref = useCallback(
        (routeName: RouteName, ...rest: string[]) => {
            const slug = dictionary[`routes.${routeName}`] ?? CANONICAL_ROUTES[routeName]
            const parts = ['', locale, slug, ...rest].filter(Boolean)
            return parts.join('/') || `/${locale}`
        },
        [locale, dictionary]
    )

    return (
        <I18nContext.Provider value={{ locale, dictionary, t, localizedHref }}>
            {children}
        </I18nContext.Provider>
    )
}

export function useI18n(): I18nContextValue {
    const ctx = useContext(I18nContext)
    if (!ctx) {
        throw new Error('useI18n must be used within an I18nProvider')
    }
    return ctx
}
