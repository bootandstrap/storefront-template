/**
 * Per-Tenant Rate Limiter — Scoped rate limiting for storefront APIs
 *
 * Uses `TENANT_ID` + IP to scope rate limits per tenant.
 * This prevents one tenant's traffic from affecting another's limits.
 *
 * Pre-configured limiters for different API tiers:
 * - storefront: 120 req/min (browsing, catalog, search)
 * - cart:       60 req/min (cart operations)
 * - checkout:   20 req/min (checkout + payment)
 * - auth:       10 req/min (login, register, password reset)
 * - webhook:    unlimited (Stripe sends what it sends)
 *
 * Usage:
 *   import { checkTenantRateLimit, RATE_LIMIT_TIERS } from './rate-limit-tenant'
 *
 *   const { limited, remaining } = await checkTenantRateLimit(request, 'cart')
 *   if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */

import { createSmartRateLimiter } from './rate-limit-factory'
import type { AsyncRateLimiter } from './rate-limit'
import { headers } from 'next/headers'

// ── Configuration ────────────────────────────────────────────

export const RATE_LIMIT_TIERS = {
    storefront: { limit: 120, windowMs: 60_000, name: 'tenant-storefront' },
    cart: { limit: 60, windowMs: 60_000, name: 'tenant-cart' },
    checkout: { limit: 20, windowMs: 60_000, name: 'tenant-checkout' },
    auth: { limit: 10, windowMs: 60_000, name: 'tenant-auth' },
    api: { limit: 100, windowMs: 86_400_000, name: 'tenant-api-daily' },
} as const

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS

// ── Cached Limiter Instances ─────────────────────────────────

const limiters = new Map<string, AsyncRateLimiter>()

function getLimiter(tier: RateLimitTier): AsyncRateLimiter {
    if (!limiters.has(tier)) {
        limiters.set(tier, createSmartRateLimiter(RATE_LIMIT_TIERS[tier]))
    }
    return limiters.get(tier)!
}

// ── IP Extraction ────────────────────────────────────────────

function getClientIp(headerList: Headers): string {
    // Prefer x-forwarded-for (set by Traefik/Dokploy)
    const forwarded = headerList.get('x-forwarded-for')
    if (forwarded) {
        return forwarded.split(',')[0].trim()
    }
    return headerList.get('x-real-ip') || 'unknown'
}

// ── Main Check Function ─────────────────────────────────────

/**
 * Check rate limit for the current request scoped to tenant + IP.
 * Returns { limited, key } — if limited, the caller should return 429.
 */
export async function checkTenantRateLimit(
    tier: RateLimitTier
): Promise<{ limited: boolean; key: string }> {
    const tenantId = process.env.TENANT_ID || 'unknown'
    const headerList = await headers()
    const ip = getClientIp(headerList)
    const key = `${tenantId}:${ip}`

    const limiter = getLimiter(tier)
    const limited = await limiter.isLimited(key)

    return { limited, key }
}

/**
 * Convenience: check and return 429 Response if limited.
 * Returns null if not limited, Response if limited.
 */
export async function rateLimitOrNull(
    tier: RateLimitTier
): Promise<Response | null> {
    const { limited } = await checkTenantRateLimit(tier)
    if (limited) {
        return new Response(
            JSON.stringify({ error: 'Too many requests. Please try again later.' }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': '60',
                },
            }
        )
    }
    return null
}
