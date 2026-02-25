/**
 * Per-Tenant Rate Limiter — Scoped rate limiting for storefront APIs
 *
 * TWO layers of protection:
 *
 * 1. ANTI-ABUSE (per IP) — Security, always active, not sellable:
 *    - storefront: 120 req/min (browsing, catalog, search)
 *    - cart:       60 req/min (cart operations)
 *    - checkout:   20 req/min (checkout + payment)
 *    - auth:       10 req/min (login, register, password reset)
 *
 * 2. TRAFFIC CAPACITY (per tenant) — Commercial, sellable as module:
 *    - capacity:   max_requests_day from planLimits (default 5,000/day)
 *    - Tenants can purchase "Capacidad de Tráfico" module to expand this.
 *    - 999999 = effectively unlimited (Premium tier).
 *
 * Usage:
 *   import { checkTenantRateLimit, rateLimitOrNull, checkTrafficCapacity } from './rate-limit-tenant'
 *
 *   // Anti-abuse (per IP):
 *   const { limited } = await checkTenantRateLimit('cart')
 *   if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 *
 *   // Traffic capacity (per tenant, in middleware or layout):
 *   const { limited, remaining } = await checkTrafficCapacity(planLimits.max_requests_day)
 *   if (limited) return NextResponse.json({ error: 'Daily traffic limit reached' }, { status: 429 })
 */

import { createSmartRateLimiter } from './rate-limit-factory'
import type { AsyncRateLimiter } from './rate-limit'
import { headers } from 'next/headers'

// ── Anti-Abuse Tiers (per IP — security, not sellable) ──────

export const RATE_LIMIT_TIERS = {
    storefront: { limit: 120, windowMs: 60_000, name: 'tenant-storefront' },
    cart: { limit: 60, windowMs: 60_000, name: 'tenant-cart' },
    checkout: { limit: 20, windowMs: 60_000, name: 'tenant-checkout' },
    auth: { limit: 10, windowMs: 60_000, name: 'tenant-auth' },
} as const

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS

// ── Cached Limiter Instances ─────────────────────────────────

const limiters = new Map<string, AsyncRateLimiter>()

function getLimiter(name: string, config: { limit: number; windowMs: number; name: string }): AsyncRateLimiter {
    if (!limiters.has(name)) {
        limiters.set(name, createSmartRateLimiter(config))
    }
    return limiters.get(name)!
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

// ── Anti-Abuse Check (per IP) ───────────────────────────────

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

    const config = RATE_LIMIT_TIERS[tier]
    const limiter = getLimiter(tier, config)
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

// ── Traffic Capacity Check (per tenant — commercial) ────────

/**
 * Check daily traffic capacity for the entire tenant.
 * Key is just the tenantId (all visitors count toward the same pool).
 * The limit comes from planLimits.max_requests_day.
 *
 * @param maxRequestsDay - from planLimits.max_requests_day (default 5000)
 * @returns { limited, remaining } — if limited, tenant has exceeded daily capacity
 */
export async function checkTrafficCapacity(
    maxRequestsDay: number
): Promise<{ limited: boolean; remaining: number }> {
    const tenantId = process.env.TENANT_ID || 'unknown'

    // 999999 = Premium tier (unlimited) — skip check entirely
    if (maxRequestsDay >= 999999) {
        return { limited: false, remaining: maxRequestsDay }
    }

    const config = { limit: maxRequestsDay, windowMs: 86_400_000, name: 'tenant-capacity' }
    const capacityKey = `capacity:${maxRequestsDay}` // cache key includes limit so tier upgrades take effect
    const limiter = getLimiter(capacityKey, config)
    const limited = await limiter.isLimited(tenantId)

    return { limited, remaining: limited ? 0 : maxRequestsDay }
}
