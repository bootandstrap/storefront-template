/**
 * RTL (Right-to-Left) support utilities.
 * Preparation for future Arabic/Hebrew locales.
 */

// List of RTL locales
const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur'])

/**
 * Check if a locale uses right-to-left text direction.
 */
export function isRtlLocale(locale: string): boolean {
    return RTL_LOCALES.has(locale)
}

/**
 * Get the `dir` attribute value for a given locale.
 */
export function getDirection(locale: string): 'ltr' | 'rtl' {
    return isRtlLocale(locale) ? 'rtl' : 'ltr'
}
