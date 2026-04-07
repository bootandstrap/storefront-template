#!/usr/bin/env npx tsx
/**
 * i18n Dictionary Sync Check
 *
 * Compares translation keys across all 5 locale dictionaries and reports
 * missing/extra keys. Ensures all locales stay in sync.
 *
 * Usage:
 *   npx tsx scripts/check-i18n-sync.ts
 *   npm run i18n:check
 */

import fs from 'fs'
import path from 'path'

const DICT_DIR = path.resolve(__dirname, '../src/lib/i18n/dictionaries')
const LOCALES = ['en', 'es', 'de', 'fr', 'it']
const REFERENCE_LOCALE = 'en' // All other locales must match this

// ---------------------------------------------------------------------------
// Load dictionaries
// ---------------------------------------------------------------------------

function loadDict(locale: string): Record<string, string> {
    const filePath = path.join(DICT_DIR, `${locale}.json`)
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Dictionary file not found: ${filePath}`)
        process.exit(1)
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

interface SyncIssue {
    locale: string
    type: 'missing' | 'extra'
    key: string
}

function compare(
    refKeys: Set<string>,
    targetKeys: Set<string>,
    locale: string
): SyncIssue[] {
    const issues: SyncIssue[] = []

    for (const key of refKeys) {
        if (!targetKeys.has(key)) {
            issues.push({ locale, type: 'missing', key })
        }
    }

    for (const key of targetKeys) {
        if (!refKeys.has(key)) {
            issues.push({ locale, type: 'extra', key })
        }
    }

    return issues
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
    console.log('🔍 Checking i18n dictionary sync...\n')

    const refDict = loadDict(REFERENCE_LOCALE)
    const refKeys = new Set(Object.keys(refDict))
    let totalIssues = 0

    console.log(`📘 Reference: ${REFERENCE_LOCALE}.json (${refKeys.size} keys)\n`)

    for (const locale of LOCALES) {
        if (locale === REFERENCE_LOCALE) continue

        const dict = loadDict(locale)
        const keys = new Set(Object.keys(dict))
        const issues = compare(refKeys, keys, locale)

        if (issues.length === 0) {
            console.log(`✅ ${locale}.json — ${keys.size} keys, in sync`)
        } else {
            const missing = issues.filter((i) => i.type === 'missing')
            const extra = issues.filter((i) => i.type === 'extra')

            console.log(`⚠️  ${locale}.json — ${keys.size} keys, ${issues.length} issues:`)

            if (missing.length > 0) {
                console.log(`   Missing (${missing.length}):`)
                for (const issue of missing.slice(0, 10)) {
                    console.log(`     - ${issue.key}`)
                }
                if (missing.length > 10) {
                    console.log(`     ... and ${missing.length - 10} more`)
                }
            }

            if (extra.length > 0) {
                console.log(`   Extra (${extra.length}):`)
                for (const issue of extra.slice(0, 10)) {
                    console.log(`     + ${issue.key}`)
                }
                if (extra.length > 10) {
                    console.log(`     ... and ${extra.length - 10} more`)
                }
            }

            totalIssues += issues.length

            if (process.argv.includes('--fix')) {
                let fixedDict = { ...loadDict(locale) }
                // Remove extra
                for (const issue of extra) {
                    delete fixedDict[issue.key]
                }
                // Add missing
                for (const issue of missing) {
                    fixedDict[issue.key] = refDict[issue.key]
                }
                
                // Sort keys alphabetically
                const sortedKeys = Object.keys(fixedDict).sort()
                const finalDict: Record<string, string> = {}
                for (const k of sortedKeys) {
                    finalDict[k] = fixedDict[k]
                }
                
                const filePath = path.join(DICT_DIR, `${locale}.json`)
                fs.writeFileSync(filePath, JSON.stringify(finalDict, null, 2) + '\n')
                console.log(`🔧 Fixed ${locale}.json`)
            }
        }
    }

    console.log('')
    if (totalIssues === 0) {
        console.log('🎉 All dictionaries are in sync!')
        process.exit(0)
    } else {
        console.log(`❌ ${totalIssues} total sync issues found.`)
        process.exit(1)
    }
}

main()
