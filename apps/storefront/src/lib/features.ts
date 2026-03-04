import type { FeatureFlags } from '@/lib/config'

/**
 * Core invariant flags — F-11
 *
 * These flags MUST always be true in storefronts. Disabling them would break
 * fundamental commerce capabilities (checkout, accounts, order tracking).
 *
 * Even if a SuperAdmin accidentally sets these to false in the DB,
 * isFeatureEnabled() will still return true for them.
 */
const CORE_INVARIANTS: Set<string> = new Set([
    'enable_checkout',
    'enable_customer_accounts',
    'enable_order_tracking',
])

/**
 * Type-safe feature flag check.
 * F-11: Returns true unconditionally for core invariant flags.
 *
 * Usage: isFeatureEnabled(featureFlags, 'enable_whatsapp_checkout')
 */
export function isFeatureEnabled(
    flags: FeatureFlags,
    flag: keyof FeatureFlags
): boolean {
    // F-11: Core invariants are always enabled
    if (CORE_INVARIANTS.has(flag as string)) return true
    return flags[flag] === true
}
