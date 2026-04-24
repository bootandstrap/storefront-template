#!/usr/bin/env npx tsx
/**
 * audit-governance-ui.ts — Governance Contract × UI Coverage Audit
 *
 * Verifies that every flag, limit, and module defined in the governance
 * contract is consumed somewhere in the storefront codebase.
 *
 * Coverage types:
 *   - FLAGS: referenced in featureFlags checks, GhostPreview, panel-policy
 *   - LIMITS: referenced in checkLimit(), LimitAwareCTA, ResourceBadge, or raw comparisons
 *   - MODULES: linked to at least one flag or limit that is consumed
 *
 * Usage:
 *   npx tsx scripts/audit-governance-ui.ts
 *   npx tsx scripts/audit-governance-ui.ts --strict   # fails on any uncovered item
 *   npx tsx scripts/audit-governance-ui.ts --json      # machine-readable output
 *
 * @module scripts/audit-governance-ui
 */

import { readFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import { resolve } from 'path'

// ── Config ──────────────────────────────────────────────────────────────────

const STOREFRONT_ROOT = resolve(__dirname, '../apps/storefront/src')
const CONTRACT_PATH = resolve(STOREFRONT_ROOT, 'lib/governance-contract.json')
const EXCLUSIONS_PATH = resolve(__dirname, 'governance-audit.exclusions.json')

const SEARCH_EXTENSIONS = ['*.tsx', '*.ts']
const SEARCH_EXCLUDE_DIRS = ['node_modules', '.next', '__tests__', 'emails']

interface ContractData {
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
        catalog: Array<{
            key: string
            name: string
            tiers: Array<{
                key: string
                flag_effects?: Record<string, boolean>
                limit_effects?: Record<string, number>
            }>
        }>
    }
}

interface AuditResult {
    category: 'flag' | 'limit' | 'module'
    key: string
    consumed: boolean
    /** Files referencing this key */
    files: string[]
    /** Whether this key is explicitly excluded */
    excluded: boolean
    exclusionReason?: string
}

interface ExclusionEntry {
    reason: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function grepForKey(key: string, searchPath: string): string[] {
    const includeArgs = SEARCH_EXTENSIONS.map(ext => `--include='${ext}'`).join(' ')
    const excludeArgs = SEARCH_EXCLUDE_DIRS.map(d => `--exclude-dir='${d}'`).join(' ')

    try {
        const cmd = `grep -rl '${key}' ${searchPath} ${includeArgs} ${excludeArgs} 2>/dev/null`
        const output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
        return output.trim().split('\n').filter(Boolean).map(f =>
            f.replace(searchPath + '/', '')
        )
    } catch {
        // grep returns exit code 1 when no matches found
        return []
    }
}

function loadExclusions(): Record<string, ExclusionEntry> {
    if (!existsSync(EXCLUSIONS_PATH)) return {}
    try {
        return JSON.parse(readFileSync(EXCLUSIONS_PATH, 'utf-8'))
    } catch {
        console.warn(`⚠️  Could not parse exclusions file: ${EXCLUSIONS_PATH}`)
        return {}
    }
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2)
    const strict = args.includes('--strict')
    const jsonOutput = args.includes('--json')

    // ── Load contract ──
    if (!existsSync(CONTRACT_PATH)) {
        console.error(`❌ Contract not found: ${CONTRACT_PATH}`)
        console.error('   Run generate-contract.ts in BSWEB first.')
        process.exit(1)
    }

    const contract: ContractData = JSON.parse(readFileSync(CONTRACT_PATH, 'utf-8'))
    const exclusions = loadExclusions()

    const results: AuditResult[] = []

    // ── 1. Audit Flags ──
    if (!jsonOutput) console.log('\n🏴 Auditing FLAGS...')
    for (const flag of contract.flags.keys) {
        const files = grepForKey(flag, STOREFRONT_ROOT)
        const excluded = flag in exclusions
        results.push({
            category: 'flag',
            key: flag,
            consumed: files.length > 0,
            files,
            excluded,
            exclusionReason: excluded ? exclusions[flag].reason : undefined,
        })
    }

    // ── 2. Audit Limits ──
    if (!jsonOutput) console.log('📏 Auditing LIMITS...')
    for (const limit of contract.limits.numeric_keys) {
        const files = grepForKey(limit, STOREFRONT_ROOT)
        const excluded = limit in exclusions
        results.push({
            category: 'limit',
            key: limit,
            consumed: files.length > 0,
            files,
            excluded,
            exclusionReason: excluded ? exclusions[limit].reason : undefined,
        })
    }

