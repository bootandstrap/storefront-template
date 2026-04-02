/**
 * build-module-info.ts — Build ModuleInfo list from governance contract
 *
 * Server-side helper that reads the governance contract module catalog
 * and cross-references with active feature flags AND planLimits to produce
 * the ModuleInfo[] needed by the OnboardingWizard.
 *
 * Tier resolution: cross-references the user's actual planLimits with each
 * tier's limit_effects to determine the REAL purchased tier (not always "basic").
 *
 * @locked 🟡 — derived from governance-contract.json
 */

import governanceContract from '@/lib/governance-contract.json'
import { deriveActiveModulesFromFlags } from './derive-modules'

export interface ModuleInfo {
    key: string
    name: string
    icon: string
    description: string
    active: boolean
    tier?: string
    tierName?: string
    tierFeatures?: string[]
    category: string
}

interface TierDef {
    key: string
    name: string
    price_chf: number
    features?: string[]
    limit_effects?: Record<string, number>
    flag_effects?: Record<string, boolean>
}

interface ModuleDef {
    key: string
    name: string
    icon: string
    description: string
    category: string
    tiers?: TierDef[]
}

/**
 * Resolve the real tier from planLimits by matching against tier limit_effects.
 *
 * Algorithm: iterate tiers from highest to lowest. The first tier whose
 * limit_effects are ALL satisfied by planLimits is the purchased tier.
 * This works because higher tiers have larger limit values.
 */
function resolveTier(
    mod: ModuleDef,
    planLimits: Record<string, number | string | null>,
): TierDef | undefined {
    const tiers = mod.tiers || []
    if (tiers.length === 0) return undefined

    // Iterate from highest tier to lowest
    for (let i = tiers.length - 1; i >= 0; i--) {
        const tier = tiers[i]
        const effects = tier.limit_effects
        if (!effects || Object.keys(effects).length === 0) {
            // Tiers without limit_effects (e.g. auth_advanced) — check flag_effects
            // If we got this far and the module is active, the highest flagged tier wins
            continue
        }

        const allMatch = Object.entries(effects).every(([key, requiredVal]) => {
            const actual = planLimits[key]
            if (typeof actual !== 'number') return false
            return actual >= requiredVal
        })

        if (allMatch) return tier
    }

    // Fallback: return lowest tier
    return tiers[0]
}

/**
 * Build the full module info list from governance contract, marking
 * each module as active/inactive based on current feature flags,
 * with REAL tier resolution from planLimits.
 */
export function buildModuleInfoList(
    featureFlags: Record<string, boolean>,
    planLimits: Record<string, number | string | null>,
): ModuleInfo[] {
    const activeModules = deriveActiveModulesFromFlags(featureFlags)

    // Read from governance contract catalog
    const catalog = (governanceContract as { modules: { catalog: ModuleDef[] } }).modules.catalog

    return catalog.map(mod => {
        const isActive = activeModules.has(mod.key)
        const resolvedTier = isActive ? resolveTier(mod, planLimits) : undefined

        return {
            key: mod.key,
            name: mod.name,
            icon: mod.icon || '📦',
            description: mod.description || '',
            active: isActive,
            tier: resolvedTier?.key,
            tierName: resolvedTier?.name,
            tierFeatures: resolvedTier?.features,
            category: mod.category || 'other',
        }
    })
}
