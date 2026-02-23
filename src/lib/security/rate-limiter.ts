/**
 * In-memory sliding-window rate limiter
 *
 * Designed for infrastructure endpoints (health, revalidation) — NOT for
 * general API rate limiting (that should use Redis or Supabase-based counters).
 *
 * Features:
 * - Sliding window counters per key (IP address)
 * - Automatic cleanup of expired entries every 60s
 * - Zero external dependencies
 *
 * @module security/rate-limiter
 */

interface RateLimitEntry {
    /** Timestamps of requests within the current window */
    timestamps: number[]
    /** Window start for fast pruning */
    windowStart: number
}

/** In-memory store — survives across requests in the same server process */
const store = new Map<string, RateLimitEntry>()

/** Cleanup interval handle */
let cleanupInterval: ReturnType<typeof setInterval> | null = null

/**
 * Check if a request is allowed under the rate limit.
 *
 * @param key        Unique identifier (e.g., IP address)
 * @param maxRequests Maximum requests allowed in the window
 * @param windowMs   Window duration in milliseconds
 * @returns          { allowed, remaining, retryAfterMs }
 */
export function checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number | null } {
    const now = Date.now()
    const windowStart = now - windowMs

    let entry = store.get(key)

    if (!entry) {
        entry = { timestamps: [], windowStart: now }
        store.set(key, entry)
    }

    // Prune old timestamps outside the window
    entry.timestamps = entry.timestamps.filter(t => t > windowStart)
    entry.windowStart = windowStart

    if (entry.timestamps.length >= maxRequests) {
        // Rate limited — calculate retry delay
        const oldestInWindow = entry.timestamps[0]!
        const retryAfterMs = oldestInWindow + windowMs - now

        return {
            allowed: false,
            remaining: 0,
            retryAfterMs: Math.max(0, retryAfterMs),
        }
    }

    // Allow the request
    entry.timestamps.push(now)

    return {
        allowed: true,
        remaining: maxRequests - entry.timestamps.length,
        retryAfterMs: null,
    }
}

/**
 * Extract client IP from a request.
 * Respects X-Forwarded-For (Traefik/proxy) and falls back to
 * X-Real-IP or 'unknown'.
 */
export function getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
        // Take the first IP in the chain (client)
        return forwarded.split(',')[0]!.trim()
    }

    return request.headers.get('x-real-ip') || 'unknown'
}

/**
 * Start the periodic cleanup of expired entries.
 * Called automatically on first use. Safe to call multiple times.
 */
export function startCleanup(intervalMs = 60_000): void {
    if (cleanupInterval) return

    cleanupInterval = setInterval(() => {
        const now = Date.now()
        // Use a 5-minute max age for entries even if window is shorter
        const maxAge = 5 * 60 * 1000

        for (const [key, entry] of store.entries()) {
            if (now - entry.windowStart > maxAge && entry.timestamps.length === 0) {
                store.delete(key)
            }
        }
    }, intervalMs)

    // Don't prevent Node.js from exiting
    if (cleanupInterval && typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
        cleanupInterval.unref()
    }
}

// Auto-start cleanup
startCleanup()
