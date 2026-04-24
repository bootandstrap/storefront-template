/**
 * governance-test-utils.ts — Shared utilities for governance contract tests
 *
 * Provides helpers for:
 *   - Loading the governance contract
 *   - Creating test fixtures for tenant configs at various tier levels
 *   - Asserting flag/limit relationships
 *
 * @module __tests__/governance/governance-test-utils
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Contract Loading ────────────────────────────────────────────────────────

const CONTRACT_PATH = resolve(__dirname, '../../lib/governance-contract.json')

export interface GovernanceContract {
    flags: {
        count: number
        keys: string[]
        groups: Record<string, string[]>
    }
    limits: {
        count: number
        keys: string[]
        numeric_keys: string[]
        metadata_keys: string[]
    }
    modules: {
        count: number
        catalog: ModuleDef[]
    }
}

export interface ModuleDef {
    key: string
    name: string
    icon: string
    description: string
    category: string
    popular: boolean
    requires: string[]
    tiers: TierDef[]
}

export interface TierDef {
    key: string
    name: string
    price_chf: number
    features: string[]
    flag_effects: Record<string, boolean>
    limit_effects: Record<string, number>
}

let _cachedContract: GovernanceContract | null = null

export function loadContract(): GovernanceContract {
    if (_cachedContract) return _cachedContract
    _cachedContract = JSON.parse(readFileSync(CONTRACT_PATH, 'utf-8'))
    return _cachedContract!
}

export function getModule(key: string): ModuleDef {
    const contract = loadContract()
    const mod = contract.modules.catalog.find(m => m.key === key)
    if (!mod) throw new Error(`Module '${key}' not found in contract`)
    return mod
}

export function getTier(moduleKey: string, tierKey: string): TierDef {
    const mod = getModule(moduleKey)
    const tier = mod.tiers.find(t => t.key === tierKey)
    if (!tier) throw new Error(`Tier '${tierKey}' not found in module '${moduleKey}'`)
    return tier
}

// ── Contract Assertions ─────────────────────────────────────────────────────

/**
 * Assert that a module's tier affects specific flags.
 * Useful for verifying that purchasing a tier actually enables expected features.
 */
export function assertTierEnablesFlags(
    moduleKey: string,
    tierKey: string,
    expectedFlags: string[]
): void {
    const tier = getTier(moduleKey, tierKey)
    for (const flag of expectedFlags) {
        if (!(flag in tier.flag_effects)) {
            throw new Error(
                `Module '${moduleKey}' tier '${tierKey}' does NOT affect flag '${flag}'. ` +
                `Available effects: ${Object.keys(tier.flag_effects).join(', ')}`
            )
        }
        if (!tier.flag_effects[flag]) {
            throw new Error(
                `Module '${moduleKey}' tier '${tierKey}' sets flag '${flag}' to FALSE ` +
                `(expected TRUE).`
            )
        }
    }
}

/**
 * Assert that a module's tier sets specific limits to at least a minimum value.
 */
export function assertTierSetsLimits(
    moduleKey: string,
    tierKey: string,
    expectedLimits: Record<string, number>
): void {
    const tier = getTier(moduleKey, tierKey)
    for (const [limit, minValue] of Object.entries(expectedLimits)) {
        if (!(limit in tier.limit_effects)) {
            throw new Error(
                `Module '${moduleKey}' tier '${tierKey}' does NOT affect limit '${limit}'. ` +
                `Available effects: ${Object.keys(tier.limit_effects).join(', ')}`
            )
        }
        if (tier.limit_effects[limit] < minValue) {
            throw new Error(
                `Module '${moduleKey}' tier '${tierKey}' sets limit '${limit}' to ` +
                `${tier.limit_effects[limit]} (expected >= ${minValue}).`
            )
        }
    }
}

/**
 * Assert that higher tiers provide strictly better limits than lower tiers.
 * This prevents tier regression bugs where a higher tier gives fewer resources.
 */
export function assertTierProgression(moduleKey: string): void {
    const mod = getModule(moduleKey)
    for (let i = 1; i < mod.tiers.length; i++) {
        const lower = mod.tiers[i - 1]
        const upper = mod.tiers[i]

        // Every limit in the lower tier should be <= the corresponding limit in the upper tier
        for (const [key, lowerValue] of Object.entries(lower.limit_effects)) {
            if (key in upper.limit_effects) {
                if (upper.limit_effects[key] < lowerValue) {
                    throw new Error(
                        `Module '${moduleKey}': tier '${upper.key}' regresses limit '${key}' ` +
                        `(${upper.limit_effects[key]} < ${lower.key}'s ${lowerValue})`
                    )
                }
            }
        }
    }
}

/**
 * Verify module dependency chain — if module A requires module B,
 * B must exist in the contract.
 */
export function assertModuleDependencies(moduleKey: string): void {
    const contract = loadContract()
    const mod = getModule(moduleKey)
    for (const dep of mod.requires) {
        const depExists = contract.modules.catalog.some(m => m.key === dep)
        if (!depExists) {
            throw new Error(
                `Module '${moduleKey}' requires '${dep}' which does NOT exist in the contract.`
            )
        }
    }
}

// ── Fixture Builders ────────────────────────────────────────────────────────

/**
 * Build a feature flags object where all flags are set to false (zero-module tenant).
 */
export function buildZeroFlags(): Record<string, boolean> {
    const contract = loadContract()
    const flags: Record<string, boolean> = {}
    for (const key of contract.flags.keys) {
        flags[key] = false
    }
    return flags
}

/**
 * Build a feature flags object for a specific set of module+tier combos.
 */
export function buildFlagsForModules(
    modules: Array<{ key: string; tier: string }>
): Record<string, boolean> {
    const flags = buildZeroFlags()
    for (const { key, tier } of modules) {
        const tierDef = getTier(key, tier)
        Object.assign(flags, tierDef.flag_effects)
    }
    return flags
}

/**
 * Build plan limits for a specific set of module+tier combos.
 */
export function buildLimitsForModules(
    modules: Array<{ key: string; tier: string }>
): Record<string, number> {
    const contract = loadContract()
    // Start with zeros
    const limits: Record<string, number> = {}
    for (const key of contract.limits.numeric_keys) {
        limits[key] = 0
    }
    // Apply effects (take max for each limit)
    for (const { key, tier } of modules) {
        const tierDef = getTier(key, tier)
        for (const [lk, lv] of Object.entries(tierDef.limit_effects)) {
            limits[lk] = Math.max(limits[lk] || 0, lv)
        }
    }
    return limits
}
