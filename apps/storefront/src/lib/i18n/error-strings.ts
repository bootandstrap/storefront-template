/**
 * Lightweight error page i18n fallback.
 * Error pages are 'use client' and can't access getDictionary() server-side.
 * This provides basic error strings in all supported locales.
 */

export type ErrorLocale = 'en' | 'es' | 'de' | 'fr' | 'it'

const ERROR_STRINGS: Record<ErrorLocale, {
    title: string
    description: string
    retry: string
}> = {
    en: {
        title: 'Something went wrong',
        description: 'An unexpected error occurred. Please try again.',
        retry: 'Retry',
    },
    es: {
        title: 'Algo salió mal',
        description: 'Hubo un error inesperado. Por favor intenta de nuevo.',
        retry: 'Reintentar',
    },
    de: {
        title: 'Etwas ist schiefgelaufen',
        description: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
        retry: 'Erneut versuchen',
    },
    fr: {
        title: 'Une erreur est survenue',
        description: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
        retry: 'Réessayer',
    },
    it: {
        title: 'Qualcosa è andato storto',
        description: 'Si è verificato un errore imprevisto. Per favore riprova.',
        retry: 'Riprova',
    },
}

/**
 * Get error strings for a given locale, falling back to English.
 */
export function getErrorStrings(locale?: string) {
    const key = (locale || 'en') as ErrorLocale
    return ERROR_STRINGS[key] ?? ERROR_STRINGS.en
}
