/**
 * GOVERNANCE SOURCE OF TRUTH — E2E Drift Detection
 *
 * The SINGLE test that validates governance-contract.json (the source
 * of truth) against ALL consumers across the entire system.
 *
 * If anyone adds a flag, module, limit, or price change in ONE place
 * but not another, this test fails IMMEDIATELY with a clear message.
 *
 * Coverage matrix:
 *   contract ↔ schemas (inline)
 *   contract ↔ defaults (inline, auto-derived)
 *   contract ↔ schemas (shared package)
 *   contract ↔ defaults (shared package)
 *   contract ↔ feature-gate-config
 *   contract ↔ panel-policy (advanced modules)
 *   contract ↔ limitable-resources (type union)
 *   inline ↔ shared (cross-package equality)
 *   pricing integrity (all tiers positive)
 *   config schema completeness (50+ fields)
 */

import { describe, it, expect } from 'vitest'

// ── Source of truth ──
import contract from '../governance-contract.json'

// ── Inline consumers (storefront) ──
import { FeatureFlagsSchema, PlanLimitsSchema, StoreConfigSchema } from '../governance/schemas'
import { FALLBACK_CONFIG } from '../governance/defaults'
import { FEATURE_GATE_MAP, PANEL_GATED_FLAGS } from '../feature-gate-config'
import { ROUTE_REDIRECT_MAP } from '../panel-policy'

// ── Shared package consumers ──
import {
    FeatureFlagsSchema as SharedFeatureFlagsSchema,
    PlanLimitsSchema as SharedPlanLimitsSchema,
} from '../../../../../packages/shared/src/governance/schemas'
import {
    FALLBACK_CONFIG as SharedFALLBACK_CONFIG,
} from '../../../../../packages/shared/src/governance/defaults'

// ── Integrity helper ──
import { validateGovernanceDrift } from '../governance-integrity-helpers'

// ── Helpers ──
function sorted(arr: string[]) { return [...arr].sort() }

