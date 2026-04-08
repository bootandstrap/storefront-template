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
import type { AppConfig } from './schemas';
/** Returns cached config if still within TTL, null otherwise. */
export declare function getCachedConfig(): AppConfig | null;
/** Store config in cache with current timestamp. */
export declare function setCachedConfig(config: AppConfig): void;
/** Clear the config cache (used by revalidation server actions). */
export declare function clearCachedConfig(): void;
//# sourceMappingURL=cache.d.ts.map