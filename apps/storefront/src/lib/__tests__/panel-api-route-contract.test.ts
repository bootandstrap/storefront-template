import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = join(__dirname, '..', '..')
const PANEL_API_DIR = join(ROOT, 'app', 'api', 'panel')

function collectRouteFiles(dir: string): string[] {
    const entries = readdirSync(dir).sort()
    const files: string[] = []

    for (const entry of entries) {
        const fullPath = join(dir, entry)
        const stats = statSync(fullPath)

        if (stats.isDirectory()) {
            files.push(...collectRouteFiles(fullPath))
            continue
        }

        if (entry === 'route.ts') {
            files.push(fullPath)
        }
    }

    return files
}

function read(filePath: string): string {
    return readFileSync(filePath, 'utf-8')
}

describe('panel API route contract', () => {
    it('normalizes panel auth and guard failures instead of leaking them as 500s', () => {
        const routeFiles = collectRouteFiles(PANEL_API_DIR)

        for (const filePath of routeFiles) {
            const source = read(filePath)
            const relPath = relative(ROOT, filePath)
            const usesPanelAuth = source.includes('withPanelGuard') || source.includes('requirePanelAuth')

            if (!usesPanelAuth) continue

            expect(
                source,
                `${relPath} must normalize guard/auth errors through toPanelErrorResponse()`
            ).toContain('toPanelErrorResponse(')

            expect(source, `${relPath} should not special-case legacy Unauthorized strings`)
                .not.toContain("message.includes('Unauthorized')")

            expect(source, `${relPath} should not leak raw thrown panel errors in 500 responses`)
                .not.toContain("err instanceof Error ? err.message : 'Internal error'")
        }
    })

    it('keeps /api/panel/analytics aligned with the canonical analytics query layer', () => {
        const source = read(join(PANEL_API_DIR, 'analytics', 'route.ts'))

        expect(source).toContain("from '@/lib/analytics/dashboard-queries'")
        expect(source).toContain('getDashboardKPIs')
        expect(source).toContain('getRevenueTimeline')
        expect(source).toContain('getTopProducts')
        expect(source).not.toContain('order_completed')
        expect(source).not.toContain('product_viewed')
        expect(source).not.toContain(".select('metadata')")
    })
})
