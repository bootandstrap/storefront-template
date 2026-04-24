/**
 * Redis-backed distributed rate limiter
 *
 * Uses Redis INCR + PEXPIRE in a pipeline for atomic counting.
 * Falls back to in-memory if Redis is unavailable (graceful degradation).
 *
 * Same `RateLimiter` interface as the in-memory module.
 */

import type { AsyncRateLimiter, RateLimiterConfig } from './rate-limit'
import { createRateLimiter as createMemoryLimiter } from './rate-limit'
import { logger } from '@/lib/logger'

let redisClient: import('ioredis').default | null = null
let redisAvailable = false

/**
 * Lazily initialize Redis connection.
 * Only connects if REDIS_URL env var is set.
 */
async function getRedisClient(): Promise<import('ioredis').default | null> {
    if (redisClient) return redisClient

    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) return null

    try {
        const Redis = (await import('ioredis')).default
        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 1,
            connectTimeout: 3000,
            lazyConnect: true,
            enableReadyCheck: false,
        })
        await redisClient.connect()
        redisAvailable = true
        logger.info('[rate-limit] Redis connected for distributed rate limiting')
        return redisClient
    } catch (err) {
        logger.warn('[rate-limit] Redis unavailable, using in-memory fallback:', err)
        redisAvailable = false
        redisClient = null
        return null
    }
}

/**
 * Create a Redis-backed rate limiter with in-memory fallback.
 */
export function createRedisRateLimiter(config: RateLimiterConfig): AsyncRateLimiter {
    const { limit, windowMs } = config
    const prefix = `rl:${config.name || 'default'}`

    // In-memory fallback limiter
    const memLimiter = createMemoryLimiter(config)

    return {
        async isLimited(key: string): Promise<boolean> {
            const redis = await getRedisClient()
            if (!redis || !redisAvailable) {
                return memLimiter.isLimited(key)
            }

            try {
                const redisKey = `${prefix}:${key}`
                const pipeline = redis.pipeline()
                pipeline.incr(redisKey)
                pipeline.pexpire(redisKey, windowMs)
                const results = await pipeline.exec()

                if (!results || !results[0]) {
                    return memLimiter.isLimited(key)
                }

                const count = results[0][1] as number
                return count > limit
            } catch {
                // Redis error → fallback to in-memory
                redisAvailable = false
                logger.warn('[rate-limit] Redis error, falling back to in-memory')
                return memLimiter.isLimited(key)
            }
        },

        reset(key: string): void {
            const redis = redisClient
            if (redis && redisAvailable) {
                redis.del(`${prefix}:${key}`).catch(() => { })
            }
            memLimiter.reset(key)
        },

        resetAll(): void {
            // Only reset in-memory; Redis keys expire naturally
            memLimiter.resetAll()
        },
    }
}
