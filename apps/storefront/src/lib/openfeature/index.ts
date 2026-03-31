/**
 * OpenFeature Initialization
 *
 * Sets up the OpenFeature SDK with the BootandStrap provider.
 * Call `initOpenFeature()` once at app startup (e.g., in root layout).
 *
 * Usage in components:
 *
 *   // Server Component:
 *   import { getFeatureClient } from '@/lib/openfeature'
 *   const client = getFeatureClient()
 *   const enabled = await client.getBooleanValue('enable_chatbot', false)
 *
 *   // Or with helper:
 *   import { isFeatureEnabled, getLimit } from '@/lib/openfeature'
 *   if (await isFeatureEnabled('enable_chatbot')) { ... }
 *   const maxProducts = await getLimit('max_products', 100)
 */

import { OpenFeature } from '@openfeature/server-sdk'
import { BootandStrapProvider } from './provider'

let initialized = false

/**
 * Initialize OpenFeature with the BootandStrap provider.
 * Safe to call multiple times — only runs once.
 */
export function initOpenFeature(): void {
  if (initialized) return
  OpenFeature.setProvider(new BootandStrapProvider())
  initialized = true
}

/**
 * Get the OpenFeature client.
 * Auto-initializes the provider if not yet done.
 */
export function getFeatureClient() {
  initOpenFeature()
  return OpenFeature.getClient()
}

// ── Convenience Helpers ─────────────────────────────────────────────────

/**
 * Check if a feature flag is enabled.
 *
 * @example
 *   if (await isFeatureEnabled('enable_chatbot')) { ... }
 */
export async function isFeatureEnabled(
  flagKey: string,
  defaultValue = false,
): Promise<boolean> {
  const client = getFeatureClient()
  return client.getBooleanValue(flagKey, defaultValue)
}

/**
 * Get a numeric plan limit.
 *
 * @example
 *   const maxProducts = await getLimit('max_products', 100)
 */
export async function getLimit(
  limitKey: string,
  defaultValue = 0,
): Promise<number> {
  const client = getFeatureClient()
  return client.getNumberValue(limitKey, defaultValue)
}

/**
 * Get a config string value.
 *
 * @example
 *   const language = await getConfigValue('language', 'es')
 */
export async function getConfigValue(
  key: string,
  defaultValue = '',
): Promise<string> {
  const client = getFeatureClient()
  return client.getStringValue(key, defaultValue)
}
