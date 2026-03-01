/**
 * i18n Dictionary Sync Validator
 *
 * Compares all dictionary JSON files and reports:
 * - Keys present in some locales but not all
 * - Keys with empty values
 *
 * Usage: npx tsx scripts/validate-i18n.ts
 * Exit code 1 if mismatches found (CI gate).
 */

import { readFileSync, readdirSync } from 'fs'
import { resolve, basename } from 'path'

const DICT_DIR = resolve(import.meta.dirname, '../apps/storefront/src/lib/i18n/dictionaries')

function main() {
    const files = readdirSync(DICT_DIR).filter((f) => f.endsWith('.json'))

    if (files.length === 0) {
        console.error('❌ No dictionary files found in', DICT_DIR)
        process.exit(1)
    }

    console.log(`\n🌐 i18n Sync Validator — ${files.length} locales\n`)

    // Load all dictionaries
    const dicts: Record<string, Record<string, string>> = {}
    for (const file of files) {
        const locale = basename(file, '.json')
        try {
            dicts[locale] = JSON.parse(readFileSync(resolve(DICT_DIR, file), 'utf-8'))
        } catch (e) {
            console.error(`❌ Failed to parse ${file}:`, e)
            process.exit(1)
        }
    }

    // Collect all keys across all locales
    const allKeys = new Set<string>()
    for (const dict of Object.values(dicts)) {
        for (const key of Object.keys(dict)) {
            allKeys.add(key)
        }
    }

    const locales = Object.keys(dicts).sort()
    let missingCount = 0
    let emptyCount = 0

    // Check for missing keys
    const missingByLocale: Record<string, string[]> = {}
    for (const locale of locales) {
        const missing = [...allKeys].filter((key) => !(key in dicts[locale]))
        if (missing.length > 0) {
            missingByLocale[locale] = missing
            missingCount += missing.length
        }
    }

    // Check for empty values
    const emptyByLocale: Record<string, string[]> = {}
    for (const locale of locales) {
        const empty = Object.entries(dicts[locale])
            .filter(([, v]) => v === '' || v === null || v === undefined)
            .map(([k]) => k)
        if (empty.length > 0) {
            emptyByLocale[locale] = empty
            emptyCount += empty.length
        }
    }

    // Report
    console.log(`📊 Total keys: ${allKeys.size} across ${locales.length} locales (${locales.join(', ')})`)
    console.log()

    if (missingCount > 0) {
        console.log('🚨 Missing keys:')
        for (const [locale, keys] of Object.entries(missingByLocale)) {
            console.log(`   ${locale}: ${keys.length} missing`)
            for (const key of keys.slice(0, 10)) {
                console.log(`      - ${key}`)
            }
            if (keys.length > 10) {
                console.log(`      ... and ${keys.length - 10} more`)
            }
        }
        console.log()
    }

    if (emptyCount > 0) {
        console.log('⚠️  Empty values:')
        for (const [locale, keys] of Object.entries(emptyByLocale)) {
            console.log(`   ${locale}: ${keys.length} empty`)
            for (const key of keys.slice(0, 5)) {
                console.log(`      - ${key}`)
            }
            if (keys.length > 5) {
                console.log(`      ... and ${keys.length - 5} more`)
            }
        }
        console.log()
    }

    if (missingCount === 0 && emptyCount === 0) {
        console.log('✅ All locales are in sync! No missing or empty keys.\n')
        process.exit(0)
    } else {
        console.log(`❌ Found ${missingCount} missing keys and ${emptyCount} empty values.\n`)
        process.exit(1)
    }
}

main()
