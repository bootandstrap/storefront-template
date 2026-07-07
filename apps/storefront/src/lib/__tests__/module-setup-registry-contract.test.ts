import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const REGISTRY_PATH = join(
    __dirname,
    '../registries/module-setup-registry.ts'
)

describe('module setup registry contract', () => {
    it('keeps pos_kiosk anchored to the real POS panel instead of a non-existent standalone route', () => {
        const source = readFileSync(REGISTRY_PATH, 'utf8')

        expect(source).toContain("moduleKey: 'pos_kiosk'")
        expect(source).toContain("{ label: 'Probar modo kiosco', href: '/panel/pos', icon: 'Monitor' }")
        expect(source).not.toContain("{ label: 'Probar modo kiosco', href: '/pos', icon: 'Monitor' }")
    })
})
