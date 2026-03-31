/**
 * derive-modules.ts — Derive active modules from feature flags
 *
 * Pure function that determines which modules are active by inspecting
 * the feature_flags table (synced by Stripe Entitlements webhook or
 * the capability materializer).
 *
 * This is the PREFERRED path for determining module activation status
 * because feature_flags are always fresh (written by webhook in <1s).
 * The module_orders path is maintained as a fallback for tier resolution.
 *
 * @locked 🟡 SEMI-LOCKED — logic derived from governance-contract.json
 */

import { FLAG_MODULE_MAP } from './flag-module-map'

/**
 * Given a feature flags object, derive which modules are active.
 *
 * A module is considered active if ANY of its primary enabling flags
 * are true. The primary flag is the one that matches `enable_{module_key}`
 * or the first flag mapped to that module.
 *
 * @returns Record of moduleKey → true for all active modules
 */
export function deriveActiveModulesFromFlags(
  flags: Record<string, boolean | null | undefined>,
): Set<string> {
  const activeModules = new Set<string>()

  for (const [flagKey, moduleKey] of Object.entries(FLAG_MODULE_MAP)) {
    if (flags[flagKey] === true) {
      activeModules.add(moduleKey)
    }
  }

  return activeModules
}

/**
 * Check if a specific module is active based on feature flags.
 */
export function isModuleActive(
  moduleKey: string,
  flags: Record<string, boolean | null | undefined>,
): boolean {
  return deriveActiveModulesFromFlags(flags).has(moduleKey)
}

/**
 * Get all active module keys as an array.
 */
export function getActiveModuleKeys(
  flags: Record<string, boolean | null | undefined>,
): string[] {
  return [...deriveActiveModulesFromFlags(flags)]
}
