/**
 * @module governance/cache
 * @description In-memory TTL cache for governance config.
 *
 * @locked 🔴 LOCKED — DO NOT MODIFY in tenant repos.
 * Source of truth: ecommerce-template/packages/shared/src/governance/cache.ts
 * Sync via: scripts/sync-governance.sh
 */

import type { AppConfig } from './schemas'

const CACHE_TTL_MS = 300_000 // 5 minutes

const globalForConfig = globalThis as unknown as {
    __configCache?: AppConfig | null
    __configCacheTimestamp?: number
}

export function getCachedConfig(): AppConfig | null {
    const now = Date.now()
    const cached = globalForConfig.__configCache
    const timestamp = globalForConfig.__configCacheTimestamp ?? 0
    if (cached && now - timestamp < CACHE_TTL_MS) {
        return cached
    }
    return null
}

export function setCachedConfig(config: AppConfig): void {
    globalForConfig.__configCache = config
    globalForConfig.__configCacheTimestamp = Date.now()
}

export function clearCachedConfig(): void {
    globalForConfig.__configCache = null
    globalForConfig.__configCacheTimestamp = 0
}
