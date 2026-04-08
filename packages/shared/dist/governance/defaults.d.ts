/**
 * @module governance/defaults
 * @description Fail-closed fallback configuration for degraded mode.
 *
 * SECURITY: When Supabase is unreachable, we degrade to maintenance mode.
 * - ALL feature flags OFF (except enable_maintenance_mode)
 * - ALL plan limits ZERO
 * - No commerce transactions, no user registration, no feature access
 *
 * This prevents unpaid feature access during outages.
 *
 * @locked 🔴 CANONICAL — ecommerce-template/packages/shared is the source of truth.
 */
import type { AppConfig } from './schemas';
export declare const FALLBACK_CONFIG: AppConfig;
//# sourceMappingURL=defaults.d.ts.map