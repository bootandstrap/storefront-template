/**
 * Template Sync Ignore Alignment Test
 *
 * Validates that .templatesyncignore covers ALL files/dirs in the 🟢 CUSTOMIZE zone
 * from GEMINI.md. Prevents template sync from accidentally overwriting tenant
 * customizations when new 🟢 zone paths are added to GEMINI.md but forgotten
 * in .templatesyncignore.
 *
 * Phase 9 of MEGA PLAN v4 — Contract Test Expansion
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Test file is at: apps/storefront/src/lib/__tests__/
// Monorepo root is 5 levels up: __tests__ → lib → src → storefront → apps → root
const MONOREPO_ROOT = join(__dirname, '../../../../..')

describe('Template Sync Ignore Alignment', () => {
    const ignoreFilePath = join(MONOREPO_ROOT, '.templatesyncignore')

    // 🟢 CUSTOMIZE zone from GEMINI.md — these MUST be in .templatesyncignore
    const GREEN_ZONE_PATHS = [
        'apps/storefront/src/app/globals.css',
        'apps/storefront/src/components/home/',
        'apps/storefront/src/components/layout/Header.tsx',
        'apps/storefront/src/components/layout/Footer.tsx',
        'apps/storefront/src/lib/i18n/dictionaries/',
        'apps/storefront/public/',
        'apps/storefront/src/app/[lang]/(shop)/page.tsx',
    ]

    it('.templatesyncignore file exists', () => {
        expect(existsSync(ignoreFilePath), '.templatesyncignore does not exist!').toBe(true)
    })

    it('covers all 🟢 CUSTOMIZE zone paths', () => {
        if (!existsSync(ignoreFilePath)) return

        const content = readFileSync(ignoreFilePath, 'utf-8')
        const lines = content
            .split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#'))

        for (const path of GREEN_ZONE_PATHS) {
            expect(
                lines.some(line => path.includes(line) || line.includes(path)),
                `🟢 zone path "${path}" is NOT covered by .templatesyncignore`
            ).toBe(true)
        }
    })

    it('does not include 🔴 LOCKED zone paths', () => {
        if (!existsSync(ignoreFilePath)) return

        const content = readFileSync(ignoreFilePath, 'utf-8')

        // 🔴 LOCKED paths — these must NEVER be in .templatesyncignore
        const redZonePaths = [
            'apps/storefront/src/lib/medusa/',
            'apps/storefront/src/lib/supabase/',
            'apps/storefront/src/lib/security/',
            'apps/storefront/src/lib/config.ts',
            'apps/storefront/src/lib/features.ts',
            'apps/storefront/src/lib/limits.ts',
            'apps/storefront/src/proxy.ts',
            'apps/storefront/src/app/api/',
        ]

        for (const path of redZonePaths) {
            expect(
                content.includes(path),
                `🔴 LOCKED path "${path}" should NOT be in .templatesyncignore`
            ).toBe(false)
        }
    })

    it('.env files are excluded from sync', () => {
        if (!existsSync(ignoreFilePath)) return

        const content = readFileSync(ignoreFilePath, 'utf-8')
        expect(content).toContain('.env')
    })
})
