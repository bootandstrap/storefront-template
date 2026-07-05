import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const testDir = dirname(fileURLToPath(import.meta.url))
const storefrontRoot = resolve(testDir, '..', '..')

describe('public storefront loading boundaries', () => {
    it('does not ship a global app loading boundary that streams skeleton-only HTML', () => {
        expect(existsSync(resolve(storefrontRoot, 'app/loading.tsx'))).toBe(false)
    })

    it('does not ship a root [lang] loading boundary that replaces landing-page HTML with skeletons', () => {
        expect(existsSync(resolve(storefrontRoot, 'app/[lang]/loading.tsx'))).toBe(false)
    })

    it('does not ship a productos route loading boundary that hides the initial product grid', () => {
        expect(existsSync(resolve(storefrontRoot, 'app/[lang]/(shop)/productos/loading.tsx'))).toBe(false)
    })
})
