import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { BNS_360_MODULE_CERTIFICATION_MATRIX } from '../../../e2e/support/bns-360-tenant-profiles'
import contract from '../governance-contract'

const REGISTRY_PATH = join(
    __dirname,
    '../registries/module-setup-registry.ts'
)

function prefixRuntimeRoute(route: string): string {
    if (route === '/') return '/es'
    if (route.startsWith('/panel/')) return `/es${route}`
    return route
}

function extractRegistryQuickActionHrefs(source: string, moduleKey: string): string[] {
    const start = source.indexOf(`${moduleKey}: {`)
    if (start === -1) return []

    const nextModule = source.indexOf('\n    },', start)
    const block = nextModule === -1 ? source.slice(start) : source.slice(start, nextModule)
    return [...block.matchAll(/href: '([^']+)'/g)].map(match => match[1])
}

describe('module setup registry contract', () => {
    it('keeps pos_kiosk anchored to the real POS panel instead of a non-existent standalone route', () => {
        const source = readFileSync(REGISTRY_PATH, 'utf8')

        expect(source).toContain("moduleKey: 'pos_kiosk'")
        expect(source).toContain("{ label: 'Probar modo kiosco', href: '/panel/pos', icon: 'Monitor' }")
        expect(source).not.toContain("{ label: 'Probar modo kiosco', href: '/pos', icon: 'Monitor' }")
    })

    it('keeps BNS 360 module runtime routes aligned with registry quick actions', () => {
        const source = readFileSync(REGISTRY_PATH, 'utf8')

        for (const moduleEntry of contract.modules.catalog) {
            const certification = BNS_360_MODULE_CERTIFICATION_MATRIX.find(
                scenario => scenario.moduleKey === moduleEntry.key
            )
            const quickActionRoutes = extractRegistryQuickActionHrefs(source, moduleEntry.key)
                .map(prefixRuntimeRoute)

            expect(certification, `${moduleEntry.key} needs a BNS 360 certification scenario`).toBeDefined()
            expect(
                certification?.runtimeRoutes,
                `${moduleEntry.key} BNS 360 runtime routes must cover module setup quick actions`
            ).toEqual(expect.arrayContaining(quickActionRoutes))
        }
    })
})
