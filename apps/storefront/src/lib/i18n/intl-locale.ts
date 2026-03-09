/**
 * Intl locale mapping utility.
 *
 * Our app uses short locale codes (es, en, de, fr, it) but the Intl API
 * requires full BCP 47 locale identifiers (es-ES, en-US, etc.) for proper
 * formatting of dates, prices, and numbers.
 *
 * This replaces 4+ ad-hoc patterns scattered across components.
 *
 * @module intl-locale
 * @zone 🟢 CUSTOMIZE — utility, no platform dependency
 */

const LOCALE_MAP: Record<string, string> = {
    es: 'es-ES',
    en: 'en-US',
    de: 'de-DE',
    fr: 'fr-FR',
    it: 'it-IT',
}

/**
 * Convert a short locale code to a full Intl locale identifier.
 *
 * @example toIntlLocale('es') → 'es-ES'
 * @example toIntlLocale('en') → 'en-US'
 */
export function toIntlLocale(lang: string): string {
    return LOCALE_MAP[lang] ?? lang
}
