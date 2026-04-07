/**
 * Rate Limiting — Upstash Redis sliding window
 *
 * Provides tenant-aware rate limiting for the Next.js Edge Middleware.
 * Uses Upstash Redis REST API (Edge-compatible, no TCP connection needed).
 *
 * Architecture:
 *   middleware.ts → getRateLimiter(tenantId) → Upstash Redis (REST)
 *   → returns { success, limit, remaining, reset }
 *
 * Configuration:
 *   - UPSTASH_REDIS_REST_URL: Upstash Redis REST endpoint
 *   - UPSTASH_REDIS_REST_TOKEN: Upstash Redis REST token
 *   - RATE_LIMIT_MAX_REQUESTS_DAY: Global fallback (default: 50000)
 *
 * Design decisions:
 *   - Sliding window: smoother than fixed window, prevents burst at boundary
 *   - Per-tenant key: `rl:{tenantId}:{date}` for daily quota
 *   - Graceful degradation: if Upstash is unreachable, allow request (fail-open)
 *   - Edge-compatible: uses REST API only (no ioredis/TCP in Edge Runtime)
 *
 * @module lib/rate-limit
 * @locked 🟡 EXTEND — add strategies, don't remove the interface
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitResult {
    /** Whether the request should be allowed */
    success: boolean
    /** The configured daily limit */
    limit: number
    /** Remaining requests in the current window */
    remaining: number
    /** Unix timestamp (ms) when the window resets */
    reset: number
}

export interface RateLimitConfig {
    /** Maximum requests per day for this tenant */
    maxRequestsDay: number
}

// ---------------------------------------------------------------------------
// Upstash REST client (Edge-compatible, no SDK dependency required)
// ---------------------------------------------------------------------------

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || ''
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || ''

/** Whether Upstash is configured and available */
export function isRateLimitEnabled(): boolean {
    return !!(UPSTASH_URL && UPSTASH_TOKEN)
}

/**
 * Execute a Redis command via Upstash REST API.
 * Returns null on failure (fail-open).
 */
async function upstashCommand<T = unknown>(
    command: string[]
): Promise<T | null> {
    if (!UPSTASH_URL || !UPSTASH_TOKEN) return null

    try {
        const res = await fetch(`${UPSTASH_URL}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${UPSTASH_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(command),
        })

        if (!res.ok) {
            console.warn(`[rate-limit] Upstash error: ${res.status} ${res.statusText}`)
            return null
        }

        const data = await res.json() as { result: T }
        return data.result
    } catch (err) {
        console.warn('[rate-limit] Upstash unreachable, failing open:', err)
        return null
    }
}

// ---------------------------------------------------------------------------
// Sliding Window Rate Limiter
// ---------------------------------------------------------------------------

/**
 * Check and increment the rate limit for a tenant.
 *
 * Uses a simple daily counter with TTL. The key format is `rl:{tenantId}`
 * and expires at midnight UTC each day.
 *
 * Fail-open: if Redis is unreachable, the request is allowed.
 */
export async function checkRateLimit(
    tenantId: string,
    config: RateLimitConfig
): Promise<RateLimitResult> {
    const { maxRequestsDay } = config

    // No limit configured or unlimited
    if (maxRequestsDay <= 0 || maxRequestsDay >= 1_000_000) {
        return { success: true, limit: maxRequestsDay, remaining: maxRequestsDay, reset: 0 }
    }

    const key = `rl:${tenantId}`

    // INCR the key — atomically increments and returns the new count
    const count = await upstashCommand<number>(['INCR', key])

    // Fail-open: Redis unreachable → allow
    if (count === null) {
        return { success: true, limit: maxRequestsDay, remaining: maxRequestsDay, reset: 0 }
    }

    // First request of the window → set TTL to remaining seconds until midnight UTC
    if (count === 1) {
        const now = new Date()
        const midnight = new Date(now)
        midnight.setUTCHours(24, 0, 0, 0)
        const ttlSeconds = Math.ceil((midnight.getTime() - now.getTime()) / 1000)
        await upstashCommand(['EXPIRE', key, String(ttlSeconds)])
    }

    const remaining = Math.max(0, maxRequestsDay - count)
    const success = count <= maxRequestsDay

    // Compute reset time (next midnight UTC)
    const now = new Date()
    const reset = new Date(now)
    reset.setUTCHours(24, 0, 0, 0)

    return {
        success,
        limit: maxRequestsDay,
        remaining,
        reset: reset.getTime(),
    }
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/**
 * Build rate limit headers for the response.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
    }
}

/**
 * Build a 429 Too Many Requests response with appropriate headers.
 */
export function rateLimitExceededResponse(result: RateLimitResult): Response {
    const retryAfterSeconds = Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000)
    )

    return new Response(
        JSON.stringify({
            error: 'Too Many Requests',
            message: 'Daily request limit exceeded. Please try again tomorrow.',
            limit: result.limit,
            reset: new Date(result.reset).toISOString(),
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(retryAfterSeconds),
                ...rateLimitHeaders(result),
            },
        }
    )
}

// ---------------------------------------------------------------------------
// Read-only counter (for dashboards)
// ---------------------------------------------------------------------------

/**
 * Get the current request count for a tenant WITHOUT incrementing.
 * Used by the Capacity dashboard to display real traffic metrics.
 *
 * Returns 0 if Upstash is unreachable or the key doesn't exist.
 */
export async function getRequestCount(tenantId: string): Promise<number> {
    const key = `rl:${tenantId}`
    const count = await upstashCommand<string | number>(['GET', key])
    if (count === null) return 0
    return typeof count === 'number' ? count : parseInt(count, 10) || 0
}