    // ── 3. Audit Modules ──
    if (!jsonOutput) console.log('📦 Auditing MODULES...')
    for (const mod of contract.modules.catalog) {
        const files = grepForKey(`'${mod.key}'`, STOREFRONT_ROOT)
        const filesAlt = grepForKey(`"${mod.key}"`, STOREFRONT_ROOT)
        const allFiles = [...new Set([...files, ...filesAlt])]
        const excluded = mod.key in exclusions
        results.push({
            category: 'module',
            key: mod.key,
            consumed: allFiles.length > 0,
            files: allFiles,
            excluded,
            exclusionReason: excluded ? exclusions[mod.key].reason : undefined,
        })
    }

    // ── Report ──
    if (jsonOutput) {
        console.log(JSON.stringify({ results, summary: buildSummary(results) }, null, 2))
        return
    }

    const flagResults = results.filter(r => r.category === 'flag')
    const limitResults = results.filter(r => r.category === 'limit')
    const moduleResults = results.filter(r => r.category === 'module')

    console.log('\n' + '═'.repeat(70))
    console.log('  GOVERNANCE UI COVERAGE REPORT')
    console.log('═'.repeat(70))

    printSection('FLAGS', flagResults)
    printSection('LIMITS', limitResults)
    printSection('MODULES', moduleResults)

    const summary = buildSummary(results)
    console.log('\n' + '─'.repeat(70))
    console.log(`  📊 SUMMARY`)
    console.log(`  Flags:   ${summary.flags.consumed}/${summary.flags.total} consumed (${summary.flags.coverage}%)`)
    console.log(`  Limits:  ${summary.limits.consumed}/${summary.limits.total} consumed (${summary.limits.coverage}%)`)
    console.log(`  Modules: ${summary.modules.consumed}/${summary.modules.total} consumed (${summary.modules.coverage}%)`)
    console.log(`  TOTAL:   ${summary.total.consumed}/${summary.total.total} (${summary.total.coverage}%)`)
    console.log(`  Excluded: ${summary.excluded}`)
    console.log('─'.repeat(70))

    if (summary.uncovered.length > 0) {
        console.log('\n  ⚠️  UNCOVERED (not consumed and not excluded):')
        for (const item of summary.uncovered) {
            console.log(`    • [${item.category}] ${item.key}`)
        }
    }

    if (strict && summary.uncovered.length > 0) {
        console.log(`\n❌ STRICT MODE: ${summary.uncovered.length} uncovered items. Failing.`)
        process.exit(1)
    } else if (summary.uncovered.length === 0) {
        console.log('\n✅ 100% coverage achieved!')
    }
}

function printSection(title: string, items: AuditResult[]) {
    const consumed = items.filter(r => r.consumed)
    const excluded = items.filter(r => r.excluded && !r.consumed)
    const uncovered = items.filter(r => !r.consumed && !r.excluded)

    console.log(`\n  ${title} (${consumed.length}/${items.length} consumed)`)
    if (uncovered.length > 0) {
        console.log(`    ❌ Uncovered:`)
        for (const r of uncovered) {
            console.log(`       ${r.key}`)
        }
    }
    if (excluded.length > 0) {
        console.log(`    📝 Excluded:`)
        for (const r of excluded) {
            console.log(`       ${r.key} — ${r.exclusionReason}`)
        }
    }
}

function buildSummary(results: AuditResult[]) {
    const byCategory = (cat: 'flag' | 'limit' | 'module') => {
        const items = results.filter(r => r.category === cat)
        const consumed = items.filter(r => r.consumed).length
        return {
            total: items.length,
            consumed,
            coverage: items.length > 0 ? Math.round((consumed / items.length) * 100) : 100,
        }
    }

    const allConsumed = results.filter(r => r.consumed).length
    const allExcluded = results.filter(r => r.excluded && !r.consumed).length
    const uncovered = results.filter(r => !r.consumed && !r.excluded)

    return {
        flags: byCategory('flag'),
        limits: byCategory('limit'),
        modules: byCategory('module'),
        total: {
            total: results.length,
            consumed: allConsumed,
            coverage: results.length > 0 ? Math.round((allConsumed / results.length) * 100) : 100,
        },
        excluded: allExcluded,
        uncovered,
    }
}

main()
