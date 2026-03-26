#!/usr/bin/env npx tsx
/**
 * E2E Governance Drift Detection — CLI Script
 *
 * Run: npx tsx scripts/e2e-governance-drift.ts
 *
 * Validates that governance-contract.json (the single source of truth)
 * is perfectly reflected across ALL system consumers. Designed to be
 * run before deploys, in CI, or manually.
 *
 * Exit code:
 *   0 = no drift
 *   1 = drift detected (with details)
 */

/* eslint-disable no-console */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const contract = require('../apps/storefront/src/lib/governance-contract.json')

// ── Colors ──
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'

function ok(msg: string) { console.log(`${GREEN}✅ ${msg}${RESET}`) }
function fail(msg: string) { console.log(`${RED}❌ ${msg}${RESET}`) }
function warn(msg: string) { console.log(`${YELLOW}⚠️  ${msg}${RESET}`) }
function header(msg: string) { console.log(`\n${BOLD}${msg}${RESET}`) }

interface Issue { category: string; message: string; severity: 'error' | 'warning' }
const issues: Issue[] = []

function check(label: string, condition: boolean, detail?: string) {
    if (condition) {
        ok(label)
    } else {
        const severity = 'error' as const
        fail(`${label}${detail ? ` — ${detail}` : ''}`)
        issues.push({ category: label, message: detail || 'Check failed', severity })
    }
}

// ── Load Consumers ──

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { FeatureFlagsSchema, PlanLimitsSchema, StoreConfigSchema } = require('../apps/storefront/src/lib/governance/schemas')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { FALLBACK_CONFIG } = require('../apps/storefront/src/lib/governance/defaults')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { FEATURE_GATE_MAP } = require('../apps/storefront/src/lib/feature-gate-config')

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { FeatureFlagsSchema: SharedFF, PlanLimitsSchema: SharedPL } = require('../packages/shared/src/governance/schemas')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { FALLBACK_CONFIG: SharedFB } = require('../packages/shared/src/governance/defaults')

// ── Run Checks ──

header('🔍 Governance Drift Detection')
console.log(`   Contract: ${contract.flags.count} flags, ${contract.limits.count} limits, ${contract.modules.count} modules\n`)

// FLAGS
header('📌 Flags')
const contractFlags = new Set(contract.flags.keys)
const schemaFlags = new Set(Object.keys(FeatureFlagsSchema.shape))
const defaultFlags = new Set(Object.keys(FALLBACK_CONFIG.featureFlags))
const sharedSchemaFlags = new Set(Object.keys(SharedFF.shape))
const sharedDefaultFlags = new Set(Object.keys(SharedFB.featureFlags))

check(
    `flags: ${contract.flags.count} in contract, ${schemaFlags.size} in schema, ${defaultFlags.size} in defaults`,
    contract.flags.count === schemaFlags.size && contract.flags.count === defaultFlags.size,
    `Expected ${contract.flags.count} everywhere`
)
check(
    `flags: shared package in sync (${sharedSchemaFlags.size} schema, ${sharedDefaultFlags.size} defaults)`,
    sharedSchemaFlags.size === contract.flags.count && sharedDefaultFlags.size === contract.flags.count
)

const missingInSchema = contract.flags.keys.filter((k: string) => !schemaFlags.has(k))
if (missingInSchema.length) fail(`  Missing in schema: ${missingInSchema.join(', ')}`)
const missingInDefaults = contract.flags.keys.filter((k: string) => !defaultFlags.has(k))
if (missingInDefaults.length) fail(`  Missing in defaults: ${missingInDefaults.join(', ')}`)

// LIMITS
header('📊 Limits')
const contractLimits = new Set(contract.limits.keys)
const schemaLimits = new Set(Object.keys(PlanLimitsSchema.shape))
const defaultLimits = new Set(Object.keys(FALLBACK_CONFIG.planLimits))
const sharedSchemaLimits = new Set(Object.keys(SharedPL.shape))

check(
    `limits: ${contract.limits.count} in contract, ${schemaLimits.size} in schema, ${defaultLimits.size} in defaults`,
    contract.limits.count === schemaLimits.size && contract.limits.count === defaultLimits.size,
    `Expected ${contract.limits.count} everywhere`
)
check(
    `limits: shared package in sync (${sharedSchemaLimits.size} schema)`,
    sharedSchemaLimits.size === contract.limits.count
)

// MODULES
header('📦 Modules')
const contractModules = new Set(contract.modules.keys)
const gatedModules = new Set(Object.values(FEATURE_GATE_MAP).map((e: { moduleKey: string }) => e.moduleKey))

check(
    `modules: ${contract.modules.count} in contract, ${gatedModules.size} in feature-gate`,
    gatedModules.size >= contract.modules.count,
    `Feature gate has ${gatedModules.size}, contract has ${contract.modules.count}`
)

const missingInGate = contract.modules.keys.filter((k: string) => !gatedModules.has(k))
if (missingInGate.length) fail(`  Missing in feature-gate: ${missingInGate.join(', ')}`)

// PRICING
header('💰 Pricing')
check(
    `maintenance: ${contract.pricing.maintenance_chf_month} CHF/month`,
    contract.pricing.maintenance_chf_month > 0
)
check(
    `web base: ${contract.pricing.web_base_chf} CHF`,
    contract.pricing.web_base_chf > 0
)

let tierIssues = 0
for (const mod of contract.modules.catalog) {
    for (const tier of mod.tiers) {
        if (tier.price_chf <= 0) {
            fail(`  ${mod.key}.${tier.key}: ${tier.price_chf} CHF (should be >0)`)
            tierIssues++
        }
    }
}
if (tierIssues === 0) ok(`all ${contract.modules.catalog.reduce((sum: number, m: { tiers: unknown[] }) => sum + m.tiers.length, 0)} module tiers have positive prices`)

// CROSS-PACKAGE
header('🔗 Cross-Package Equality')
const flagsEqual = JSON.stringify(FALLBACK_CONFIG.featureFlags) === JSON.stringify(SharedFB.featureFlags)
const limitsEqual = JSON.stringify(FALLBACK_CONFIG.planLimits) === JSON.stringify(SharedFB.planLimits)
check('inline featureFlags = shared featureFlags', flagsEqual)
check('inline planLimits = shared planLimits', limitsEqual)

// CONFIG
header('⚙️  Config Schema')
const configFieldCount = Object.keys(StoreConfigSchema.shape).length
check(
    `StoreConfigSchema: ${configFieldCount} fields (min 50)`,
    configFieldCount >= 50
)

// ── Summary ──
header('📋 Summary')
if (issues.length === 0) {
    ok(`${BOLD}0 drift issues found — system is fully synchronized${RESET}`)
    process.exit(0)
} else {
    fail(`${BOLD}${issues.length} drift issue${issues.length > 1 ? 's' : ''} found${RESET}`)
    process.exit(1)
}
