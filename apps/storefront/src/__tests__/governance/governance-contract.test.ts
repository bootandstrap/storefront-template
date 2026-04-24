/**
 * governance-contract.test.ts — Core contract integrity tests
 *
 * Validates the governance contract structure, flag counts,
 * limit definitions, module catalog, and cross-references.
 *
 * @module __tests__/governance/governance-contract.test
 */

import { describe, it, expect } from 'vitest'
import { loadContract, getModule, assertModuleDependencies } from './governance-test-utils'

describe('Governance Contract — Structure', () => {
    const contract = loadContract()

    it('has expected number of flags (≥ 57)', () => {
        expect(contract.flags.count).toBeGreaterThanOrEqual(57)
        expect(contract.flags.keys.length).toBe(contract.flags.count)
    })

    it('has expected number of numeric limits (≥ 25)', () => {
        expect(contract.limits.numeric_keys.length).toBeGreaterThanOrEqual(25)
    })

    it('has 13 modules', () => {
        expect(contract.modules.catalog.length).toBe(13)
    })

    it('every flag key starts with enable_', () => {
        for (const key of contract.flags.keys) {
            expect(key).toMatch(/^(enable_|require_|owner_)/)
        }
    })

    it('every numeric limit key follows naming convention', () => {
        for (const key of contract.limits.numeric_keys) {
            expect(key).toMatch(/^(max_|storage_|backup_)/)
        }
    })

    it('no duplicate flag keys', () => {
        const unique = new Set(contract.flags.keys)
        expect(unique.size).toBe(contract.flags.keys.length)
    })

    it('no duplicate limit keys', () => {
        const unique = new Set(contract.limits.numeric_keys)
        expect(unique.size).toBe(contract.limits.numeric_keys.length)
    })

    it('no duplicate module keys', () => {
        const keys = contract.modules.catalog.map(m => m.key)
        const unique = new Set(keys)
        expect(unique.size).toBe(keys.length)
    })
})

describe('Governance Contract — Module Catalog', () => {
    const ALL_MODULE_KEYS = [
        'ecommerce', 'sales_channels', 'chatbot', 'crm', 'seo',
        'rrss', 'i18n', 'automation', 'auth_advanced', 'email_marketing',
        'pos', 'pos_kiosk', 'capacidad',
    ]

    it.each(ALL_MODULE_KEYS)('module "%s" exists in contract', (key) => {
        const mod = getModule(key)
        expect(mod.key).toBe(key)
        expect(mod.name).toBeTruthy()
        expect(mod.tiers.length).toBeGreaterThanOrEqual(1)
    })

    it.each(ALL_MODULE_KEYS)('module "%s" has valid dependencies', (key) => {
        assertModuleDependencies(key)
    })

    it.each(ALL_MODULE_KEYS)('module "%s" has at least 1 tier with a price', (key) => {
        const mod = getModule(key)
        const hasPricedTier = mod.tiers.some(t => t.price_chf > 0)
        expect(hasPricedTier).toBe(true)
    })

    it.each(ALL_MODULE_KEYS)('module "%s" tiers have unique keys', (key) => {
        const mod = getModule(key)
        const tierKeys = mod.tiers.map(t => t.key)
        const unique = new Set(tierKeys)
        expect(unique.size).toBe(tierKeys.length)
    })
})

describe('Governance Contract — Flag Groups', () => {
    const contract = loadContract()

    it('has defined flag groups', () => {
        expect(Object.keys(contract.flags.groups).length).toBeGreaterThan(0)
    })

    it('every grouped flag exists in the flat key list', () => {
        for (const [group, groupData] of Object.entries(contract.flags.groups)) {
            // Groups are objects with { label, color, flags[] }
            const flags = (groupData as { flags?: string[] }).flags ?? []
            for (const flag of flags) {
                expect(
                    contract.flags.keys.includes(flag),
                    `Flag '${flag}' in group '${group}' not found in flat keys`
                ).toBe(true)
            }
        }
    })
})
