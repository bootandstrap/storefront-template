/**
 * Rate Limiter — In-memory sliding window per-key
 *
 * Extracted from proxy.ts for reusability. Adapter pattern allows
 * swapping to Redis-backed implementation later without changing callers.
 */

export interface RateLimiterConfig {
    /** Max requests within the window */
    limit: number
    /** Window duration in milliseconds */
    windowMs: number
    /** Identifier for this limiter (used as Redis key prefix) */
    name?: string
}

export interface RateLimiter {
    /** Returns true if the key is over the limit (sync — in-memory implementation) */
    isLimited(key: string): boolean
    /** Reset a specific key (for testing) */
    reset(key: string): void
    /** Reset all keys */
    resetAll(): void
}

/** Async variant for distributed (Redis-backed) rate limiters */
export interface AsyncRateLimiter {
    /** Returns true if the key is over the limit (async — Redis pipeline) */
    isLimited(key: string): Promise<boolean>
    /** Reset a specific key */
    reset(key: string): void
    /** Reset all keys */
    resetAll(): void
}

/**
 * Create an in-memory sliding window rate limiter.
 *
 * Each key gets an independent counter. Once the counter exceeds `limit`
 * within `windowMs`, subsequent calls return `true` (rate limited).
 */
export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
    const { limit, windowMs } = config
    const map = new Map<string, { count: number; resetAt: number }>()

    return {
        isLimited(key: string): boolean {
            const now = Date.now()
            const entry = map.get(key)

            if (!entry || now > entry.resetAt) {
                map.set(key, { count: 1, resetAt: now + windowMs })
                return false
            }

            entry.count++
            return entry.count > limit
        },

        reset(key: string): void {
            map.delete(key)
        },

        resetAll(): void {
            map.clear()
        },
    }
}

/** Pre-configured limiters matching proxy.ts defaults */
export const API_RATE_LIMIT: RateLimiterConfig = { limit: 60, windowMs: 60_000 }
export const PAGE_RATE_LIMIT: RateLimiterConfig = { limit: 200, windowMs: 60_000 }
