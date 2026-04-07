/**
 * v0.1 Release Gate — Structural Integrity Meta-Test
 *
 * Ensures that key files exist, critical exports are present,
 * and the codebase is structurally sound before professional
 * feature development begins.
 *
 * This test acts as a final "circuit breaker" — if it fails,
 * the template is not ready for production development.
 */

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const SRC = join(__dirname, '..')
const APP = join(SRC, '..', 'app')
const ROOT = join(SRC, '..', '..', '..', '..')

describe('v0.1 Release Gate — Structural Integrity', () => {
    // ── Critical Files Exist ──

    const CRITICAL_FILES = [
        'config.ts',
        'features.ts',
        'limits.ts',
        'panel-policy.ts',
        'panel-access-policy.ts',
        'panel-auth.ts',
        'auth-routing.ts',
        'payment-methods.ts',
        'policy-engine.ts',
        'governance-contract.json',
        'governance/schemas.ts',
        'governance/defaults.ts',
    ]

    for (const file of CRITICAL_FILES) {
        it(`critical file exists: ${file}`, () => {
            expect(existsSync(join(SRC, file)), `Missing: src/lib/${file}`).toBe(true)
        })
    }

    // ── Critical Directories ──

    const CRITICAL_DIRS = [
        'medusa',
        'pos',
        'supabase',
        'security',
        'i18n',
        'governance',
    ]

    for (const dir of CRITICAL_DIRS) {
        it(`critical directory exists: lib/${dir}/`, () => {
            expect(existsSync(join(SRC, dir)), `Missing: src/lib/${dir}/`).toBe(true)
        })
    }

    // ── Route Structure ──

    it('shop route group exists', () => {
        expect(existsSync(join(APP, '[lang]', '(shop)'))).toBe(true)
    })

    it('panel route group exists', () => {
        expect(existsSync(join(APP, '[lang]', '(panel)'))).toBe(true)
    })

    it('auth route group exists', () => {
        expect(existsSync(join(APP, '[lang]', '(auth)'))).toBe(true)
    })

    it('API routes exist', () => {
        expect(existsSync(join(APP, 'api'))).toBe(true)
    })

    // ── Governance Contract Integrity ──

    it('governance-contract.json has expected structure', () => {
        const contract = JSON.parse(
            readFileSync(join(SRC, 'governance-contract.json'), 'utf-8')
        )
        expect(contract.flags).toBeDefined()
        expect(contract.flags.count).toBeGreaterThanOrEqual(50)
        expect(contract.flags.keys).toHaveLength(contract.flags.count)
        expect(contract.limits).toBeDefined()
        expect(contract.limits.count).toBeGreaterThanOrEqual(25)
        expect(contract.limits.keys).toHaveLength(contract.limits.count)
    })

    // ── Panel Policy Completeness ──

    it('ADVANCED_MODULES all have valid featureKey references', () => {
        // Read panel-policy source (require() doesn't work with vitest path aliases)
        const policySource = readFileSync(join(SRC, 'panel-policy.ts'), 'utf-8')
        const featureFlagKeys = [
            'enable_carousel', 'enable_whatsapp_checkout', 'enable_cms_pages',
            'enable_analytics', 'enable_chatbot', 'enable_self_service_returns',
            'enable_crm', 'enable_reviews', 'enable_pos', 'enable_traffic_expansion',
            'enable_product_badges', 'enable_seo', 'enable_social_media',
            'enable_multi_language', 'enable_automations', 'enable_auth_advanced',
            'enable_sales_channels',
        ]

        // Extract featureKey values from ADVANCED_MODULES array
        const featureKeyMatches = policySource.match(/featureKey:\s*['"]([^'"]+)['"]/g) || []
        const referencedKeys = featureKeyMatches.map(m => {
            const match = m.match(/featureKey:\s*['"]([^'"]+)['"]/)
            return match ? match[1] : ''
        }).filter(Boolean)

        expect(referencedKeys.length).toBeGreaterThan(0)
        for (const key of referencedKeys) {
            expect(
                featureFlagKeys,
                `ADVANCED_MODULES references unknown featureKey "${key}"`
            ).toContain(key)
        }
    })

    // ── No TODO/FIXME in LOCKED zone files ──

    const LOCKED_FILES = [
        'config.ts',
        'features.ts',
        'limits.ts',
        'policy-engine.ts',
    ]

    for (const file of LOCKED_FILES) {
        it(`no TODO/FIXME/HACK in locked file: ${file}`, () => {
            const content = readFileSync(join(SRC, file), 'utf-8')
            const todoMatches = content.match(/\b(TODO|FIXME|HACK|XXX)\b/gi) || []
            expect(
                todoMatches.length,
                `Found ${todoMatches.length} TODO/FIXME/HACK in locked file ${file}`
            ).toBe(0)
        })
    }

    // ── i18n dictionaries count ──

    it('has all 5 locale dictionaries', () => {
        const dictDir = join(SRC, 'i18n', 'dictionaries')
        const files = readdirSync(dictDir).filter(f => f.endsWith('.json'))
        expect(files.length).toBeGreaterThanOrEqual(5)
        expect(files).toContain('en.json')
        expect(files).toContain('es.json')
    })

    // ── Scripts exist ──

    it('seed-demo.ts exists', () => {
        expect(existsSync(join(ROOT, 'scripts', 'seed-demo.ts'))).toBe(true)
    })

    it('seed-governance.ts exists', () => {
        expect(existsSync(join(ROOT, 'scripts', 'seed-governance.ts'))).toBe(true)
    })

    it('release-gate.sh exists', () => {
        expect(existsSync(join(ROOT, 'scripts', 'release-gate.sh'))).toBe(true)
    })

    // ── Medusa API Layer ──

    it('medusa directory has at least 5 API files', () => {
        const medusaDir = join(SRC, 'medusa')
        const tsFiles = readdirSync(medusaDir).filter(f => f.endsWith('.ts'))
        expect(tsFiles.length).toBeGreaterThanOrEqual(5)
    })

    // ── POS Layer ──

    it('POS directory has core files', () => {
        const posDir = join(SRC, 'pos')
        expect(existsSync(join(posDir, 'pos-utils.ts'))).toBe(true)
        expect(existsSync(join(posDir, 'pos-config.ts'))).toBe(true)
    })
})
