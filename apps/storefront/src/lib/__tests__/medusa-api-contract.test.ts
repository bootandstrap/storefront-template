/**
 * Medusa v2 API Contract Tests
 *
 * Validates that ALL Medusa API calls use v2-compatible endpoints.
 * Catches v1 remnants and deprecated patterns before they reach production.
 *
 * Updated 2026-04-04: Added expand=, flat_rate, payment_collections checks.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const MEDUSA_DIR = join(__dirname, '..', 'medusa')

function collectTsFiles(dir: string): string[] {
    const files: string[] = []
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) {
            files.push(...collectTsFiles(full))
        } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
            files.push(full)
        }
    }
    return files
}

const medusaFiles = collectTsFiles(MEDUSA_DIR)

describe('Medusa v2 API Contract', () => {
    it('has at least 5 medusa API files', () => {
        expect(medusaFiles.length).toBeGreaterThanOrEqual(5)
    })

    // ── Deprecated v1 endpoint patterns ──

    const V1_PATTERNS = [
        { pattern: /\/admin\/store[^s]/g, label: '/admin/store (singular) — v2 uses /admin/stores' },
        { pattern: /\/admin\/draft-orders\/[^/]+\/pay/g, label: '/admin/draft-orders/.../pay — removed in v2' },
        { pattern: /\/admin\/notes/g, label: '/admin/notes — removed in v2' },
        { pattern: /\/admin\/gift-cards/g, label: '/admin/gift-cards — removed in v2' },
        { pattern: /\/admin\/discounts/g, label: '/admin/discounts — v2 uses /admin/promotions' },
        { pattern: /\/admin\/batch-jobs/g, label: '/admin/batch-jobs — removed in v2' },
    ]

    for (const file of medusaFiles) {
        const relPath = relative(MEDUSA_DIR, file)
        const content = readFileSync(file, 'utf-8')

        for (const { pattern, label } of V1_PATTERNS) {
            it(`${relPath}: no v1 pattern "${label}"`, () => {
                // Reset regex lastIndex
                pattern.lastIndex = 0
                const match = pattern.exec(content)
                if (match) {
                    // Check if it's in a comment (crude but effective)
                    const lineStart = content.lastIndexOf('\n', match.index) + 1
                    const line = content.slice(lineStart, match.index)
                    if (line.includes('//') || line.includes('*')) {
                        return // in a comment, OK
                    }
                }
                expect(match, `Found deprecated v1 pattern in ${relPath}: ${label}`).toBeNull()
            })
        }
    }

    // ── v1 query parameter patterns (should not appear in code) ──

    describe('no v1 query parameter patterns', () => {
        it('no file uses expand= query parameter (v1-only, v2 uses fields=*relation)', () => {
            for (const file of medusaFiles) {
                const content = readFileSync(file, 'utf-8')
                const lines = content.split('\n')
                const codeLines = lines.filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
                const hasExpand = codeLines.some(l => /[?&]expand=/.test(l))
                expect(
                    hasExpand,
                    `${relative(MEDUSA_DIR, file)} uses expand= param (v1-only)`
                ).toBe(false)
            }
        })

        it('no file uses flat_rate price_type (v2 uses flat)', () => {
            for (const file of medusaFiles) {
                const content = readFileSync(file, 'utf-8')
                const lines = content.split('\n')
                // Only check non-comment, non-type-definition lines for string literals
                const codeLines = lines.filter(l => {
                    const trimmed = l.trim()
                    return !trimmed.startsWith('//') && !trimmed.startsWith('*')
                })
                const hasFlatRate = codeLines.some(l =>
                    /['"]flat_rate['"]/.test(l) || /flat_rate/.test(l)
                )
                // Allow in comments and type definitions that document v1→v2 migration
                if (hasFlatRate) {
                    const relPath = relative(MEDUSA_DIR, file)
                    // Skip if ALL occurrences are in comments
                    const allInComments = lines.every(l => {
                        if (!l.includes('flat_rate')) return true
                        const trimmed = l.trim()
                        return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/**')
                    })
                    expect(
                        allInComments,
                        `${relPath} uses flat_rate in executable code (v2 uses 'flat')`
                    ).toBe(true)
                }
            }
        })
    })

    // ── v2 required patterns ──

    it('admin-shipping uses plural /admin/stores endpoint', () => {
        const shipping = medusaFiles.find(f => f.includes('admin-shipping'))
        if (!shipping) return
        const content = readFileSync(shipping, 'utf-8')
        expect(content).toContain('/admin/stores')
    })

    it('admin-draft-orders uses /admin/orders for completion (v2)', () => {
        const draftOrders = medusaFiles.find(f => f.includes('admin-draft-orders'))
        if (!draftOrders) return
        const content = readFileSync(draftOrders, 'utf-8')
        // v2: uses /admin/orders/{id}/complete instead of /admin/draft-orders/{id}/pay
        expect(content).toContain('/admin/orders/')
    })

    // ── v2 positive validation: payment_collections ──

    it('client.ts uses *payment_collections for order queries', () => {
        const client = medusaFiles.find(f => f.endsWith('client.ts'))
        if (!client) return
        const content = readFileSync(client, 'utf-8')
        expect(content).toContain('*payment_collections')
    })

    it('admin-analytics.ts does not use expand= param', () => {
        const analytics = medusaFiles.find(f => f.includes('admin-analytics'))
        if (!analytics) return
        const content = readFileSync(analytics, 'utf-8')
        // expand= should not appear in actual code (only comments allowed)
        const lines = content.split('\n')
        const codeLines = lines.filter(l => {
            const trimmed = l.trim()
            return !trimmed.startsWith('//') && !trimmed.startsWith('*')
        })
        const hasExpand = codeLines.some(l => /[?&]expand=/.test(l))
        expect(hasExpand).toBe(false)
    })

    it('admin-shipping.ts uses service_zone_id (v2) not region_id', () => {
        const shipping = medusaFiles.find(f => f.includes('admin-shipping'))
        if (!shipping) return
        const content = readFileSync(shipping, 'utf-8')
        expect(content).toContain('service_zone_id')
    })

    it('admin-shipping.ts uses price_type flat (v2) not flat_rate', () => {
        const shipping = medusaFiles.find(f => f.includes('admin-shipping'))
        if (!shipping) return
        const content = readFileSync(shipping, 'utf-8')
        expect(content).toContain("'flat'")
        // Should not have flat_rate as a string literal in executable code
        const lines = content.split('\n')
        const executableLines = lines.filter(l => {
            const trimmed = l.trim()
            return !trimmed.startsWith('//') && !trimmed.startsWith('*')
        })
        const hasFlatRateLiteral = executableLines.some(l => /'flat_rate'|"flat_rate"/.test(l))
        expect(hasFlatRateLiteral).toBe(false)
    })

    // ── Store API patterns ──

    it('no file uses fetch("/admin/store") without trailing s', () => {
        for (const file of medusaFiles) {
            const content = readFileSync(file, 'utf-8')
            // Match fetch calls with /admin/store but not /admin/stores
            const matches = content.match(/fetch\([^)]*\/admin\/store[^s"'`]/g)
            expect(
                matches,
                `${relative(MEDUSA_DIR, file)} uses /admin/store (singular) in fetch`
            ).toBeNull()
        }
    })
})
