'use server'

import { cookies } from 'next/headers'

const CURRENCY_COOKIE = 'currency'
const REGION_COOKIE = 'medusa_region_id'

/**
 * Server Action: set currency cookie + sync Medusa region.
 *
 * When the user switches currency, we must also update the region cookie
 * so that `resolveRegionId()` returns the correct region for cart creation
 * and price resolution. Without this, the cart would be created with the
 * old region's currency, causing an incompatible cart error.
 */
export async function setCurrencyCookie(currency: string): Promise<void> {
    const cookieStore = await cookies()
    const code = currency.toLowerCase()

    // 1. Set currency cookie
    cookieStore.set(CURRENCY_COOKIE, code, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax',
    })

    // 2. Find matching Medusa region and sync region cookie
    try {
        const { getRegions } = await import('@/lib/medusa/region')
        const regions = await getRegions()
        const matchedRegion = regions.find(r => r.currency_code === code)
        if (matchedRegion) {
            cookieStore.set(REGION_COOKIE, matchedRegion.id, {
                path: '/',
                maxAge: 60 * 60 * 24 * 365,
                sameSite: 'lax',
            })
        }
    } catch {
        // Region sync is best-effort — cart will self-heal via stale cart recovery
    }
}
