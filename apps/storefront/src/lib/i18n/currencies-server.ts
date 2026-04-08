import { cookies } from 'next/headers'
import { DEFAULT_CURRENCY, isValidCurrency, CURRENCY_COOKIE } from './currencies'

export async function getCurrency(defaultCurrency?: string): Promise<string> {
    // 1. Cookie (server-only)
    try {
        const cookieStore = await cookies()
        const cookieCurrency = cookieStore.get(CURRENCY_COOKIE)?.value
        if (cookieCurrency && isValidCurrency(cookieCurrency)) {
            return cookieCurrency
        }
    } catch {
        // Not in server context — skip cookie resolution
    }

    // 2. Config default
    if (defaultCurrency && isValidCurrency(defaultCurrency)) {
        return defaultCurrency
    }

    // 3. Fallback
    return DEFAULT_CURRENCY
}
