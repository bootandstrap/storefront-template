/**
 * Medusa v2 API Contract Tests
 *
 * Validates that ALL Medusa API calls use v2-compatible endpoints.
 * Catches v1 remnants and deprecated patterns before they reach production.
 *
 * v0.1 Release Gate — must pass before professional development begins.
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
