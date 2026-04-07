/**
 * Currency Drift Test — validates Medusa's CURRENCY_SYMBOLS stays in sync
 * with @bootandstrap/shared SSOT.
 *
 * Run: npx vitest run scripts/currency-drift.test.ts
 *
 * Strategy: Since Medusa has its own build pipeline (npm, not pnpm workspace)
 * and can't import @bootandstrap/shared at build time, we validate at test
 * time by:
 *   1. Reading the shared SSOT from packages/shared
 *   2. Reading the Medusa file directly (it's plain TS, no framework deps)
 *   3. Comparing the two maps for drift
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { CURRENCY_SYMBOL_MAP } from '../packages/shared/src/currencies'

// -- Extract Medusa's CURRENCY_SYMBOLS by reading the file and eval'ing the map
function extractMedusaCurrencySymbols(): Record<string, string> {
    const medusaPath = join(__dirname, '../apps/medusa/src/subscribers/shared/message-templates.ts')
    const content = readFileSync(medusaPath, 'utf-8')
    
    // Extract the CURRENCY_SYMBOLS object literal from the source
    const match = content.match(/const CURRENCY_SYMBOLS:\s*Record<string,\s*string>\s*=\s*\{([^}]+)\}/)
    if (!match) throw new Error('Could not find CURRENCY_SYMBOLS in Medusa message-templates.ts')
    
    const entries: Record<string, string> = {}
    const body = match[1]
    
    // Parse "key: "value"" pairs
    const pairRegex = /(\w+):\s*"([^"]*)"/g
    let pair: RegExpExecArray | null
    while ((pair = pairRegex.exec(body)) !== null) {
        entries[pair[1]] = pair[2]
    }
    
    return entries
}

describe('Currency Symbol Drift Detection', () => {
    const medusaSymbols = extractMedusaCurrencySymbols()

    it('Medusa file should have a CURRENCY_SYMBOLS map', () => {
        expect(Object.keys(medusaSymbols).length).toBeGreaterThan(0)
    })

    it('every Medusa symbol should match the shared SSOT', () => {
        const mismatches: string[] = []
        for (const [code, medusaSymbol] of Object.entries(medusaSymbols)) {
            const sharedSymbol = CURRENCY_SYMBOL_MAP[code]
            if (!sharedSymbol) {
                mismatches.push(`${code}: exists in Medusa but NOT in shared SSOT`)
            } else if (medusaSymbol.trim() !== sharedSymbol.trim()) {
                mismatches.push(`${code}: Medusa="${medusaSymbol}" vs shared="${sharedSymbol}"`)
            }
        }
        expect(mismatches).toEqual([])
    })

    it('shared SSOT should be a superset of Medusa currencies', () => {
        const sharedCodes = Object.keys(CURRENCY_SYMBOL_MAP)
        const medusaCodes = Object.keys(medusaSymbols)
        const missingInShared = medusaCodes.filter(c => !sharedCodes.includes(c))
        expect(missingInShared).toEqual([])
    })

    it('shared SSOT has at least as many currencies as Medusa', () => {
        expect(Object.keys(CURRENCY_SYMBOL_MAP).length).toBeGreaterThanOrEqual(
            Object.keys(medusaSymbols).length
        )
    })

    it('all Medusa currencies exist in shared SSOT', () => {
        for (const code of Object.keys(medusaSymbols)) {
            expect(CURRENCY_SYMBOL_MAP).toHaveProperty(code)
        }
    })
})
