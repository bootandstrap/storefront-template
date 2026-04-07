/**
 * Region resolution pipeline for Medusa v2 pricing context.
 *
 * Medusa v2 requires `region_id` to compute `calculated_price` for product
 * variants. Without it, all prices return null.
 *
 * Resolution order (first non-null wins):
 * 1. Explicit region_id parameter (passed by caller)
 * 2. Cookie `medusa_region_id` (user selected via currency switcher)
 * 3. Tenant config `default_region_id` (set during setupMedusaInstance)
 * 4. First available region from Medusa Store API (fallback)
 *
 * Integration with provisioning:
 * - setupMedusaInstance() creates a default region during tenant deploy
 * - Storefront resolves region automatically on first request
 * - Result is cached server-side (5min TTL, same as config)
 *
 * @module region
 * @locked 🔴 LOCKED — platform infrastructure
 */

import { cookies } from 'next/headers'

const MEDUSA_BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''

const REGION_COOKIE = 'medusa_region_id'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MedusaRegion {
    id: string
    name: string
    currency_code: string
    countries: { iso_2: string; display_name: string }[]
}

// ---------------------------------------------------------------------------
// Region cache (5min TTL — server-side only)
// ---------------------------------------------------------------------------

let cachedRegions: MedusaRegion[] | null = null
let cacheExpiry = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function fetchRegions(): Promise<MedusaRegion[]> {
    const now = Date.now()
    if (cachedRegions && now < cacheExpiry) return cachedRegions

    try {
        const res = await fetch(`${MEDUSA_BACKEND_URL}/store/regions`, {
            headers: {
                'Content-Type': 'application/json',
                ...(PUBLISHABLE_KEY && { 'x-publishable-api-key': PUBLISHABLE_KEY }),
            },
            next: { revalidate: 300 }, // Next.js cache: 5min
        })
        if (!res.ok) {
            console.warn(`[region] Failed to fetch regions: ${res.status}`)
            return cachedRegions ?? []
        }
        const data = await res.json() as { regions: MedusaRegion[] }
        cachedRegions = data.regions ?? []
        cacheExpiry = now + CACHE_TTL
        return cachedRegions
    } catch (err) {
        console.warn('[region] Region fetch error:', err)
        return cachedRegions ?? []
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get all available regions from Medusa Store API (cached).
 */
export async function getRegions(): Promise<MedusaRegion[]> {
    return fetchRegions()
}

/**
 * Resolve the region_id for Medusa Store API calls.
 *
 * Pipeline:
 * 1. Cookie → 2. Config currency → region match → 3. First region fallback
 *
 * Returns null if no regions are available (Medusa not configured).
 */
export async function resolveRegionId(): Promise<string | null> {
    // 1. Check cookie (user explicitly selected)
    try {
        const cookieStore = await cookies()
        const regionCookie = cookieStore.get(REGION_COOKIE)
        if (regionCookie?.value) return regionCookie.value
    } catch {
        // cookies() not available in non-request context (e.g., generateStaticParams)
    }

    // 2. Match config.default_currency → Medusa region
    const regions = await fetchRegions()
    if (regions.length === 0) return null

    try {
        const { getConfig } = await import('@/lib/config')
        const appConfig = await getConfig()
        const tenantCurrency = appConfig.config.default_currency?.toLowerCase()
        if (tenantCurrency) {
            const matchedRegion = regions.find(
                r => r.currency_code.toLowerCase() === tenantCurrency,
            )
            if (matchedRegion) return matchedRegion.id
        }
    } catch {
        // Config unavailable (build phase, etc.) — fall through to step 3
    }

    // 3. First region fallback (last resort)
    return regions[0].id
}

/**
 * Client-side: set region cookie for subsequent requests.
 * Call this from a client component (currency switcher).
 */
export function getRegionCookieConfig(regionId: string) {
    return {
        name: REGION_COOKIE,
        value: regionId,
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax' as const,
    }
}
