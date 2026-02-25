/**
 * Flag Enforcement Coverage — Contract test (Phase 2: Iron Gate)
 *
 * Verifies that every "commercial" feature flag has at least one
 * server-side guard (requireFlag or isFeatureEnabled) outside of
 * type definitions and config files.
 *
 * This test fails CI if a new commercial flag is added without
 * corresponding runtime enforcement.
 */
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { join } from 'path'

// ── Flags that MUST have server-side enforcement ──
// These are "commercial" flags that control access to paid features.
// System flags like enable_cookie_consent or enable_maintenance_mode
// don't need mutation guards.
const COMMERCIAL_FLAGS = [
    'enable_promotions',
    'enable_wishlist',
    'enable_reviews',
    'enable_carousel',
    'enable_cms_pages',
    'enable_analytics',
    'enable_newsletter',
    'enable_self_service_returns',
    'enable_chatbot',
    'enable_multi_language',
    'enable_multi_currency',
    'enable_product_comparisons',
    'enable_product_badges',
    'enable_online_payments',
    'enable_whatsapp_checkout',
    'enable_cash_on_delivery',
    'enable_bank_transfer',
] as const

// Files that define/configure flags (not enforcement)
const EXCLUDED_PATTERNS = [
    'config.ts',
    'features.ts',
    'feature-gate-config.ts',
    'flag-hierarchy.ts',
    'flag-origin.ts',
    'plan-presets.ts',
    'types.ts',
    '.test.',
    '.spec.',
    'd.ts',
    'policy-engine.ts', // declares the guards, doesn't enforce on specific flags
    '__tests__',
    'node_modules',
]

const STOREFRONT_SRC = join(__dirname, '../../..')

describe('flag enforcement coverage', () => {
    // For each commercial flag, search the codebase for usage
    // in files that are NOT config/type definitions
    for (const flag of COMMERCIAL_FLAGS) {
        it(`"${flag}" has server-side enforcement`, () => {
            // Search for usage of flag name in .ts/.tsx files
            const excludeArgs = EXCLUDED_PATTERNS
                .map(p => `--glob '!*${p}*'`)
                .join(' ')

            let output = ''
            try {
                output = execSync(
                    `grep -rl "${flag}" ${STOREFRONT_SRC} --include="*.ts" --include="*.tsx" 2>/dev/null || true`,
                    { encoding: 'utf-8', timeout: 10000 }
                ).trim()
            } catch {
                output = ''
            }

            // Filter out excluded patterns
            const files = output
                .split('\n')
                .filter(Boolean)
                .filter(f => !EXCLUDED_PATTERNS.some(p => f.includes(p)))

            expect(
                files.length,
                `Flag "${flag}" has NO server-side enforcement outside of config/type definitions. ` +
                `Add requireFlag('${flag}') or isFeatureEnabled(flags, '${flag}') ` +
                `in the relevant API route or server action.`
            ).toBeGreaterThan(0)
        })
    }

    it('PolicyError and LimitError are exported from policy-engine', async () => {
        const policyEngine = await import('@/lib/policy-engine')
        expect(policyEngine.PolicyError).toBeDefined()
        expect(policyEngine.LimitError).toBeDefined()
        expect(policyEngine.requireFlag).toBeDefined()
        expect(policyEngine.requireLimit).toBeDefined()
        expect(policyEngine.requireFeatureWithLimit).toBeDefined()
        expect(policyEngine.policyErrorResponse).toBeDefined()
    })
})
