/**
 * Locale resolution — determines which locale to use for the current request.
 *
 * Resolution order:
 * 1. [lang] param from URL (primary — this is a dynamic route segment)
 * 2. `locale` cookie (for redirecting bare URLs)
 * 3. Accept-Language header (browser detection)
 * 4. config.language from Supabase (Admin Panel setting)
 * 5. Fallback: 'en'
 */

import { cookies, headers } from 'next/headers'
import { type Locale, DEFAULT_LOCALE, isValidLocale, SUPPORTED_LOCALES } from '.'

const LOCALE_COOKIE = 'locale'

/**
 * Get the preferred locale from cookie or browser.
 * Used when no [lang] segment is present (redirecting root /).
 */
export async function getPreferredLocale(configLanguage?: string): Promise<Locale> {
    // 1. Cookie
    const cookieStore = await cookies()
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value
    if (cookieLocale && isValidLocale(cookieLocale)) {
        return cookieLocale
    }

    // 2. Accept-Language header
    const headerStore = await headers()
    const acceptLang = headerStore.get('accept-language')
    if (acceptLang) {
        const preferred = parseAcceptLanguage(acceptLang)
        if (preferred) return preferred
    }

    // 3. Config language (from Admin Panel)
    if (configLanguage && isValidLocale(configLanguage)) {
        return configLanguage
    }

    // 4. Final fallback
    return DEFAULT_LOCALE
}

/**
 * Validate and return a locale from URL param.
 * Returns null if invalid, so caller can redirect.
 */
export function validateLocaleParam(lang: string): Locale | null {
    if (isValidLocale(lang)) return lang
    return null
}

/**
 * Parse Accept-Language header and return first matching supported locale.
 */
function parseAcceptLanguage(header: string): Locale | null {
    const languages = header
        .split(',')
        .map((part) => {
            const [lang, qPart] = part.trim().split(';')
            const q = qPart ? parseFloat(qPart.split('=')[1]) : 1
            return { lang: lang.trim().toLowerCase(), q }
        })
        .sort((a, b) => b.q - a.q)

    for (const { lang } of languages) {
        // Try exact match first (e.g., 'de')
        const twoChar = lang.substring(0, 2) as Locale
        if (SUPPORTED_LOCALES.includes(twoChar)) {
            return twoChar
        }
    }
    return null
}

/**
 * Server Action: set locale cookie and revalidate.
 */
export async function setLocaleCookie(locale: Locale): Promise<void> {
    'use server'
    const cookieStore = await cookies()
    cookieStore.set(LOCALE_COOKIE, locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax',
    })
}
