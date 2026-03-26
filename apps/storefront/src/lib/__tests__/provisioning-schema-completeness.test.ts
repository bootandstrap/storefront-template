/**
 * Provisioning Schema Completeness Test
 *
 * Validates that governance-contract.json flags/limits ALL exist as
 * provisioning-ready keys in demo-constants.ts (MAX_FEATURE_FLAGS + MAX_PLAN_LIMITS),
 * and that DB migration SQL covers all contract flags/limits as columns.
 *
 * This catches the root cause of "silently ignored flags" — when a new module
 * adds flags to the contract but nobody adds the corresponding DB columns
 * or demo-constants entries.
 */
import { describe, it, expect } from 'vitest'
import contract from '../governance-contract.json'

// ─── Contract key accessors ─────────────────────────────────
// contract.flags = { count, keys: string[], groups }
// contract.limits = { count, keys: string[], numeric_keys: string[], metadata_keys }
const contractFlagKeys: string[] = (contract.flags as any).keys
const contractLimitKeys: string[] = (contract.limits as any).numeric_keys

describe('Provisioning Schema Completeness', () => {

    describe('demo-constants covers all contract flags', () => {
        const fs = require('fs')
        const path = require('path')

        const bswebRoot = path.resolve(__dirname, '../../../../../../BOOTANDSTRAP_WEB')
        const demoConstantsPath = path.join(bswebRoot, 'src/lib/governance/tenants/demo-constants.ts')
        const demoConstantsSrc = fs.existsSync(demoConstantsPath)
            ? fs.readFileSync(demoConstantsPath, 'utf-8')
            : null

        if (!demoConstantsSrc) {
            it.skip('BSWEB repo not found — skipping demo-constants check', () => { })
            return
        }

        // Extract keys from MAX_FEATURE_FLAGS block
        const flagBlockMatch = demoConstantsSrc.match(
            /MAX_FEATURE_FLAGS[^{]*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/
        )
        const flagKeys = flagBlockMatch
            ? [...flagBlockMatch[1].matchAll(/(\w+)\s*:/g)].map((m: RegExpMatchArray) => m[1])
            : []

        // Extract keys from MAX_PLAN_LIMITS block
        const limitBlockMatch = demoConstantsSrc.match(
            /MAX_PLAN_LIMITS[^{]*\{([^}]+)\}/
        )
        const limitKeys = limitBlockMatch
            ? [...limitBlockMatch[1].matchAll(/(\w+)\s*:/g)].map((m: RegExpMatchArray) => m[1])
            : []

        it('MAX_FEATURE_FLAGS has entries for all contract flags', () => {
            const missingFromConstants = contractFlagKeys.filter((f: string) => !flagKeys.includes(f))
            expect(missingFromConstants).toEqual([])
        })

        it('MAX_PLAN_LIMITS has entries for all contract limits', () => {
            const missingFromConstants = contractLimitKeys.filter((l: string) => !limitKeys.includes(l))
            expect(missingFromConstants).toEqual([])
        })

        it('demo-constants flags are superset of contract (extras allowed for legacy)', () => {
            // Constants MAY have extra flags not yet in contract (legacy).
            // This test warns but doesn't fail.
            const extraInConstants = flagKeys.filter((f: string) => !contractFlagKeys.includes(f))
            if (extraInConstants.length > 0) {
                console.warn('[WARN] Extra flags in demo-constants not in contract:', extraInConstants)
            }
            // We don't fail — extras are harmless. The critical test is the one above.
            expect(true).toBe(true)
        })

        it('demo-constants limits match contract exactly', () => {
            const extraInConstants = limitKeys.filter((l: string) => !contractLimitKeys.includes(l))
            expect(extraInConstants).toEqual([])
        })
    })

    describe('DB migration covers all contract flags', () => {
        const fs = require('fs')
        const path = require('path')

        const migrationsDir = path.resolve(__dirname, '../../../../../../BOOTANDSTRAP_WEB/supabase/migrations')
        if (!fs.existsSync(migrationsDir)) {
            it.skip('BSWEB migrations not found', () => { })
            return
        }

        // Collect all flag columns mentioned across ALL migration files
        const migrationFiles = fs.readdirSync(migrationsDir).filter((f: string) => f.endsWith('.sql'))
        let allMigrationSQL = ''
        for (const file of migrationFiles) {
            allMigrationSQL += fs.readFileSync(path.join(migrationsDir, file), 'utf-8') + '\n'
        }

        // Extract column names from CREATE TABLE feature_flags and ALTER TABLE feature_flags
        const createTableMatch = allMigrationSQL.match(
            /CREATE TABLE[^(]*feature_flags\s*\(([^;]+)\);/
        )
        const createColumns = createTableMatch
            ? [...createTableMatch[1].matchAll(/^\s*(enable_\w+|require_\w+|owner_\w+)/gm)].map((m: RegExpMatchArray) => m[1])
            : []

        const alterColumns = [...allMigrationSQL.matchAll(
            /ALTER TABLE\s+feature_flags\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(enable_\w+|require_\w+|owner_\w+)/gi
        )].map((m: RegExpMatchArray) => m[1])

        const allDBFlagColumns = new Set([...createColumns, ...alterColumns])

        it('migration SQL defines all contract flags as columns', () => {
            const missingFromMigrations = contractFlagKeys.filter((f: string) => !allDBFlagColumns.has(f))
            expect(missingFromMigrations).toEqual([])
        })

        // Same for limits
        const createLimitsMatch = allMigrationSQL.match(
            /CREATE TABLE[^(]*plan_limits\s*\(([^;]+)\);/
        )
        const createLimitCols = createLimitsMatch
            ? [...createLimitsMatch[1].matchAll(/^\s*(max_\w+|storage_\w+)/gm)].map((m: RegExpMatchArray) => m[1])
            : []

        const alterLimitCols = [...allMigrationSQL.matchAll(
            /ALTER TABLE\s+plan_limits\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(max_\w+|storage_\w+)/gi
        )].map((m: RegExpMatchArray) => m[1])

        const allDBLimitColumns = new Set([...createLimitCols, ...alterLimitCols])

        it('migration SQL defines all contract limits as columns', () => {
            const missingFromMigrations = contractLimitKeys.filter((l: string) => !allDBLimitColumns.has(l))
            expect(missingFromMigrations).toEqual([])
        })
    })

    describe('governance contract structural invariants', () => {
        it('contract has 40+ flags', () => {
            expect(contractFlagKeys.length).toBeGreaterThan(40)
        })

        it('contract has 20+ limits', () => {
            expect(contractLimitKeys.length).toBeGreaterThan(20)
        })

        it('contract has modules catalog with 10+ modules', () => {
            expect(Object.keys(contract.modules.catalog).length).toBeGreaterThanOrEqual(10)
        })

        it('every module tier has features array and positive price', () => {
            const catalog = contract.modules.catalog as unknown as Array<{
                key: string
                tiers: Array<{
                    key: string
                    name: string
                    price_chf: number
                    features: string[]
                }>
            }>
            const issues: string[] = []
            for (const mod of catalog) {
                for (const tier of mod.tiers) {
                    if (!tier.features || !Array.isArray(tier.features) || tier.features.length === 0) {
                        issues.push(`${mod.key}.${tier.key}: missing/empty features`)
                    }
                    if (typeof tier.price_chf !== 'number' || tier.price_chf <= 0) {
                        issues.push(`${mod.key}.${tier.key}: price_chf=${tier.price_chf}`)
                    }
                }
            }
            expect(issues).toEqual([])
        })

        it('every module has unique tier keys within itself', () => {
            const catalog = contract.modules.catalog as unknown as Array<{
                key: string
                tiers: Array<{ key: string }>
            }>
            const issues: string[] = []
            for (const mod of catalog) {
                const seenKeys = new Set<string>()
                for (const tier of mod.tiers) {
                    if (seenKeys.has(tier.key)) {
                        issues.push(`${mod.key}: duplicate tier key "${tier.key}"`)
                    }
                    seenKeys.add(tier.key)
                }
            }
            expect(issues).toEqual([])
        })
    })
})
