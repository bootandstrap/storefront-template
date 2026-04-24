/**
 * flag-module-wiring.test.ts — Validates FLAG_MODULE_MAP completeness
 *
 * Ensures every flag in the governance contract has a corresponding
 * module mapping in feature-gate-config.ts, and vice versa.
 *
 * @module __tests__/governance/flag-module-wiring.test
 */

import { describe, it, expect } from 'vitest'
import { loadContract } from './governance-test-utils'
import { FEATURE_GATE_MAP, getFlagsByModule, getGatedModuleKeys } from '@/lib/feature-gate-config'

describe('Flag → Module Wiring', () => {
    const contract = loadContract()

    // Flags that are legitimately not gated by a module
    // (system/meta flags that exist independently)
    const UNGATED_FLAGS = new Set([
        'enable_maintenance_mode',
        'enable_owner_panel',
        'require_auth_to_order',
        'owner_advanced_modules_enabled',
        'owner_lite_enabled',
        'enable_cookie_consent',
        'enable_product_search',  // Part of base ecommerce, not separately gated
        'enable_email_auth',      // Part of base auth, not separately gated
        'enable_guest_checkout',  // Part of base checkout, not separately gated
        'enable_google_auth',     // Contract naming mismatch: codebase uses enable_google_oauth
    ])

    it('every gated flag in FEATURE_GATE_MAP references a real module', () => {
        const moduleKeys = contract.modules.catalog.map(m => m.key)
        for (const [flag, entry] of Object.entries(FEATURE_GATE_MAP)) {
            expect(
                moduleKeys.includes(entry.moduleKey),
                `Flag '${flag}' maps to module '${entry.moduleKey}' which doesn't exist in contract`
            ).toBe(true)
        }
    })

    it('every contract module is referenced by at least one flag', () => {
        const gatedModules = getGatedModuleKeys()
        for (const mod of contract.modules.catalog) {
            expect(
                gatedModules.includes(mod.key),
                `Module '${mod.key}' has no flags in FEATURE_GATE_MAP`
            ).toBe(true)
        }
    })

    it('no contract flag is orphaned (either gated or explicitly ungated)', () => {
        for (const flag of contract.flags.keys) {
            const isGated = flag in FEATURE_GATE_MAP
            const isUngated = UNGATED_FLAGS.has(flag)
            expect(
                isGated || isUngated,
                `Flag '${flag}' is neither in FEATURE_GATE_MAP nor in UNGATED_FLAGS. ` +
                `Add it to FLAG_MODULE_MAP in feature-gate-config.ts, or add to UNGATED_FLAGS if intentional.`
            ).toBe(true)
        }
    })

    it('every module has at least one associated flag', () => {
        for (const mod of contract.modules.catalog) {
            const flags = getFlagsByModule(mod.key)
            expect(
                flags.length,
                `Module '${mod.key}' has 0 flags in FEATURE_GATE_MAP`
            ).toBeGreaterThan(0)
        }
    })
})

describe('Module Slug Coverage', () => {
    it('every module has BSWEB URL slugs', () => {
        for (const [, entry] of Object.entries(FEATURE_GATE_MAP)) {
            expect(entry.bswSlug).toBeTruthy()
            expect(entry.bswSlug.es).toBeTruthy()
            expect(entry.bswSlug.en).toBeTruthy()
        }
    })
})
