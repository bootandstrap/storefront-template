/**
 * Governance Integrity Helpers
 *
 * Importable validator that any script, deploy, or demo can call to verify
 * that governance-contract.json (the single source of truth) is perfectly
 * reflected across ALL consumers in the system.
 *
 * Usage:
 *   import { validateGovernanceDrift, assertNoGovernanceDrift } from '@/lib/governance-integrity-helpers'
 *   const report = validateGovernanceDrift()
 *   assertNoGovernanceDrift() // throws with details if any drift
 */

import contract from './governance-contract.json'
import { FeatureFlagsSchema, PlanLimitsSchema, StoreConfigSchema } from './governance/schemas'
import { FALLBACK_CONFIG } from './governance/defaults'
import { FEATURE_GATE_MAP, PANEL_GATED_FLAGS } from './feature-gate-config'

// ── Types ──

export interface DriftIssue {
    category: 'flags' | 'limits' | 'modules' | 'pricing' | 'cross-package' | 'config'
    severity: 'error' | 'warning'
    message: string
    expected: string | number
    actual: string | number
}

export interface DriftReport {
    ok: boolean
    issues: DriftIssue[]
    summary: {
        flags: { contract: number; schema: number; defaults: number }
        limits: { contract: number; schema: number; defaults: number }
        modules: { contract: number; featureGate: number }
        pricing: { maintenance_chf: number }
    }
}

// ── Helpers ──

function setDiff(a: string[], b: string[]): { missing: string[]; extra: string[] } {
    const setA = new Set(a)
    const setB = new Set(b)
    return {
        missing: a.filter(x => !setB.has(x)),
        extra: b.filter(x => !setA.has(x)),
    }
}

// ── Main Validator ──

export function validateGovernanceDrift(): DriftReport {
    const issues: DriftIssue[] = []

    // ── Flags ──
    const contractFlags = contract.flags.keys
    const schemaFlagKeys = Object.keys(FeatureFlagsSchema.shape)
    const defaultFlagKeys = Object.keys(FALLBACK_CONFIG.featureFlags)

    // flags → schema
    const flagSchemaD = setDiff(contractFlags, schemaFlagKeys)
    if (flagSchemaD.missing.length > 0) {
        issues.push({
            category: 'flags', severity: 'error',
            message: `Flags in contract but missing from FeatureFlagsSchema: ${flagSchemaD.missing.join(', ')}`,
            expected: contractFlags.length, actual: schemaFlagKeys.length,
        })
    }
    if (flagSchemaD.extra.length > 0) {
        issues.push({
            category: 'flags', severity: 'error',
            message: `Flags in FeatureFlagsSchema but missing from contract: ${flagSchemaD.extra.join(', ')}`,
            expected: contractFlags.length, actual: schemaFlagKeys.length,
        })
    }

    // flags → defaults
    const flagDefaultD = setDiff(contractFlags, defaultFlagKeys)
    if (flagDefaultD.missing.length > 0) {
        issues.push({
            category: 'flags', severity: 'error',
            message: `Flags in contract but missing from FALLBACK_CONFIG.featureFlags: ${flagDefaultD.missing.join(', ')}`,
            expected: contractFlags.length, actual: defaultFlagKeys.length,
        })
    }
    if (flagDefaultD.extra.length > 0) {
        issues.push({
            category: 'flags', severity: 'error',
            message: `Flags in FALLBACK_CONFIG.featureFlags but missing from contract: ${flagDefaultD.extra.join(', ')}`,
            expected: contractFlags.length, actual: defaultFlagKeys.length,
        })
    }

    // ── Limits ──
    const contractLimits = contract.limits.keys
    const schemaLimitKeys = Object.keys(PlanLimitsSchema.shape)
    const defaultLimitKeys = Object.keys(FALLBACK_CONFIG.planLimits)

    const limitSchemaD = setDiff(contractLimits, schemaLimitKeys)
    if (limitSchemaD.missing.length > 0) {
        issues.push({
            category: 'limits', severity: 'error',
            message: `Limits in contract but missing from PlanLimitsSchema: ${limitSchemaD.missing.join(', ')}`,
            expected: contractLimits.length, actual: schemaLimitKeys.length,
        })
    }
    if (limitSchemaD.extra.length > 0) {
        issues.push({
            category: 'limits', severity: 'error',
            message: `Limits in PlanLimitsSchema but missing from contract: ${limitSchemaD.extra.join(', ')}`,
            expected: contractLimits.length, actual: schemaLimitKeys.length,
        })
    }

    const limitDefaultD = setDiff(contractLimits, defaultLimitKeys)
    if (limitDefaultD.missing.length > 0) {
        issues.push({
            category: 'limits', severity: 'error',
            message: `Limits in contract but missing from FALLBACK_CONFIG.planLimits: ${limitDefaultD.missing.join(', ')}`,
            expected: contractLimits.length, actual: defaultLimitKeys.length,
        })
    }

    // ── Modules → Feature Gate ──
    const contractModules = contract.modules.keys
    const gatedModules = [...new Set(Object.values(FEATURE_GATE_MAP).map(e => e.moduleKey))]
    const moduleGateD = setDiff(contractModules, gatedModules)
    if (moduleGateD.missing.length > 0) {
        issues.push({
            category: 'modules', severity: 'error',
            message: `Modules in contract but missing from FEATURE_GATE_MAP: ${moduleGateD.missing.join(', ')}`,
            expected: contractModules.length, actual: gatedModules.length,
        })
    }

    // ── Pricing ──
    if (!contract.pricing.maintenance_chf_month || contract.pricing.maintenance_chf_month <= 0) {
        issues.push({
            category: 'pricing', severity: 'error',
            message: 'Maintenance price must be positive',
            expected: 40, actual: contract.pricing.maintenance_chf_month,
        })
    }

    for (const mod of contract.modules.catalog) {
        for (const tier of mod.tiers) {
            if (tier.price_chf <= 0) {
                issues.push({
                    category: 'pricing', severity: 'error',
                    message: `Module ${mod.key} tier ${tier.key} has non-positive price: ${tier.price_chf}`,
                    expected: 1, actual: tier.price_chf,
                })
            }
        }
    }

    // ── Config schema size ──
    const configKeys = Object.keys(StoreConfigSchema.shape)
    if (configKeys.length < 50) {
        issues.push({
            category: 'config', severity: 'warning',
            message: `StoreConfigSchema has only ${configKeys.length} fields (expected 50+)`,
            expected: 50, actual: configKeys.length,
        })
    }

    return {
        ok: issues.length === 0,
        issues,
        summary: {
            flags: { contract: contractFlags.length, schema: schemaFlagKeys.length, defaults: defaultFlagKeys.length },
            limits: { contract: contractLimits.length, schema: schemaLimitKeys.length, defaults: defaultLimitKeys.length },
            modules: { contract: contractModules.length, featureGate: gatedModules.length },
            pricing: { maintenance_chf: contract.pricing.maintenance_chf_month },
        },
    }
}

/**
 * Assert zero governance drift — throws with structured details.
 * Import this in any deploy script, demo provisioner, or CI check.
 */
export function assertNoGovernanceDrift(): void {
    const report = validateGovernanceDrift()
    if (!report.ok) {
        const details = report.issues.map(i => `  [${i.severity}] ${i.message}`).join('\n')
        throw new Error(
            `Governance drift detected (${report.issues.length} issue${report.issues.length > 1 ? 's' : ''}):\n${details}`
        )
    }
}
