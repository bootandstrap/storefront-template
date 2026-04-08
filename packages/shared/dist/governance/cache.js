/**
 * @module governance/cache
 * @description In-memory TTL cache for governance config.
 *
 * Uses globalThis to share cache across Turbopack module instances in dev.
 * In Next.js dev mode with Turbopack, API routes and page renders may use
 * different module instances. Module-level variables are isolated per instance.
 * globalThis ensures cache state is shared across ALL routes in the same process.
 * This is the same pattern used by Prisma, Supabase, etc. for dev-mode singletons.
 *
 * @locked 🔴 CANONICAL — ecommerce-template/packages/shared is the source of truth.
 */
const CACHE_TTL_MS = 300_000; // 5 minutes
const globalForConfig = globalThis;
/** Returns cached config if still within TTL, null otherwise. */
export function getCachedConfig() {
    const now = Date.now();
    const cached = globalForConfig.__configCache;
    const timestamp = globalForConfig.__configCacheTimestamp ?? 0;
    if (cached && now - timestamp < CACHE_TTL_MS) {
        return cached;
    }
    return null;
}
/** Store config in cache with current timestamp. */
export function setCachedConfig(config) {
    globalForConfig.__configCache = config;
    globalForConfig.__configCacheTimestamp = Date.now();
}
/** Clear the config cache (used by revalidation server actions). */
export function clearCachedConfig() {
    globalForConfig.__configCache = null;
    globalForConfig.__configCacheTimestamp = 0;
}
//# sourceMappingURL=cache.js.map