/**
 * OpenFeature Migration Guide — Examples
 *
 * This file documents the gradual migration pattern from direct
 * governance config access to OpenFeature SDK.
 *
 * BOTH patterns work simultaneously. New code should prefer OpenFeature.
 * Old code will continue to work without changes.
 *
 * ────────────────────────────────────────────────────────────────────
 * Pattern 1: Direct config (LEGACY — still works)
 * ────────────────────────────────────────────────────────────────────
 *
 *   import { getConfig } from '@/lib/config'
 *
 *   export default async function Page() {
 *     const { featureFlags, planLimits } = await getConfig()
 *
 *     if (featureFlags.enable_chatbot) {
 *       // render chatbot
 *     }
 *
 *     const maxProducts = planLimits.max_products
 *   }
 *
 * ────────────────────────────────────────────────────────────────────
 * Pattern 2: OpenFeature helpers (PREFERRED for new code)
 * ────────────────────────────────────────────────────────────────────
 *
 *   import { isFeatureEnabled, getLimit } from '@/lib/openfeature'
 *
 *   export default async function Page() {
 *     if (await isFeatureEnabled('enable_chatbot')) {
 *       // render chatbot
 *     }
 *
 *     const maxProducts = await getLimit('max_products', 100)
 *   }
 *
 * ────────────────────────────────────────────────────────────────────
 * Pattern 3: Full OpenFeature client (for advanced use cases)
 * ────────────────────────────────────────────────────────────────────
 *
 *   import { getFeatureClient } from '@/lib/openfeature'
 *
 *   export default async function Page() {
 *     const client = getFeatureClient()
 *
 *     // Boolean flag with context
 *     const details = await client.getBooleanDetails('enable_chatbot', false, {
 *       targetingKey: tenantId,
 *     })
 *     console.log(details.reason) // 'TARGETING_MATCH' | 'DEFAULT' | 'ERROR'
 *
 *     // Numeric limit
 *     const maxProducts = await client.getNumberValue('max_products', 100)
 *   }
 *
 * ────────────────────────────────────────────────────────────────────
 * Pattern 4: Mixed (during migration)
 * ────────────────────────────────────────────────────────────────────
 *
 *   import { getConfig } from '@/lib/config'
 *   import { isFeatureEnabled } from '@/lib/openfeature'
 *
 *   export default async function Page() {
 *     // Use OpenFeature for feature checks
 *     const chatbotEnabled = await isFeatureEnabled('enable_chatbot')
 *
 *     // Use direct config for store-level settings (name, logo, etc.)
 *     const { config } = await getConfig()
 *     const storeName = config.business_name
 *   }
 *
 * ────────────────────────────────────────────────────────────────────
 * Migration Checklist:
 * ────────────────────────────────────────────────────────────────────
 *
 * When migrating a component:
 * 1. Replace `const { featureFlags } = await getConfig()`
 *    with `import { isFeatureEnabled } from '@/lib/openfeature'`
 * 2. Replace `featureFlags.enable_xyz` with `await isFeatureEnabled('enable_xyz')`
 * 3. Replace `planLimits.max_xyz` with `await getLimit('max_xyz', default)`
 * 4. Keep `getConfig()` for store config (business_name, logo, theme, etc.)
 *
 * Benefits of migrating:
 * - Explicit defaults (no more `?? true` scattered everywhere)
 * - Evaluation details (reason, variant) for debugging
 * - Future-proof: swap provider without changing consumers
 * - Type-safe key lookup
 *
 * DO NOT migrate:
 * - Root layout theme/meta generation (needs full config object)
 * - Components that need 5+ flags (getConfig() is more efficient)
 * - Client components (OpenFeature is server-side only in Next.js)
 */

// This file is documentation-only. No runtime exports.
export {}
