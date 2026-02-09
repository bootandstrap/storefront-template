'use server'

import { cookies } from 'next/headers'

const CURRENCY_COOKIE = 'currency'

/**
 * Server Action: set currency cookie.
 */
export async function setCurrencyCookie(currency: string): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.set(CURRENCY_COOKIE, currency.toLowerCase(), {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax',
    })
}
