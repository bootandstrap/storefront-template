import type { FeatureFlags } from '@/lib/config'

/**
 * Type-safe feature flag check.
 * Usage: isFeatureEnabled(featureFlags, 'enable_whatsapp_checkout')
 */
export function isFeatureEnabled(
    flags: FeatureFlags,
    flag: keyof FeatureFlags
): boolean {
    return flags[flag] === true
}