describe('Governance Source of Truth — E2E Drift Detection', () => {

    // ────────────────────────────────────────────────
    // FLAGS
    // ────────────────────────────────────────────────
    describe('flags: contract ↔ consumers', () => {
        const contractFlags = sorted(contract.flags.keys)

        it('contract.flags.count matches actual keys length', () => {
            expect(contract.flags.count).toBe(contract.flags.keys.length)
        })

        it('contract flags = FeatureFlagsSchema keys (inline)', () => {
            const schemaKeys = sorted(Object.keys(FeatureFlagsSchema.shape))
            expect(schemaKeys).toEqual(contractFlags)
        })

        it('contract flags = FALLBACK_CONFIG.featureFlags keys (inline)', () => {
            const defaultKeys = sorted(Object.keys(FALLBACK_CONFIG.featureFlags))
            expect(defaultKeys).toEqual(contractFlags)
        })

        it('contract flags = SharedFeatureFlagsSchema keys (package)', () => {
            const sharedKeys = sorted(Object.keys(SharedFeatureFlagsSchema.shape))
            expect(sharedKeys).toEqual(contractFlags)
        })

        it('contract flags = SharedFALLBACK_CONFIG.featureFlags keys (package)', () => {
            const sharedDefaultKeys = sorted(Object.keys(SharedFALLBACK_CONFIG.featureFlags))
            expect(sharedDefaultKeys).toEqual(contractFlags)
        })

        it('all flags default to false except enable_maintenance_mode', () => {
            for (const flag of contract.flags.keys) {
                const expected = flag === 'enable_maintenance_mode'
                expect(
                    FALLBACK_CONFIG.featureFlags[flag as keyof typeof FALLBACK_CONFIG.featureFlags],
                    `Flag ${flag} should default to ${expected}`
                ).toBe(expected)
            }
        })

        it('every flag group in contract references valid flags', () => {
            const allFlags = new Set(contract.flags.keys)
            for (const [groupName, group] of Object.entries(contract.flags.groups)) {
                for (const flag of group.flags) {
                    expect(
                        allFlags.has(flag),
                        `Flag group "${groupName}" references unknown flag: ${flag}`
                    ).toBe(true)
                }
            }
        })
    })

    // ────────────────────────────────────────────────
    // LIMITS
    // ────────────────────────────────────────────────
    describe('limits: contract ↔ consumers', () => {
        const contractLimits = sorted(contract.limits.keys)

        it('contract.limits.count matches actual keys length', () => {
            expect(contract.limits.count).toBe(contract.limits.keys.length)
        })

        it('contract limits = PlanLimitsSchema keys (inline)', () => {
            const schemaKeys = sorted(Object.keys(PlanLimitsSchema.shape))
            expect(schemaKeys).toEqual(contractLimits)
        })

        it('contract limits = FALLBACK_CONFIG.planLimits keys (inline)', () => {
            const defaultKeys = sorted(Object.keys(FALLBACK_CONFIG.planLimits))
            expect(defaultKeys).toEqual(contractLimits)
        })

        it('contract limits = SharedPlanLimitsSchema keys (package)', () => {
            const sharedKeys = sorted(Object.keys(SharedPlanLimitsSchema.shape))
            expect(sharedKeys).toEqual(contractLimits)
        })

        it('contract limits = SharedFALLBACK_CONFIG.planLimits keys (package)', () => {
            const sharedDefaultKeys = sorted(Object.keys(SharedFALLBACK_CONFIG.planLimits))
            expect(sharedDefaultKeys).toEqual(contractLimits)
        })

        it('numeric_keys + metadata_keys = all keys', () => {
            const combined = sorted([...contract.limits.numeric_keys, ...contract.limits.metadata_keys])
            expect(combined).toEqual(contractLimits)
        })

        it('all numeric limits default to 0 or minimum floor', () => {
            for (const key of contract.limits.numeric_keys) {
                const val = FALLBACK_CONFIG.planLimits[key as keyof typeof FALLBACK_CONFIG.planLimits]
                expect(typeof val, `Limit ${key} should be a number`).toBe('number')
                expect(
                    (val as number) >= 0,
                    `Limit ${key} should be >= 0, got ${val}`
                ).toBe(true)
            }
        })
    })

    // ────────────────────────────────────────────────
    // MODULES
    // ────────────────────────────────────────────────
    describe('modules: contract ↔ consumers', () => {
        const contractModules = sorted(contract.modules.keys)

        it('contract.modules.count matches actual keys length', () => {
            expect(contract.modules.count).toBe(contract.modules.keys.length)
        })

        it('every contract module has at least one flag in FEATURE_GATE_MAP', () => {
            const gatedModules = new Set(Object.values(FEATURE_GATE_MAP).map(e => e.moduleKey))
            for (const moduleKey of contract.modules.keys) {
                expect(
                    gatedModules.has(moduleKey),
                    `Module "${moduleKey}" has no flags in FEATURE_GATE_MAP`
                ).toBe(true)
            }
        })

        it('every FEATURE_GATE_MAP flag references a valid contract module', () => {
            const validModules = new Set(contract.modules.keys)
            for (const [flag, entry] of Object.entries(FEATURE_GATE_MAP)) {
                expect(
                    validModules.has(entry.moduleKey),
                    `FEATURE_GATE_MAP[${flag}] references unknown module: ${entry.moduleKey}`
                ).toBe(true)
            }
        })

        it('contract catalog entries match contract module keys', () => {
            const catalogKeys = sorted(contract.modules.catalog.map((m: { key: string }) => m.key))
            expect(catalogKeys).toEqual(contractModules)
        })

        it('every catalog entry has at least one tier with a positive price', () => {
            for (const mod of contract.modules.catalog) {
                expect(
                    mod.tiers.length,
                    `Module ${mod.key} has no tiers`
                ).toBeGreaterThan(0)
                for (const tier of mod.tiers) {
                    expect(
                        tier.price_chf > 0,
                        `Module ${mod.key} tier ${tier.key} has non-positive price: ${tier.price_chf} — no modules are included free`
                    ).toBe(true)
                }
            }
        })

        it('every catalog entry has non-empty name, icon, and category', () => {
            for (const mod of contract.modules.catalog) {
                expect(mod.name, `Module ${mod.key} missing name`).toBeTruthy()
                expect(mod.icon, `Module ${mod.key} missing icon`).toBeTruthy()
                expect(mod.category, `Module ${mod.key} missing category`).toBeTruthy()
            }
        })
    })

    // ────────────────────────────────────────────────
    // PRICING
    // ────────────────────────────────────────────────
    describe('pricing integrity', () => {
        it('maintenance price is positive', () => {
            expect(contract.pricing.maintenance_chf_month).toBeGreaterThan(0)
        })

        it('web base price is positive', () => {
            expect(contract.pricing.web_base_chf_onetime).toBeGreaterThan(0)
        })

        it('every module tier has a unique key within its module', () => {
            for (const mod of contract.modules.catalog) {
                const tierKeys = mod.tiers.map((t: { key: string }) => t.key)
                const unique = new Set(tierKeys)
                expect(
                    unique.size,
                    `Module ${mod.key} has duplicate tier keys`
                ).toBe(tierKeys.length)
            }
        })
    })

    // ────────────────────────────────────────────────
    // CROSS-PACKAGE EQUALITY
    // ────────────────────────────────────────────────
    describe('cross-package equality', () => {
        it('inline featureFlags default values = shared package values', () => {
            expect(FALLBACK_CONFIG.featureFlags).toEqual(SharedFALLBACK_CONFIG.featureFlags)
        })

        it('inline planLimits default values = shared package values', () => {
            expect(FALLBACK_CONFIG.planLimits).toEqual(SharedFALLBACK_CONFIG.planLimits)
        })
    })

    // ────────────────────────────────────────────────
    // CONFIG SCHEMA COMPLETENESS
    // ────────────────────────────────────────────────
    describe('config schema completeness', () => {
        it('StoreConfigSchema has 50+ fields', () => {
            const keys = Object.keys(StoreConfigSchema.shape)
            expect(keys.length).toBeGreaterThanOrEqual(50)
        })
    })

    // ────────────────────────────────────────────────
    // PANEL INTEGRATION
    // ────────────────────────────────────────────────
    describe('panel-policy integration', () => {
        it('ROUTE_REDIRECT_MAP module routes reference valid contract modules', () => {
            const contractModuleKeys = new Set(contract.modules.keys)
            const moduleRoutes = Object.entries(ROUTE_REDIRECT_MAP)
                .filter(([, v]) => v.section === 'modulos' && v.tab)
            expect(moduleRoutes.length).toBeGreaterThan(0)
            // Module tabs should map to known modules via FEATURE_GATE_MAP or contract
            for (const [key] of moduleRoutes) {
                // The route key itself should be a recognizable module identifier
                expect(
                    contractModuleKeys.has(key) ||
                    contractModuleKeys.has(key.replace('-', '_')) ||
                    key === 'redes-sociales' || // rrss module
                    key === 'mensajes' ||        // email_marketing module
                    key === 'automatizaciones',  // automation module
                    `Module route '${key}' not found in contract modules`
                ).toBe(true)
            }
        })
    })

    // ────────────────────────────────────────────────
    // IMPORTABLE VALIDATOR
    // ────────────────────────────────────────────────
    describe('importable validator', () => {
        it('validateGovernanceDrift() reports zero drift', () => {
            const report = validateGovernanceDrift()
            if (!report.ok) {
                const details = report.issues.map(i => `  [${i.severity}] ${i.message}`).join('\n')
                throw new Error(`Governance drift detected:\n${details}`)
            }
            expect(report.ok).toBe(true)
        })
    })
})
