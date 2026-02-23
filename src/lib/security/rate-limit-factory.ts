/**
 * Smart Rate Limiter Factory
 *
 * Auto-selects Redis-backed (distributed) or in-memory rate limiting
 * based on environment configuration. Provides a unified async interface.
 *
 * Usage:
 *   const limiter = createSmartRateLimiter({ limit: 60, windowMs: 60_000, name: 'api' })
 *   if (await limiter.isLimited(clientIp)) { return 429 }
 */

import type { RateLimiterConfig } from './rate-limit'
import { createRateLimiter } from './rate-limit'
import { createRedisRateLimiter } from './rate-limit-redis'
import type { AsyncRateLimiter } from './rate-limit'

/**
 * Create a rate limiter that uses Redis when REDIS_URL is configured,
 * with automatic in-memory fallback.
 *
 * Always returns an AsyncRateLimiter (async isLimited) for a consistent
 * interface regardless of backend.
 */
export function createSmartRateLimiter(config: RateLimiterConfig): AsyncRateLimiter {
    if (process.env.REDIS_URL) {
        // Redis available → distributed rate limiting across replicas
        return createRedisRateLimiter(config)
    }

    // No Redis → wrap in-memory limiter with async interface
    const memLimiter = createRateLimiter(config)
    return {
        async isLimited(key: string): Promise<boolean> {
            return memLimiter.isLimited(key)
        },
        reset(key: string): void {
            memLimiter.reset(key)
        },
        resetAll(): void {
            memLimiter.resetAll()
        },
    }
}
