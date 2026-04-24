import 'server-only'
/**
 * Unified Panel Guard — Higher-Order Function
 *
 * Bundles auth + config + optional feature flag + optional limit check
 * into a single call for all panel server actions. Eliminates repetitive
 * boilerplate across 20+ panel action files.
 *
 * Usage:
 *   const { tenantId, supabase, config } = await withPanelGuard()
 *   const { tenantId, config } = await withPanelGuard({ requiredFlag: 'enable_reviews' })
 *   const { tenantId, config } = await withPanelGuard({
 *       requiredFlag: 'enable_crm',
 *       requiredLimit: { key: 'max_crm_contacts', getCurrentCount: () => getContactCount() },
 *   })
 */

import { requirePanelAuth, type PanelAuthResult } from './panel-auth'
import { getConfigForTenant, type AppConfig } from './config'
import { isFeatureEnabled } from './features'
import { checkLimit, type LimitableResource } from './limits'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PanelGuardContext extends PanelAuthResult {
    /** Full tenant config (config, featureFlags, planLimits) */
    appConfig: AppConfig
}

export interface PanelGuardOptions {
    /** Feature flag that must be enabled — throws if disabled */
    requiredFlag?: keyof AppConfig['featureFlags']
    /** Plan limit to check — throws if exceeded */
    requiredLimit?: {
        key: LimitableResource
        getCurrentCount: () => Promise<number>
    }
}

// ---------------------------------------------------------------------------
// Guard function
// ---------------------------------------------------------------------------

export async function withPanelGuard(
    options?: PanelGuardOptions
): Promise<PanelGuardContext> {
    // Step 1: Auth (throws if not authenticated or wrong role)
    const auth = await requirePanelAuth()

    // Step 2: Config for this tenant
    const appConfig = await getConfigForTenant(auth.tenantId)

    // Step 3: Feature flag check (optional)
    if (options?.requiredFlag) {
        if (!isFeatureEnabled(appConfig.featureFlags, options.requiredFlag)) {
            throw new Error(`Feature "${String(options.requiredFlag)}" is not enabled for this tenant`)
        }
    }

    // Step 4: Plan limit check (optional)
    if (options?.requiredLimit) {
        const currentCount = await options.requiredLimit.getCurrentCount()
        const result = checkLimit(
            appConfig.planLimits,
            options.requiredLimit.key,
            currentCount
        )
        if (!result.allowed) {
            throw new Error(
                `Plan limit reached: ${options.requiredLimit.key} ` +
                `(${result.current}/${result.limit})`
            )
        }
    }

    return { ...auth, appConfig }
}
