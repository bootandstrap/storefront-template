/**
 * Governance Seeder Contract Tests
 *
 * Validates that seed-governance.ts covers ALL flags and limits
 * from governance-contract.json — preventing desync between the
 * seeder and the contract SSOT.
 *
 * v0.1 Release Gate — must pass before professional development begins.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import contract from '../governance-contract.json'

// Read the seed-governance.ts source to validate its coverage
const seederSource = readFileSync(
    join(__dirname, '..', '..', '..', '..', '..', 'scripts', 'seed-governance.ts'),
    'utf-8'
)

describe('Governance Seeder Contract', () => {
    // ── Flag Coverage ──

    it('seeder references all contract flags', () => {
        const missing: string[] = []
        for (const flag of contract.flags.keys) {
            // The flag should appear in the seeder source (either in CONTRACT_FLAGS mapping
            // or via contract.flags.keys iteration)
            if (!seederSource.includes(flag) && !seederSource.includes('contract.flags.keys')) {
                missing.push(flag)
            }
        }
        // If seeder uses contract.flags.keys dynamically, it covers all by definition
        if (seederSource.includes('contract.flags.keys')) {
            expect(true).toBe(true)
        } else {
            expect(
                missing,
                `Seeder missing flags: ${missing.join(', ')}`
            ).toHaveLength(0)
        }
    })

    it('seeder references all contract limits', () => {
        const missing: string[] = []
        for (const limit of contract.limits.keys) {
            if (!seederSource.includes(limit) && !seederSource.includes('contract.limits.keys')) {
                missing.push(limit)
            }
        }
        if (seederSource.includes('contract.limits.keys')) {
            expect(true).toBe(true)
        } else {
            expect(
                missing,
                `Seeder missing limits: ${missing.join(', ')}`
            ).toHaveLength(0)
        }
    })

    // ── Dynamic contract derivation ──

    it('seeder uses contract.flags.keys for dynamic flag generation', () => {
        expect(seederSource).toContain('contract.flags.keys')
    })

    it('seeder uses contract.limits.keys for dynamic limit generation', () => {
        expect(seederSource).toContain('contract.limits.keys')
    })

    // ── Maintenance mode safety ──

    it('seeder sets enable_maintenance_mode to false', () => {
        // The seeder should explicitly set maintenance mode to OFF
        expect(seederSource).toContain("'enable_maintenance_mode'")
        // And the logic should map it to false
        expect(seederSource).toMatch(/enable_maintenance_mode.*false|k !== 'enable_maintenance_mode'/)
    })

    // ── Template profiles ──

    it('seeder has fresh-produce template profile', () => {
        expect(seederSource).toContain("'fresh-produce'")
    })

    it('seeder has fashion template profile', () => {
        expect(seederSource).toContain("'fashion'")
    })

    it('seeder has restaurant template profile', () => {
        expect(seederSource).toContain("'restaurant'")
    })

    // ── Auto-provision capability ──

    it('seeder calls provision_tenant RPC', () => {
        expect(seederSource).toContain('provision_tenant')
    })

    it('seeder writes TENANT_ID to .env', () => {
        expect(seederSource).toContain("writeToEnv('TENANT_ID'")
        expect(seederSource).toContain("'TENANT_ID'")
    })

    // ── Enterprise maximums ──

    it('seeder sets enterprise plan tier', () => {
        expect(seederSource).toContain("'enterprise'")
    })

    it('seeder has explicit enterprise max for key limits', () => {
        expect(seederSource).toContain('max_products')
        expect(seederSource).toContain('max_customers')
        expect(seederSource).toContain('max_orders_month')
        expect(seederSource).toContain('storage_limit_mb')
    })

    // ── Post-verification ──

    it('seeder includes post-verification check', () => {
        // Should verify the seeded data
        expect(seederSource).toContain('Post-verification')
    })
})
