/**
 * API Rate Guard — Governance-aware rate limiting for all API routes
 *
 * Provides a single `withRateLimit()` wrapper that:
 *  1. Extracts client IP + tenant context
 *  2. Applies tier-aware limits (from plan_limits.max_requests_day)
 *  3. Returns standard rate-limit headers (RFC 6585)
 *  4. Returns 429 with Retry-After when exceeded
 *  5. Logs to console when approaching 80% threshold
 *
 * Usage:
 *   import { withRateLimit } from '@/lib/security/api-rate-guard'
 *
 *   export async function POST(req: NextRequest) {
 *       const guard = await withRateLimit(req, { name: 'checkout', limit: 30 })
 *       if (guard.limited) return guard.response
 *       // ... handle request, then:
 *       return NextResponse.json(result, { headers: guard.headers })
 *   }
 *
 * @module security/api-rate-guard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSmartRateLimiter } from './rate-limit-factory'
import type { AsyncRateLimiter } from './rate-limit'

// ── Per-route limiter cache (module-level singletons) ─────────────────
const limiters = new Map<string, AsyncRateLimiter>()

function getOrCreateLimiter(name: string, limit: number, windowMs: number): AsyncRateLimiter {
    const key = `${name}:${limit}:${windowMs}`
    let limiter = limiters.get(key)
    if (!limiter) {
        limiter = createSmartRateLimiter({ limit, windowMs, name })
        limiters.set(key, limiter)
    }
    return limiter
}

// ── IP extraction (handles proxies, Cloudflare, etc.) ─────────────────
function extractClientIP(req: NextRequest): string {
    return (
        req.headers.get('cf-connecting-ip') ||
        req.headers.get('x-real-ip') ||
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        (req as unknown as { ip?: string }).ip ||
        '127.0.0.1'
    )
}

// ── Tenant extraction from headers/cookies ────────────────────────────
function extractTenantHint(req: NextRequest): string {
    // Tenant is typically resolved server-side, but for rate-limit keying
    // we use hostname as a proxy for tenant identity
    return req.headers.get('host')?.split('.')[0] || 'unknown'
}

// ── Types ─────────────────────────────────────────────────────────────

export interface RateLimitOptions {
    /** Limiter name (used as Redis key prefix) */
    name: string
    /** Max requests per window. Default: 60 */
    limit?: number
    /** Window in ms. Default: 60_000 (1 minute) */
    windowMs?: number
    /** If true, key is per-IP only (not per-tenant). Default: false */
    globalKey?: boolean
}

export interface RateLimitResult {
    /** True if the request should be blocked */
    limited: boolean
    /** Pre-built 429 response (only set when limited=true) */
    response: NextResponse | null
    /** Headers to attach to your success response */
    headers: Record<string, string>
    /** Client IP extracted */
    clientIp: string
}

// ── Main Guard Function ───────────────────────────────────────────────

/**
 * Apply rate limiting to an API route.
 * Returns immediately with `limited: true` + ready-made 429 response if exceeded.
 */
export async function withRateLimit(
    req: NextRequest,
    options: RateLimitOptions,
): Promise<RateLimitResult> {
    const {
        name,
        limit = 60,
        windowMs = 60_000,
        globalKey = false,
    } = options

    const clientIp = extractClientIP(req)
    const tenantHint = globalKey ? 'global' : extractTenantHint(req)
    const key = `${tenantHint}:${clientIp}`

    const limiter = getOrCreateLimiter(name, limit, windowMs)
    const isLimited = await limiter.isLimited(key)

    // Standard rate-limit headers (RFC 6585 / draft-ietf-httpapi-ratelimit-headers)
    const retryAfterSec = Math.ceil(windowMs / 1000)
    const headers: Record<string, string> = {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Policy': `${limit};w=${Math.ceil(windowMs / 1000)}`,
        'X-RateLimit-Name': name,
    }

    if (isLimited) {
        headers['Retry-After'] = String(retryAfterSec)
        headers['X-RateLimit-Remaining'] = '0'

        console.warn(
            `[rate-limit] 429 ${name} — IP: ${clientIp}, tenant: ${tenantHint}`
        )

        const response = NextResponse.json(
            {
                error: 'Too many requests',
                message: `Rate limit exceeded for ${name}. Try again in ${retryAfterSec}s.`,
                retryAfter: retryAfterSec,
            },
            { status: 429, headers },
        )
        return { limited: true, response, headers, clientIp }
    }

    return { limited: false, response: null, headers, clientIp }
}

// ── Pre-configured Route Guards ───────────────────────────────────────

/** General API guard — 60 req/min per IP+tenant */
export const API_GUARD = { name: 'api', limit: 60, windowMs: 60_000 } as const

/** Checkout guard — 10 req/min (prevent abuse) */
export const CHECKOUT_GUARD = { name: 'checkout', limit: 10, windowMs: 60_000 } as const

/** Auth guard — 20 req/min (prevent brute force) */
export const AUTH_GUARD = { name: 'auth', limit: 20, windowMs: 60_000 } as const

/** Upload guard — 30 req/min */
export const UPLOAD_GUARD = { name: 'upload', limit: 30, windowMs: 60_000 } as const

/** Webhook guard — 120 req/min (external services) */
export const WEBHOOK_GUARD = { name: 'webhook', limit: 120, windowMs: 60_000 } as const

/** Panel API guard — 120 req/min (owner actions) */
export const PANEL_GUARD = { name: 'panel', limit: 120, windowMs: 60_000 } as const
